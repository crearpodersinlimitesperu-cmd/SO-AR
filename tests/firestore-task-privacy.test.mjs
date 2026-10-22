import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-task-privacy',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
    }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', 'coord-1'), {
      uid: 'coord-1',
      email: 'coord@example.com',
      role: 'coord_c1',
      roles: ['coord_c1'],
      sede: 'Lima'
    });
    await setDoc(doc(context.firestore(), 'users', 'coord-2'), {
      uid: 'coord-2',
      email: 'other-coordinator@example.com',
      role: 'coord_c2',
      roles: ['coord_c2'],
      sede: 'Lima'
    });
  });
});

const seedTasks = async tasks => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all(tasks.map(({ id, ...data }) =>
      setDoc(doc(db, 'tasks', id), { id, ...data })
    ));
  });
};

const coordinatorDb = () =>
  testEnv.authenticatedContext('coord-1', { email: 'coord@example.com' }).firestore();
const userDb = (uid, email) =>
  testEnv.authenticatedContext(uid, { email }).firestore();

test('declared location survives create/edit/readback without exposing a task to another identity', async () => {
  const owner = coordinatorDb();
  const ref = doc(owner, 'tasks', 'custom_location');
  await assertSucceeds(setDoc(ref, {
    id: 'custom_location', task: 'Synthetic location task', role: 'coord_c1',
    isCustom: true, createdBy: 'coord@example.com', assignedByEmail: 'coord@example.com',
    assignedToEmails: ['recipient@example.com'], location: 'Sala A', priority: 'Normal'
  }));
  assert.equal((await assertSucceeds(getDoc(ref))).data().location, 'Sala A');
  await assertSucceeds(updateDoc(ref, { location: 'Sala B' }));
  const recipientRef = doc(userDb('recipient', 'recipient@example.com'), 'tasks', 'custom_location');
  assert.equal((await assertSucceeds(getDoc(recipientRef))).data().location, 'Sala B');
  const unrelatedRef = doc(userDb('other', 'other@example.com'), 'tasks', 'custom_location');
  await assertFails(getDoc(unrelatedRef));
  await assertFails(updateDoc(unrelatedRef, { location: 'Changed without authorization' }));
  await assertSucceeds(updateDoc(recipientRef, { location: 'Sala C' }));
  assert.equal((await assertSucceeds(getDoc(ref))).data().location, 'Sala C');
  await assertSucceeds(updateDoc(ref, { location: '' }));
  assert.equal((await assertSucceeds(getDoc(recipientRef))).data().location, '');
});

test('only a personal task’s assigner and assigned recipients can read it', async () => {
  await seedTasks([{
    id: 'custom_multi',
    assignedToEmails: ['recipient-1@example.com', 'recipient-2@example.com'],
    assignedByEmail: 'assigner@example.com',
    createdBy: 'assigner@example.com',
    collaborators: ['collaborator@example.com'],
    role: 'gerente',
    isCustom: true
  }, {
    id: 'custom_legacy',
    role: 'coord_c1'
  }]);

  await assertSucceeds(getDoc(doc(userDb('assigner', 'assigner@example.com'), 'tasks', 'custom_multi')));
  await assertSucceeds(getDoc(doc(userDb('recipient-1', 'recipient-1@example.com'), 'tasks', 'custom_multi')));
  await assertSucceeds(getDoc(doc(userDb('recipient-2', 'recipient-2@example.com'), 'tasks', 'custom_multi')));
  await assertFails(getDoc(doc(userDb('unrelated', 'unrelated@example.com'), 'tasks', 'custom_multi')));
  await assertFails(getDoc(doc(userDb('collaborator', 'collaborator@example.com'), 'tasks', 'custom_multi')));
  await assertFails(getDoc(doc(userDb('manager', 'emely.leon@crearpsl.net'), 'tasks', 'custom_multi')));
  await assertFails(getDoc(doc(userDb('superadmin', 'jose.sanchez@crearpsl.net'), 'tasks', 'custom_multi')));
  await assertFails(getDoc(doc(userDb('superadmin', 'jose.sanchez@crearpsl.net'), 'tasks', 'custom_legacy')));
});

