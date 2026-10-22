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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
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
const participantRef = (db, taskId, email) => doc(db, 'tasks', taskId, 'participant_states', email);
const participantData = (taskId, email, state, eventId = '') => ({
  taskId, assigneeEmail: email, state, lifecycleMutation: { eventId }
});

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
  const closureContext = {
    comments: 'Comment present at close', evidenceUrl: 'https://example.test/evidence',
    evidences: [{ id: 'ev-one', url: 'https://example.test/evidence' }]
  };
  await seedTasks([{ id: 'soar_12', role: 'coord_c1', isCustom: false, completed: false, status: 'Pendiente', ...closureContext }]);
  const db = coordinatorDb();
  const completedAt = new Date().toISOString();

  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.update(doc(db, 'tasks', 'soar_12'), {
      lifecycleMutation: { eventId: 'close-event', scope: { sede: 'Lima', cycleId: 'cycle-1' } },
      completions: {
        'Lima__cycle-1': {
          completed: true,
          status: 'Completada',
          cycleId: 'cycle-1',
          cycleName: 'Cycle 1',
          completedAt,
          completionId: 'close-event'
        }
      }
    });
    transaction.set(doc(db, 'task_completion_events', 'close-event'), {
      taskId: 'soar_12',
      action: 'completed',
      actorEmail: 'coord@example.com',
      occurredAt: serverTimestamp(),
      source: 'manual',
      scope: { sede: 'Lima', cycleId: 'cycle-1' },
      closureContext
    });
  }));
  await assertFails(updateDoc(doc(db, 'task_completion_events', 'close-event'), { action: 'reopened' }));
  await assertFails(deleteDoc(doc(db, 'task_completion_events', 'close-event')));
  await assertSucceeds(updateDoc(doc(db, 'tasks', 'soar_12'), {
    comments: 'Later edited note', evidenceUrl: '', evidences: []
  }));
  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.update(doc(db, 'tasks', 'soar_12'), {
      'completions.Lima__cycle-1': { completed: false, status: 'Pendiente' },
      lifecycleMutation: { eventId: 'reopen-after-evidence-edit', scope: { sede: 'Lima', cycleId: 'cycle-1' } }
    });
    transaction.set(doc(db, 'task_completion_events', 'reopen-after-evidence-edit'), {
      taskId: 'soar_12', action: 'reopened', actorEmail: 'coord@example.com',
      occurredAt: serverTimestamp(), source: 'manual', scope: { sede: 'Lima', cycleId: 'cycle-1' }
    });
  }));
  assert.deepEqual((await getDoc(doc(db, 'task_completion_events', 'close-event'))).data().closureContext, closureContext,
    'the original close context survives later evidence/comment edits and manual reopening');
  await assertFails(setDoc(doc(userDb('other', 'other@example.com'), 'task_completion_events', 'forged'), {
    taskId: 'soar_12',
    action: 'completed',
    actorEmail: 'other@example.com',
    occurredAt: serverTimestamp(),
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
      'completions.Lima__cycle-1': { completed: false, status: 'Pendiente', cycleId: 'cycle-1' },
      lifecycleMutation: { eventId: 'reopen-cycle-1', scope: { sede: 'Lima', cycleId: 'cycle-1' } }
    });
    transaction.set(doc(db, 'task_completion_events', 'reopen-cycle-1'), {
      taskId: 'soar_12',
      action: 'reopened',
      actorEmail: 'coord@example.com',
      occurredAt: serverTimestamp(),
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
      occurredAt: serverTimestamp(),
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
  await assertFails(updateDoc(doc(ownerDb, 'tasks', 'custom_closed'), {
    completed: false, status: 'Pendiente', completedAt: null
  }));
  await assertFails(updateDoc(doc(ownerDb, 'tasks', 'custom_closed'), {
    completedAt: 'forged-close-time'
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, 'tasks', 'custom_closed'), { notes: 'Additional evidence' }));
  await assertSucceeds(runTransaction(ownerDb, async transaction => {
    transaction.update(doc(ownerDb, 'tasks', 'custom_closed'), {
      completed: false,
      status: 'Pendiente',
      completedAt: null,
      lifecycleMutation: { eventId: 'owner-reopen', scope: {} }
    });
    transaction.set(doc(ownerDb, 'task_completion_events', 'owner-reopen'), {
      taskId: 'custom_closed',
      action: 'reopened',
      actorEmail: 'owner@example.com',
      occurredAt: serverTimestamp(),
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

test('direct catalog/cycle and assignee reopen writes fail without a fresh matching event', async () => {
      await seedTasks([{
        id: 'soar_12', role: 'coord_c1', isCustom: false,
        completed: false,
        completions: {
          'Lima__one': { completed: true, completedAt: 'recorded-one' },
          'Lima__two': { completed: false }
        }
      }, {
        id: 'custom_individual', isCustom: true,
        assignedToEmails: ['owner@example.com', 'other@example.com'],
        createdBy: 'owner@example.com', completed: false,
        assigneeProgress: {
          'owner@example.com': { completed: true, progress: 100, completedAt: 'recorded-owner' },
          'other@example.com': { completed: false, progress: 0 }
        }
      }]);
      const db = coordinatorDb();
      await assertFails(updateDoc(doc(db, 'tasks', 'soar_12'), {
        'completions.Lima__one': { completed: false }
      }));
      await assertFails(updateDoc(doc(db, 'tasks', 'soar_12'), { completions: {} }));
      await assertSucceeds(updateDoc(doc(db, 'tasks', 'soar_12'), {
        'completions.Lima__two': { completed: true },
        lifecycleMutation: { eventId: 'not-a-reopen', scope: { sede: 'Lima', cycleId: 'two' } }
      }));
      const owner = userDb('owner', 'owner@example.com');
      await assertFails(updateDoc(doc(owner, 'tasks', 'custom_individual'), {
        assigneeProgress: { 'owner@example.com': { completed: false }, 'other@example.com': { completed: false } }
      }));
      await assertFails(updateDoc(doc(owner, 'tasks', 'custom_individual'), {
        assigneeProgress: { 'owner@example.com': { completed: false }, 'other@example.com': { completed: false } },
        closedAssigneeKeys: [], lifecycleMutation: { scope: {}, assigneeKeys: [] }
      }));
      await assertFails(runTransaction(owner, async transaction => {
        transaction.set(participantRef(owner, 'custom_individual', 'owner@example.com'),
          participantData('custom_individual', 'owner@example.com', { completed: false, progress: 0 }, 'forged-time'));
        transaction.set(doc(owner, 'task_completion_events', 'forged-time'), {
          taskId: 'custom_individual', action: 'reopened', actorEmail: 'owner@example.com',
          source: 'manual', scope: { assigneeEmail: 'owner@example.com' }, occurredAt: 'arbitrary-string'
        });
      }));
      await assertSucceeds(runTransaction(owner, async transaction => {
        transaction.set(participantRef(owner, 'custom_individual', 'owner@example.com'),
          participantData('custom_individual', 'owner@example.com', { completed: false, progress: 0 }, 'individual-reopen'));
        transaction.set(doc(owner, 'task_completion_events', 'individual-reopen'), {
          taskId: 'custom_individual', action: 'reopened', actorEmail: 'owner@example.com',
          source: 'manual', scope: { assigneeEmail: 'owner@example.com' }, occurredAt: serverTimestamp()
        });
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

test('large assignee lists save notes, open progress and mixed closures atomically while closed entries stay protected', async () => {
  const emails = Array.from({ length: 40 }, (_, i) => `member${i}@example.com`);
  const legacy = Object.fromEntries(emails.map((email, i) => [email, i === 0
    ? { completed: true, progress: 100, completedAt: 'recorded-first' }
    : { progress: 10 }]));
  await seedTasks([{
    id: 'custom_large', isCustom: true, assignedToEmails: emails,
    createdBy: 'member0@example.com', completed: false, assigneeProgress: legacy,
    closedAssigneeKeys: [emails[0]]
  }]);
  const owner = userDb('member0', 'member0@example.com');
  const ref = doc(owner, 'tasks', 'custom_large');
  const save = (progress, event = null, extra = {}) => runTransaction(owner, async transaction => {
    await transaction.get(ref);
    transaction.update(ref, extra);
    for (const [email, state] of Object.entries(progress)) {
      transaction.set(participantRef(owner, ref.id, email), participantData(ref.id, email, state,
        event?.scope.assigneeEmail === email ? 'bulk-close' : ''));
    }
    if (event) transaction.set(doc(owner, 'task_completion_events', 'bulk-close'), event);
  });

  const metadata = Object.fromEntries(emails.map((email, i) => [email, i === 0 ? legacy[email]
    : { ...legacy[email], name: email, role: 'colaborador', sede: 'Lima', completed: false }]));
  await assertSucceeds(save(metadata, null, { notes: 'kept' }));

  const advanced = Object.fromEntries(emails.map((email, i) => [email, i === 0 ? metadata[email]
    : { ...metadata[email], progress: 40 }]));
  await assertSucceeds(save(advanced, null, { notes: 'advanced together' }));

  const mixed = { ...advanced, [emails[1]]: { ...advanced[emails[1]], completed: true, progress: 100, completedAt: 'closed-now' } };
  await assertSucceeds(save(mixed, {
    taskId: ref.id, action: 'completed', actorEmail: emails[0], source: 'manual',
    scope: { assigneeEmail: emails[1] }, occurredAt: serverTimestamp(),
    closureContext: { comments: '', evidenceUrl: '', evidences: [] }
  }, { notes: 'mixed closure' }));

  await assertSucceeds(updateDoc(ref, { closedAssigneeKeys: [], lifecycleMutation: { assigneeKeys: [] } }));
  const stale = Object.fromEntries(emails.map(email => [email, { ...mixed[email], completed: false, progress: 50 }]));
  await assertFails(updateDoc(ref, { assigneeProgress: stale }));
  await assertFails(updateDoc(ref, {
    assigneeProgress: stale, closedAssigneeKeys: [], lifecycleMutation: { assigneeKeys: [] }
  }));
  await assertFails(save(stale, null, { notes: 'must roll back with unauthorized reopen' }));
  const reopenTwo = { ...mixed, [emails[0]]: { ...mixed[emails[0]], completed: false, progress: 0 } };
  await assertFails(updateDoc(ref, { assigneeProgress: reopenTwo }));
  await assertFails(save(reopenTwo, null, { notes: 'no event' }));
  await assertSucceeds(save({ ...mixed, [emails[5]]: { ...mixed[emails[5]], progress: 70 } }, null, { notes: 'legitimate open progress' }));
  const data = (await getDoc(ref)).data();
  assert.equal(data.assigneeProgress[emails[0]].completedAt, 'recorded-first');
  assert.deepEqual(data.assigneeProgress, legacy, 'the legacy baseline is immutable, including open entries');
  assert.equal((await getDoc(participantRef(owner, ref.id, emails[1]))).data().state.progress, 100);
  assert.equal((await getDoc(participantRef(owner, ref.id, emails[5]))).data().state.progress, 70);
});

test('individual completion is accepted only with its closure snapshot', async () => {
  await seedTasks([{
    id: 'custom_two', isCustom: true, assignedToEmails: ['owner@example.com', 'other@example.com'],
    createdBy: 'owner@example.com', completed: false, comments: 'done', evidences: [],
    assigneeProgress: { 'owner@example.com': { progress: 0 }, 'other@example.com': { progress: 0 } }
  }]);
  const owner = userDb('owner', 'owner@example.com');
  const ref = doc(owner, 'tasks', 'custom_two');
  const complete = (id, withContext) => runTransaction(owner, async transaction => {
    transaction.set(participantRef(owner, ref.id, 'owner@example.com'),
      participantData(ref.id, 'owner@example.com', { completed: true, progress: 100 }, id));
    transaction.set(doc(owner, 'task_completion_events', id), {
      taskId: 'custom_two', action: 'completed', actorEmail: 'owner@example.com', occurredAt: serverTimestamp(),
      source: 'manual', scope: { assigneeEmail: 'owner@example.com' },
      ...(withContext ? { closureContext: { comments: 'done', evidenceUrl: '', evidences: [] } } : {})
    });
  });
  await assertFails(complete('no-context', false));
  await assertSucceeds(complete('with-context', true));
});

test('removing or forging the obsolete ledger cannot reopen the immutable legacy baseline or canonical state', async () => {
  const email = 'owner@example.com';
  const original = { completed: true, progress: 100, completedAt: 'first-close' };
  await seedTasks([{
    id: 'custom_ledger_two_steps', isCustom: true, createdBy: email, completed: false,
    assignedToEmails: [email, 'other@example.com'], closedAssigneeKeys: [email],
    assigneeProgress: { [email]: original, 'other@example.com': { completed: false, progress: 0 } }
  }]);
  const db = userDb('owner', email);
  const ref = doc(db, 'tasks', 'custom_ledger_two_steps');
  await assertSucceeds(updateDoc(ref, {
    closedAssigneeKeys: [],
    lifecycleMutation: { scope: {}, assigneeKeys: [email] }
  }));
  assert.deepEqual((await getDoc(ref)).data().closedAssigneeKeys, []);
  await assertFails(updateDoc(ref, {
    assigneeProgress: { [email]: { completed: false, progress: 0 }, 'other@example.com': { completed: false, progress: 0 } },
    lifecycleMutation: { scope: {}, assigneeKeys: [], eventId: 'no-event-created' }
  }));
  await assertFails(setDoc(participantRef(db, ref.id, email),
    participantData(ref.id, email, { completed: false, progress: 0 })));
  assert.deepEqual((await getDoc(ref)).data().assigneeProgress[email], original);
});

test('root and participant reopen events are linked separately without releasing other closed participants', async () => {
  const email = 'owner@example.com';
  const other = 'other@example.com';
  const closed = { completed: true, progress: 100, completedAt: 'original-close' };
  await seedTasks([{
    id: 'custom_root_and_person', isCustom: true, createdBy: email,
    assignedToEmails: [email, other], ...closed, status: 'Completada', progressPercentage: 100,
    assigneeProgress: { [email]: closed, [other]: closed }, closedAssigneeKeys: [email, other]
  }]);
  const owner = userDb('owner', email);
  const ref = doc(owner, 'tasks', 'custom_root_and_person');
  const eventRef = doc(owner, 'task_completion_events', 'root-person-reopened');
  const rootEventRef = doc(owner, 'task_completion_events', 'root-person-reopened_root');
  const reopen = includeRootEvent => runTransaction(owner, async transaction => {
    transaction.update(ref, {
      completed: false, status: 'En Progreso', progress: 50, progressPercentage: 50, completedAt: null,
      lifecycleMutation: {
        eventId: includeRootEvent ? rootEventRef.id : eventRef.id,
        scope: includeRootEvent ? {} : { assigneeEmail: email }, mapScope: { assigneeEmail: email },
        assigneeEventIds: { [email]: eventRef.id }
      }
    });
    transaction.set(participantRef(owner, ref.id, email),
      participantData(ref.id, email, { completed: false, progress: 0, completedAt: null }, eventRef.id));
    transaction.set(eventRef, {
      taskId: ref.id, action: 'reopened', actorEmail: email, occurredAt: serverTimestamp(),
      source: 'manual', scope: { assigneeEmail: email }
    });
    if (includeRootEvent) transaction.set(rootEventRef, {
      taskId: ref.id, action: 'reopened', actorEmail: email, occurredAt: serverTimestamp(),
      source: 'manual', scope: {}
    });
  });
  await assertFails(reopen(false));
  await assertSucceeds(reopen(true));
  assert.equal((await getDoc(ref)).data().assigneeProgress[other].completed, true);
  await assertSucceeds(updateDoc(ref, { closedAssigneeKeys: [] }));
  await assertFails(setDoc(participantRef(owner, ref.id, other), participantData(ref.id, other, { completed: false })));
  const closeRoot = doc(owner, 'task_completion_events', 'root-person-completed_root');
  const closePerson = doc(owner, 'task_completion_events', 'root-person-completed');
  await assertSucceeds(runTransaction(owner, async transaction => {
    transaction.update(ref, {
      completed: true, status: 'Completada', progress: 100, progressPercentage: 100, completedAt: 'new-close',
      lifecycleMutation: { eventId: closeRoot.id, scope: {}, assigneeEventIds: { [email]: closePerson.id } }
    });
    transaction.set(participantRef(owner, ref.id, email),
      participantData(ref.id, email, { completed: true, progress: 100, completedAt: 'new-close' }, closePerson.id));
    for (const [eventRef, scope] of [[closeRoot, {}], [closePerson, { assigneeEmail: email }]]) {
      transaction.set(eventRef, {
        taskId: ref.id, action: 'completed', actorEmail: email, occurredAt: serverTimestamp(),
        source: 'manual', scope, closureContext: { comments: '', evidenceUrl: '', evidences: [] }
      });
    }
  }));
  const rootEvent = (await getDoc(closeRoot)).data();
  const personEvent = (await getDoc(closePerson)).data();
  assert.deepEqual(rootEvent.scope, {});
  assert.deepEqual(personEvent.scope, { assigneeEmail: email });
  assert.equal(rootEvent.occurredAt.isEqual(personEvent.occurredAt), true);
  assert.equal(rootEvent.actorEmail, personEvent.actorEmail);
});

test('legacy migration races reject old-map writes and preserve the original closed state without inventing an event', async () => {
  const email = 'owner@example.com';
  const closed = { completed: true, progress: 100, completedAt: 'legacy-close' };
  await seedTasks([{
    id: 'custom_migration_race', isCustom: true, createdBy: email, completed: false,
    assignedToEmails: [email], assigneeProgress: { [email]: closed }
  }]);
  const db = userDb('owner', email);
  const ref = doc(db, 'tasks', 'custom_migration_race');
  const stateRef = participantRef(db, ref.id, email);
  const [oldWrite, migration] = await Promise.allSettled([
    updateDoc(ref, {
      assigneeProgress: { [email]: { completed: false, progress: 0 } },
      closedAssigneeKeys: [], lifecycleMutation: { scope: {}, assigneeKeys: [] }
    }),
    runTransaction(db, async transaction => {
      const before = await transaction.get(ref);
      transaction.set(stateRef, participantData(ref.id, email, before.data().assigneeProgress[email]));
      transaction.update(ref, { comments: 'Migration and note committed together' });
    })
  ]);
  assert.equal(oldWrite.status, 'rejected');
  assert.equal(oldWrite.reason.code, 'permission-denied');
  assert.equal(migration.status, 'fulfilled');
  assert.deepEqual((await getDoc(stateRef)).data().state, closed);
  assert.deepEqual((await getDoc(ref)).data().assigneeProgress[email], closed);
  await assertFails(updateDoc(stateRef, { state: { completed: false, progress: 0 } }));
  await assertFails(deleteDoc(stateRef));
  assert.equal((await getDoc(ref)).data().comments, 'Migration and note committed together');
});

test('a new canonical closure wins against a concurrent old-client open-map write with no partial notes', async () => {
  const email = 'owner@example.com';
  await seedTasks([{
    id: 'custom_close_race', isCustom: true, createdBy: email, completed: false,
    assignedToEmails: [email], assigneeProgress: { [email]: { progress: 20 } }, comments: 'confirmed'
  }]);
  const db = userDb('owner', email);
  const ref = doc(db, 'tasks', 'custom_close_race');
  const stateRef = participantRef(db, ref.id, email);
  const [stale, closure] = await Promise.allSettled([
    updateDoc(ref, { assigneeProgress: { [email]: { progress: 80 } }, comments: 'stale note' }),
    runTransaction(db, async transaction => {
      await transaction.get(ref);
      await transaction.get(stateRef);
      transaction.set(stateRef, participantData(ref.id, email, { completed: true, progress: 100 }, 'race-close'));
      transaction.set(doc(db, 'task_completion_events', 'race-close'), {
        taskId: ref.id, action: 'completed', actorEmail: email, occurredAt: serverTimestamp(),
        source: 'manual', scope: { assigneeEmail: email },
        closureContext: { comments: 'confirmed', evidenceUrl: '', evidences: [] }
      });
    })
  ]);
  assert.equal(stale.status, 'rejected');
  assert.equal(stale.reason.code, 'permission-denied');
  assert.equal(closure.status, 'fulfilled');
  assert.equal((await getDoc(stateRef)).data().state.completed, true);
  assert.equal((await getDoc(ref)).data().comments, 'confirmed');
});

test('canonical closures retain participant authorization and private-task isolation without inventing identities', async () => {
  await seedTasks([
    { id: 'custom_participants', isCustom: true, createdBy: 'creator@example.com',
      assignedToEmails: ['a@example.com', 'b@example.com'], assigneeProgress: {
        'a@example.com': { progress: 0 }, 'b@example.com': { completed: true, progress: 100 }
      } },
    { id: 'custom_private_participant', isCustom: true, assignedToEmail: 'private@example.com',
      assigneeProgress: { 'private@example.com': { progress: 30 } } }
  ]);
  const a = userDb('a', 'a@example.com');
  await assertSucceeds(setDoc(participantRef(a, 'custom_participants', 'b@example.com'),
    participantData('custom_participants', 'b@example.com', { completed: true, progress: 100 })));
  await assertSucceeds(setDoc(participantRef(a, 'custom_participants', 'a@example.com'),
    participantData('custom_participants', 'a@example.com', { progress: 50 })));
  await assertFails(setDoc(participantRef(a, 'custom_participants', 'b@example.com'),
    participantData('custom_participants', 'b@example.com', { progress: 60 })));
  await assertFails(runTransaction(a, async transaction => {
    transaction.set(participantRef(a, 'custom_participants', 'b@example.com'),
      participantData('custom_participants', 'b@example.com', { completed: false, progress: 0 }, 'unauthorized-b'));
    transaction.set(doc(a, 'task_completion_events', 'unauthorized-b'), {
      taskId: 'custom_participants', action: 'reopened', actorEmail: 'a@example.com',
      source: 'manual', occurredAt: serverTimestamp(), scope: { assigneeEmail: 'b@example.com' }
    });
  }));
  await assertFails(setDoc(participantRef(a, 'custom_participants', 'a@example.com'),
    participantData('custom_participants', 'a@example.com', { completed: true, progress: 100 })));
  for (const action of ['completed', 'reopened']) {
    const eventId = `canonical-a-${action}`;
    await assertSucceeds(runTransaction(a, async transaction => {
      transaction.set(participantRef(a, 'custom_participants', 'a@example.com'),
        participantData('custom_participants', 'a@example.com',
          { completed: action === 'completed', progress: action === 'completed' ? 100 : 0 }, eventId));
      transaction.set(doc(a, 'task_completion_events', eventId), {
        taskId: 'custom_participants', action, actorEmail: 'a@example.com',
        source: 'manual', occurredAt: serverTimestamp(), scope: { assigneeEmail: 'a@example.com' },
        ...(action === 'completed' ? { closureContext: { comments: '', evidenceUrl: '', evidences: [] } } : {})
      });
    }));
  }
  await assertFails(setDoc(participantRef(a, 'custom_participants', 'invented@example.com'),
    participantData('custom_participants', 'invented@example.com', {})));
  await assertFails(getDoc(participantRef(a, 'custom_private_participant', 'private@example.com')));
  await assertFails(setDoc(participantRef(a, 'custom_private_participant', 'private@example.com'),
    participantData('custom_private_participant', 'private@example.com', { progress: 30 })));
});

test('canonical state preserves a legacy alias key while authorizing only the matching authenticated participant', async () => {
  const key = 'Owner@crearpls.com';
  const email = 'owner@crearpsl.net';
  await seedTasks([{
    id: 'custom_legacy_alias', isCustom: true, createdBy: 'creator@example.com',
    assignedToEmail: email, assigneeProgress: { [key]: { completed: true, progress: 100 } }
  }]);
  const db = userDb('owner', email);
  await assertSucceeds(runTransaction(db, async transaction => {
    transaction.set(participantRef(db, 'custom_legacy_alias', key),
      participantData('custom_legacy_alias', key, { completed: false, progress: 0 }, 'alias-reopen'));
    transaction.set(doc(db, 'task_completion_events', 'alias-reopen'), {
      taskId: 'custom_legacy_alias', action: 'reopened', actorEmail: email,
      source: 'manual', occurredAt: serverTimestamp(), scope: { assigneeEmail: key }
    });
  }));
});
