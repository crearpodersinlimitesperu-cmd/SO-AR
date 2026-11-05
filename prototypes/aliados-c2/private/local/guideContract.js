import { preparationIds } from '../recordModel.js';

export const phaseIds = ['puente', 'sede', 'entrenamiento', 'despues'];

export function validateGuide(value) {
  const text = item => typeof item === 'string' && item.trim().length > 0 && item.length <= 2000;
  if (!value || value.version !== 'c2-v1' || !text(value.title) || !text(value.notice)
    || !Array.isArray(value.phases) || value.phases.length !== phaseIds.length
    || !value.phases.every((phase, index) => phase.id === phaseIds[index]
      && text(phase.title) && text(phase.body))
    || !Array.isArray(value.preparation) || value.preparation.length !== preparationIds.length
    || !value.preparation.every((item, index) => item.id === preparationIds[index] && text(item.label))
    || !Array.isArray(value.references) || value.references.length !== 4
    || !value.references.every((item, index) => item.id === String(index)
      && text(item.title) && text(item.body))) {
    throw new Error('La guía del servidor falta o tiene un formato inválido. No se cargó contenido alternativo.');
  }
  return value;
}