test('assigned-recipient task listener query succeeds', async () => {
  await seedTasks([{
    id: 'custom_multi',
    assignedToEmails: ['recipient-1@example.com', 'recipient-2@example.com'],
    assignedByEmail: 'assigner@example.com',
    createdBy: 'assigner@example.com',
    role: 'gerente',
    isCustom: true
  }]);
  const recipientDb = userDb('recipient-1', 'recipient-1@example.com');
  const recipientTasks = await assertSucceeds(getDocs(query(
    collection(recipientDb, 'tasks'),
    where('assignedToEmails', 'array-contains', 'recipient-1@example.com')
  )));
  assert.deepEqual(recipientTasks.docs.map(task => task.id), ['custom_multi']);
});

test('assigned-recipient listener query supports the organization email alias', async () => {
  await seedTasks([{
    id: 'custom_alias',
    assignedToEmails: ['alias-recipient@crearpsl.net'],
    assignedByEmail: 'assigner@example.com',
    createdBy: 'assigner@example.com',
    role: 'gerente',
    isCustom: true
  }]);
  const aliasDb = userDb('alias', 'alias-recipient@crearpsl.com');
  await assertSucceeds(getDoc(doc(aliasDb, 'tasks', 'custom_alias')));
  const aliasTasks = await assertSucceeds(getDocs(query(
    collection(aliasDb, 'tasks'),
    where('assignedToEmails', 'array-contains', 'alias-recipient@crearpsl.net')
  )));

  assert.deepEqual(aliasTasks.docs.map(task => task.id), ['custom_alias']);
});

test('createdBy task listener query succeeds for the assigner', async () => {
  await seedTasks([{
    id: 'custom_multi',
    assignedToEmails: ['recipient-1@example.com', 'recipient-2@example.com'],
    assignedByEmail: 'assigner@example.com',
    createdBy: 'assigner@example.com',
    role: 'gerente',
    isCustom: true
  }]);
  const assignerDb = userDb('assigner', 'assigner@example.com');
  const assignedTasks = await assertSucceeds(getDocs(query(
    collection(assignerDb, 'tasks'),
    where('createdBy', '==', 'assigner@example.com')
  )));

  assert.deepEqual(assignedTasks.docs.map(task => task.id), ['custom_multi']);
});

test('assignedByEmail task listener query succeeds for the assigner', async () => {
  await seedTasks([{
    id: 'custom_multi',
    assignedToEmails: ['recipient-1@example.com', 'recipient-2@example.com'],
    assignedByEmail: 'assigner@example.com',
    createdBy: 'assigner@example.com',
    role: 'gerente',
    isCustom: true
  }]);
  const assignerDb = userDb('assigner', 'assigner@example.com');
  const assignedByTasks = await assertSucceeds(getDocs(query(
    collection(assignerDb, 'tasks'),
    where('assignedByEmail', '==', 'assigner@example.com')
  )));

  assert.deepEqual(assignedByTasks.docs.map(task => task.id), ['custom_multi']);
});

test('creator/assigner alias queries load all three synthetic tasks, but not through an admin simulation', async () => {
  const email = 'synthetic-finance@crearpsl.net';
  const aliases = [email, 'synthetic-finance@crearpsl.com'];
  await seedTasks([0, 1, 2].map(index => ({
    id: `custom_finance_${index}`,
    createdBy: email,
    ...(index < 2 ? { assignedByEmail: email, assignedByName: 'Synthetic Finance' } : {}),
    assignedToEmails: ['synthetic-recipient@example.com'],
    role: 'gerente',
    isCustom: true
  })));
  const financeDb = userDb('synthetic-finance', email);
  const creatorQuery = db => query(collection(db, 'tasks'), where('createdBy', 'in', aliases));
  const assignerQuery = db => query(collection(db, 'tasks'), where('assignedByEmail', 'in', aliases));
  const created = await assertSucceeds(getDocs(creatorQuery(financeDb)));
  const assigned = await assertSucceeds(getDocs(assignerQuery(financeDb)));
  assert.equal(created.size, 3);
  assert.equal(assigned.size, 2);
  const adminDb = userDb('synthetic-admin', 'jose.sanchez@crearpsl.net');
  await assertFails(getDocs(creatorQuery(adminDb)));
  await assertFails(getDocs(assignerQuery(adminDb)));
  await assertFails(getDocs(creatorQuery(userDb('unrelated', 'unrelated@example.com'))));
});

