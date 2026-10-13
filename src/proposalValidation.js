import { resolveProposalPeriod, validDay } from './proposalPeriod.js';

export function validatePublication(proposal) {
  if (!proposal.clientName?.trim()) return 'Escribe el nombre del cliente.';
  const initial = proposal.proposalType === 'initial';
  if (initial && (!proposal.strategyTitle?.trim() || !proposal.strategyText?.trim())) return 'Completa la estrategia principal de la propuesta inicial.';
  if (initial && !proposal.deliverables?.some(item => String(item.label || '').trim() && String(item.value || '').trim())) return 'Agrega al menos un entregable con su cantidad.';
  const pieces = proposal.monthPlan?.filter(item => item.date || item.piece || item.topic) || [];
  if (!pieces.length) return 'Agrega las piezas y fechas del calendario mensual.';
  if (pieces.some(item => !item.date || !(String(item.piece || '').trim() || String(item.topic || '').trim()))) return 'Cada pieza del calendario necesita fecha y nombre o tema.';
  if (pieces.some(item => !validDay(item.date))) return 'Hay una fecha inválida en el calendario.';
  const { start, end } = resolveProposalPeriod(proposal);
  if (!start || !end) return 'El calendario necesita fechas válidas.';
  if (start > end) return 'La fecha final del calendario debe ser igual o posterior al inicio.';
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 45) return 'El calendario abarca más de 45 días; revisa el rango o divide el ciclo.';
  if (pieces.some(item => item.date < start || item.date > end)) return 'Hay piezas fuera del rango del calendario; ajusta las fechas.';
  return '';
}
