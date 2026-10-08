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

test('catalog completion transaction can update task and enqueue mail and notification', async () => {
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
          completedAt
        }
      },
      completedAt
    });
    transaction.set(doc(db, 'mail', 'task_completed_event-1'), {
      to: ['assigner@example.com'],
      type: 'task_completed_alert',
      delivery: { state: 'PENDING' },
      createdAt: completedAt,
      message: { subject: 'Task completed', html: '<p>Completed</p>' }
    });
    transaction.set(doc(db, 'notifications', 'task_completed_event-1'), {
      userId: 'assigner@example.com',
      title: 'Task completed',
      message: 'A task was completed.',
      taskId: 'soar_12',
      type: 'task_completed',
      read: false,
      created_at: completedAt
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