test('a user can read their role catalog task but not another role or a fabricated catalog ID', async () => {
  await seedTasks([
    { id: 'soar_12', role: 'coord_c1', isCustom: false, assignedRoles: ['coord_c1'], assignedSede: 'Lima' },
    { id: 'soar_1', role: 'gerente', isCustom: false },
    { id: 'cap_chk_58', role: 'coord_c1', isCustom: false }
  ]);
  const db = coordinatorDb();

  await assertSucceeds(getDoc(doc(db, 'tasks', 'soar_12')));
  await assertFails(getDoc(doc(db, 'tasks', 'soar_1')));
  await assertFails(getDoc(doc(db, 'tasks', 'cap_chk_58')));
});

test('the tasks collection cannot be enumerated across users', async () => {
  await seedTasks([
    { id: 'custom_mine', assignedToEmail: 'coord@example.com', isCustom: true },
    { id: 'custom_other', assignedToEmail: 'other@example.com', isCustom: true }
  ]);

  await assertFails(getDocs(collection(coordinatorDb(), 'tasks')));
});

test('role-and-ID scoped catalog queries succeed without exposing other roles', async () => {
  await seedTasks([
    { id: 'soar_12', role: 'coord_c1', isCustom: false },
    { id: 'soar_1', role: 'gerente', isCustom: false }
  ]);
  const db = coordinatorDb();
  const ownRoleQuery = query(
    collection(db, 'tasks'),
    where('role', '==', 'coord_c1'),
    where('id', 'in', ['soar_12'])
  );
  const otherRoleQuery = query(
    collection(db, 'tasks'),
    where('role', '==', 'gerente'),
    where('id', 'in', ['soar_1'])
  );

  const snapshot = await assertSucceeds(getDocs(ownRoleQuery));
  assert.deepEqual(snapshot.docs.map(task => task.id), ['soar_12']);
  await assertFails(getDocs(otherRoleQuery));
});

test('catalog completion transaction records an immutable lifecycle event', async () => {
  await seedTasks([{ id: 'soar_12', role: 'coord_c1', isCustom: false, completed: false, status: 'Pendiente' }]);
  const db = coordinatorDb();
  const completedAt = new Date().toISOString();

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.update(doc(db, 'tasks', 'soar_12'), {
      completed: true,
      status: 'Completada',
      progressPercentage: 100,
      completions: {
        'Lima__cycle-1': {
          completed: true,
          status: 'Completada',
          cycleId: 'cycle-1',
          cycleName: 'Cycle 1',
          completedAt,
          completionId: 'close-event'
        }
      },
      completedAt
    });
    transaction.set(doc(db, 'task_completion_events', 'close-event'), {
      taskId: 'soar_12',
      action: 'completed',
      actorEmail: 'coord@example.com',
      occurredAt: completedAt,
      source: 'manual',
      scope: { sede: 'Lima', cycleId: 'cycle-1' }
    });
  }));
  await assertFails(updateDoc(doc(db, 'task_completion_events', 'close-event'), { action: 'reopened' }));
  await assertFails(setDoc(doc(userDb('other', 'other@example.com'), 'task_completion_events', 'forged'), {
    taskId: 'soar_12',
    action: 'completed',
    actorEmail: 'other@example.com',
    occurredAt: completedAt,
    source: 'manual',
    scope: { sede: 'Lima', cycleId: 'cycle-1' }
  }));
});

