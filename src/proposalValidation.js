export function validatePublication(proposal) {
  if (!proposal.clientName?.trim()) return 'Escribe el nombre del cliente.';
  if (!proposal.clientDisplayName?.trim()) return 'Escribe el nombre que verá el cliente.';
  if (!proposal.periodStart || !proposal.periodEnd) return 'Elige las fechas de inicio y fin de esta propuesta mensual.';
  if (proposal.periodStart > proposal.periodEnd) return 'La fecha final debe ser igual o posterior al inicio.';
  if ((Date.parse(proposal.periodEnd) - Date.parse(proposal.periodStart)) / 86400000 > 45) return 'El periodo mensual puede abarcar hasta 45 días.';
  if (!proposal.strategyTitle?.trim() || !proposal.strategyText?.trim()) return 'Completa la estrategia principal antes de publicar.';
  if (!proposal.deliverables?.some(item => String(item.label || '').trim() && String(item.value || '').trim())) return 'Agrega al menos un entregable con su cantidad.';
  const pieces = proposal.monthPlan?.filter(item => item.date || item.piece || item.topic) || [];
  if (!pieces.length) return 'Agrega las piezas y fechas del calendario mensual.';
  if (pieces.some(item => !item.date || !(String(item.piece || '').trim() || String(item.topic || '').trim()))) return 'Cada pieza del calendario necesita fecha y nombre o tema.';
  if (pieces.some(item => item.date < proposal.periodStart || item.date > proposal.periodEnd)) return 'Hay piezas fuera del periodo elegido; ajusta las fechas.';
  return '';
}
