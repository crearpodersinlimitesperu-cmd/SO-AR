import { canReverseLiquidacionEntrenadores } from '../config/permissions.js';

export function parsePaymentAmount(input) {
  const value = String(input ?? '').trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    throw new Error('Ingresa un monto positivo con hasta dos decimales (coma o punto).');
  }
  const amount = Number(value.replace(',', '.'));
  if (amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('El monto debe ser positivo y estar dentro del rango permitido.');
  }
  return amount;
}

export function sumPaymentAmounts(payments) {
  return payments.reduce((sum, payment) => sum + Math.round((Number(payment.montoUSD) || 0) * 100), 0) / 100;
}

export async function updatePaidAmountInTransaction(tx, ref, input, user, editedAt) {
  if (!canReverseLiquidacionEntrenadores(user)) {
    throw new Error('No tienes permiso para editar el monto pagado.');
  }
  const montoUSD = parsePaymentAmount(input);
  const snap = await tx.get(ref);
  const before = snap.exists() ? snap.data() : null;
  if (!before || before.estado !== 'pagado') {
    throw new Error('El registro ya no está pagado; no se modificó el monto.');
  }
  tx.update(ref, {
    montoUSD,
    montoEditadoAt: editedAt,
    montoEditadoPorEmail: user.email || '',
    montoEditadoPorNombre: user.name || '',
    montoEditadoPorRole: user.appRole || user.role || ''
  });
  return { before, montoUSD };
}