test('cycle-scoped manual reopening is auditable without closing another cycle', async () => {
  await seedTasks([{
    id: 'soar_12',
    role: 'coord_c1',
    isCustom: false,
    completed: false,
    status: 'Pendiente',
    completions: {
      'Lima__cycle-1': { completed: true, status: 'Completada', cycleId: 'cycle-1' },
      'Lima__cycle-2': { completed: false, status: 'Pendiente', cycleId: 'cycle-2' }
    }
  }]);
  const db = coordinatorDb();
  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.update(doc(db, 'tasks', 'soar_12'), {
      'completions.Lima__cycle-1': { completed: false, status: 'Pendiente', cycleId: 'cycle-1' }
    });
    transaction.set(doc(db, 'task_completion_events', 'reopen-cycle-1'), {
      taskId: 'soar_12',
      action: 'reopened',
      actorEmail: 'coord@example.com',
      occurredAt: new Date().toISOString(),
      source: 'manual',
      scope: { sede: 'Lima', cycleId: 'cycle-1' }
    });
  }));
  const task = (await assertSucceeds(getDoc(doc(db, 'tasks', 'soar_12')))).data();
  assert.equal(task.completions['Lima__cycle-1'].completed, false);
  assert.equal(task.completions['Lima__cycle-2'].completed, false);
  await assertFails(updateDoc(
    doc(userDb('coord-2', 'other-coordinator@example.com'), 'tasks', 'soar_12'),
    { completed: false, status: 'Pendiente' }
  ));
  const otherCoordinator = userDb('coord-2', 'other-coordinator@example.com');
  await assertFails(runTransaction(otherCoordinator, async transaction => {
    const taskRef = doc(otherCoordinator, 'tasks', 'soar_12');
    transaction.update(taskRef, {
      'completions.Lima__cycle-1': { completed: false, status: 'Pendiente', cycleId: 'cycle-1' }
    });
    transaction.set(doc(otherCoordinator, 'task_completion_events', 'unauthorized-reopen'), {
      taskId: 'soar_12',
      action: 'reopened',
      actorEmail: 'other-coordinator@example.com',
      occurredAt: new Date().toISOString(),
      source: 'manual',
      scope: { sede: 'Lima', cycleId: 'cycle-1' }
    });
  }));
});

test('a personal task owner can explicitly reopen it with an immutable audit event', async () => {
  await seedTasks([{
    id: 'custom_closed',
    isCustom: true,
    assignedToEmail: 'owner@example.com',
    createdBy: 'owner@example.com',
    completed: true,
    status: 'Completada',
    completedAt: 'recorded-close'
  }]);
  const ownerDb = userDb('owner', 'owner@example.com');
  const occurredAt = new Date().toISOString();

  await assertSucceeds(runTransaction(ownerDb, async transaction => {
    transaction.update(doc(ownerDb, 'tasks', 'custom_closed'), {
      completed: false,
      status: 'Pendiente',
      completedAt: null
    });
    transaction.set(doc(ownerDb, 'task_completion_events', 'owner-reopen'), {
      taskId: 'custom_closed',
      action: 'reopened',
      actorEmail: 'owner@example.com',
      occurredAt,
      source: 'manual',
      scope: {}
    });
  }));
  await assertFails(updateDoc(doc(userDb('unrelated', 'unrelated@example.com'), 'tasks', 'custom_closed'), {
    completed: false,
    status: 'Pendiente',
    completedAt: null
  }));
});

test('checklist_tasks keeps role catalog access without exposing other roles', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'checklist_tasks', 'catalog'), {
        id: 'soar_12',
        role: 'coord_c1',
        isCustom: false
      }),
      setDoc(doc(db, 'checklist_tasks', 'catalog_other_role'), {
        id: 'soar_1',
        role: 'gerente',
        isCustom: false
      })
    ]);
  });
  const db = coordinatorDb();

  await assertSucceeds(getDoc(doc(db, 'checklist_tasks', 'catalog')));
  await assertFails(getDoc(doc(db, 'checklist_tasks', 'catalog_other_role')));
});

