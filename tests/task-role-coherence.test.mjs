import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditTaskRoleCoherence,
  auditSingleTask,
  buildUsersDirectoryMap,
  AUDIT_CODES,
  SEVERITY
} from '../src/utils/taskRoleCoherence.js';

const mockUsers = [
  {
    id: 'user_gerente_lima',
    name: 'José Sánchez',
    email: 'jose.sanchez@crearpsl.net',
    emails: ['jose.sanchez@crearpsl.net', 'jose.sanchez@crearpsl.com'],
    role: 'gerente',
    roles: ['gerente', 'superadmin'],
    sede: 'Lima'
  },
  {
    id: 'user_coord_cuenca',
    name: 'Pauly Cedillo',
    email: 'evelyn.cedillo@crearpsl.net',
    role: 'coord_c1',
    roles: ['coord_c1'],
    sede: 'Cuenca'
  },
  {
    id: 'user_coach_global',
    name: 'Alejandro Díaz',
    email: 'emalejodiaz@gmail.com',
    role: 'entrenador',
    roles: ['entrenador', 'entrenador_llamadas'],
    sede: 'Global'
  },
  {
    id: 'user_participante',
    name: 'Juan Perez',
    email: 'juan.perez@example.com',
    role: 'student',
    roles: ['student'],
    sede: 'Lima'
  }
];

test('auditSingleTask accepts coherent task matching user role', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  // Tarea de gerente asignada a un gerente
  const gerenteTask = {
    id: 'ger_test_1',
    title: 'Aprobación de liquidación de sede',
    role: 'gerente',
    status: 'Pendiente',
    completed: false,
    assignedToEmail: 'jose.sanchez@crearpsl.net'
  };

  const findings = auditSingleTask(gerenteTask, { usersDirectory });
  assert.equal(findings.length, 0);
});

test('auditSingleTask detects ROLE_MISMATCH when task role does not match user profile', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  // Tarea de gerente asignada a un estudiante / participante sin rol de gerencia
  const invalidTask = {
    id: 'ger_invalid_1',
    title: 'Firma de contrato de arrendamiento',
    role: 'gerente',
    status: 'Pendiente',
    completed: false,
    assignedToEmail: 'juan.perez@example.com'
  };

  const findings = auditSingleTask(invalidTask, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.ROLE_MISMATCH && f.severity === SEVERITY.HIGH));
  assert.ok(findings[0].message.includes("requiere rol 'gerente'"));
});

test('auditSingleTask detects CONTRADICTORY_STATUS and generates repair payload', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  const contradictoryTask = {
    id: 'task_contra_1',
    title: 'Revisión de pólizas',
    role: 'gerente',
    status: 'Pendiente',
    completed: true,
    assignedToEmail: 'jose.sanchez@crearpsl.net'
  };

  const findings = auditSingleTask(contradictoryTask, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.CONTRADICTORY_STATUS));
  const finding = findings.find(f => f.code === AUDIT_CODES.CONTRADICTORY_STATUS);
  assert.equal(finding.autoFixable, true);
  assert.equal(finding.repair.status, 'Completada');
});

test('auditSingleTask detects MALFORMED_TASK_SCHEMA when missing id or title', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  const malformed = {
    status: 'Pendiente',
    completed: false
  };

  const findings = auditSingleTask(malformed, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.MALFORMED_TASK_SCHEMA));
});

test('auditSingleTask detects ORPHANED_ASSIGNEE when email does not exist', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  const orphanedTask = {
    id: 'task_orphaned_1',
    title: 'Tarea para ex-empleado',
    role: 'coord_c1',
    status: 'Pendiente',
    completed: false,
    assignedToEmail: 'ex.colaborador.eliminado@crearpsl.net'
  };

  const findings = auditSingleTask(orphanedTask, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.ORPHANED_ASSIGNEE));
});

test('auditSingleTask detects EMAIL_DOMAIN_TYPO and suggests correction', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  const typoTask = {
    id: 'task_typo_1',
    title: 'Verificación de equipos',
    role: 'coord_c1',
    status: 'Pendiente',
    completed: false,
    assignedToEmail: 'evelyn.cedillo@crearpls.com' // Typo en dominio
  };

  const findings = auditSingleTask(typoTask, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.EMAIL_DOMAIN_TYPO));
  const typoFinding = findings.find(f => f.code === AUDIT_CODES.EMAIL_DOMAIN_TYPO);
  assert.equal(typoFinding.repair.replaceEmail.to, 'evelyn.cedillo@crearpsl.net');
});

test('auditSingleTask detects UNOWNED_CUSTOM_TASK on personal tasks with no assignee/owner', () => {
  const usersDirectory = buildUsersDirectoryMap(mockUsers);

  const unownedCustom = {
    id: 'custom_123456789',
    title: 'Tarea personalizada flotante',
    isCustom: true,
    status: 'Pendiente',
    completed: false
  };

  const findings = auditSingleTask(unownedCustom, { usersDirectory });
  assert.ok(findings.some(f => f.code === AUDIT_CODES.UNOWNED_CUSTOM_TASK));
});

test('auditTaskRoleCoherence calculates accurate health score and summarizes findings', () => {
  const tasks = [
    { id: 'ok_1', title: 'Tarea OK', role: 'gerente', assignedToEmail: 'jose.sanchez@crearpsl.net', status: 'Completada', completed: true },
    { id: 'ok_2', title: 'Tarea OK 2', role: 'coord_c1', assignedToEmail: 'evelyn.cedillo@crearpsl.net', status: 'Pendiente', completed: false },
    { id: 'bad_1', title: 'Tarea Incoherente', role: 'gerente', assignedToEmail: 'juan.perez@example.com', status: 'Pendiente', completed: false }
  ];

  const report = auditTaskRoleCoherence({
    users: mockUsers,
    tasks,
    catalog: []
  });

  assert.equal(report.totalTasksAudited, 3);
  assert.equal(report.compliantTasksCount, 2);
  assert.equal(report.incoherentTasksCount, 1);
  assert.ok(report.healthScore < 100);
  assert.ok(report.findingsCount > 0);
});
