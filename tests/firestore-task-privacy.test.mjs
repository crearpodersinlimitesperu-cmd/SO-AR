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

test('an assigned user can read their custom task but not another person’s task', async () => {
  await seedTasks([
    { id: 'custom_mine', assignedToEmail: 'coord@example.com', role: 'gerente', isCustom: true },
    { id: 'custom_other', assignedToEmail: 'other@example.com', role: 'gerente', isCustom: true }
  ]);
  const db = coordinatorDb();

  await assertSucceeds(getDoc(doc(db, 'tasks', 'custom_mine')));
  await assertFails(getDoc(doc(db, 'tasks', 'custom_other')));
});

test('a user can read their role catalog task but not another role or a fabricated catalog ID', async () => {
  await seedTasks([
    { id: 'soar_12', role: 'coord_c1', isCustom: false },
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

test('checklist_tasks uses the same per-user read authorization', async () => {
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
  const db = coordinatorDb();

  await assertSucceeds(getDoc(doc(db, 'checklist_tasks', 'mine')));
  await assertFails(getDoc(doc(db, 'checklist_tasks', 'other')));
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