test('shared sede-scoped checklist access remains separate from personal tasks', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'unrelated-manager'), {
        uid: 'unrelated-manager',
        email: 'unrelated-manager@example.com',
        role: 'manager',
        sede: 'Lima'
      }),
      setDoc(doc(db, 'checklist_tasks', 'shared_dual'), {
        isDualTask: true,
        sede: 'Lima'
      }),
      setDoc(doc(db, 'checklist_tasks', 'private_dual'), {
        isCustom: true,
        isDualTask: true,
        sede: 'Global',
        assignedToEmail: 'recipient@example.com'
      })
    ]);
  });
  const managerDb = userDb('unrelated-manager', 'unrelated-manager@example.com');

  await assertSucceeds(getDoc(doc(managerDb, 'checklist_tasks', 'shared_dual')));
  await assertFails(getDoc(doc(managerDb, 'checklist_tasks', 'private_dual')));
  await assertFails(getDoc(doc(userDb('superadmin', 'jose.sanchez@crearpsl.net'), 'checklist_tasks', 'private_dual')));
});

test('checklist_tasks enforces personal recipient privacy', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'checklist_tasks', 'mine'), {
        assignedToEmail: 'coord@example.com',
        isCustom: true
      }),
      setDoc(doc(db, 'checklist_tasks', 'other'), {
        assignedToEmail: 'other@example.com',
        isCustom: true
      })
    ]);
  });

  await assertSucceeds(getDoc(doc(coordinatorDb(), 'checklist_tasks', 'mine')));
  await assertFails(getDoc(doc(coordinatorDb(), 'checklist_tasks', 'other')));
});

test('C-01: ordinary self-owned task is creatable, critical/mass requires admin profile', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', 'gerente-1'), {
      uid: 'gerente-1', email: 'gerente.nuevo@example.com', role: 'gerente', roles: ['gerente']
    });
  });
  const db = coordinatorDb();
  const base = { assignedToEmail: 'coord@example.com', role: 'coord_c1', isCustom: true };

  await assertSucceeds(setDoc(doc(db, 'tasks', 'custom_ordinary'), { id: 'custom_ordinary', ...base, priority: '🟡 AMARILLO', isCritical: false }));
  await assertFails(setDoc(doc(db, 'tasks', 'custom_critical'), { id: 'custom_critical', ...base, priority: '🔴 ROJO', isCritical: true }));
  await assertFails(setDoc(doc(db, 'tasks', 'custom_mass'), {
    id: 'custom_mass', ...base, assignedToEmails: ['a@example.com', 'b@example.com']
  }));
  // Catalog-shaped critical docs (first-touch by a coordinator) keep working
  await assertSucceeds(setDoc(doc(db, 'tasks', 'soar_12'), {
    id: 'soar_12', role: 'coord_c1', isCustom: false, isCritical: true, priority: '🔴 ROJO', status: 'Pendiente'
  }));

  const gerenteDb = testEnv.authenticatedContext('gerente-1', { email: 'gerente.nuevo@example.com' }).firestore();
  await assertSucceeds(setDoc(doc(gerenteDb, 'tasks', 'custom_mass_ok'), {
    id: 'custom_mass_ok', isCustom: true, priority: '🔴 ROJO', isCritical: true,
    assignedToEmails: ['a@example.com', 'b@example.com']
  }));
});

test('C-01: whitelisted manager without users/{uid} profile can create a critical mass task', async () => {
  const db = testEnv.authenticatedContext('whitelist-1', { email: 'emely.leon@crearpsl.net' }).firestore();
  await assertSucceeds(setDoc(doc(db, 'tasks', 'custom_whitelist_mass'), {
    id: 'custom_whitelist_mass', isCustom: true, priority: '🔴 ROJO', isCritical: true,
    assignedToEmails: ['a@example.com', 'b@example.com']
  }));
});
