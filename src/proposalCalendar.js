import { resolveProposalPeriod, validDay } from './proposalPeriod.js';

export const CONTENT_COUNTS = [
  ['reels', 'Videos / reels'],
  ['posts', 'Posts + carruseles'],
  ['photos', 'Fotos'],
  ['ugc', 'UGC'],
  ['promocional', 'Promocionales']
];

const TYPE_KEYS = { Reel: 'reels', Post: 'posts', Carrusel: 'posts', Foto: 'photos', UGC: 'ugc', Promocional: 'promocional' };

function typeOf(item = {}) {
  const text = String(item.type || item.piece || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/ugc/.test(text)) return 'UGC';
  if (/promocional/.test(text)) return 'Promocional';
  if (/reel|video|clip/.test(text)) return 'Reel';
  if (/carrusel|carousel/.test(text)) return 'Carrusel';
  if (/foto|photo|imagen/.test(text)) return 'Foto';
  if (/post|estatic|static/.test(text)) return 'Post';
  return '';
}

export function countProposalPieces(plan = []) {
  const counts = { reels: 0, posts: 0, photos: 0, ugc: 0, promocional: 0 };
  for (const item of plan) {
    const type = typeOf(item);
    if (type) counts[TYPE_KEYS[type]]++;
  }
  return counts;
}

function dayRange(start, end) {
  if (!validDay(start) || !validDay(end) || start > end) throw new Error('Define inicio y fin válidos para el calendario.');
  if ((Date.parse(end) - Date.parse(start)) / 86400000 > 45) throw new Error('El calendario no puede abarcar más de 45 días. Divide el ciclo o ajusta las fechas.');
  const days = [];
  const date = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (date <= last) {
    if (date.getUTCDay() !== 0) days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function scheduledDays(days, count, seed = 0) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    const low = Math.floor(i * days.length / count);
    const high = Math.max(low, Math.floor((i + 1) * days.length / count) - 1);
    const offset = seed ? (seed + i * 7) % (high - low + 1) : Math.floor((high - low) / 2);
    slots.push(days[low + offset]);
  }
  return slots;
}

function desiredCounts(raw = {}) {
  const counts = {};
  for (const [key] of CONTENT_COUNTS) {
    const value = Number(raw[key] ?? 0);
    if (!Number.isInteger(value) || value < 0 || value > 400) throw new Error('Las cantidades deben ser números enteros mayores o iguales a cero.');
    counts[key] = value;
  }
  if (Object.values(counts).reduce((sum, count) => sum + count, 0) > 400) throw new Error('El calendario no puede superar 400 piezas.');
  return counts;
}

function typeQueue(counts) {
  const carousel = counts.posts < 2 ? 0 : Math.max(1, Math.floor(counts.posts / 3));
  const remaining = { Reel: counts.reels, Post: counts.posts - carousel, Carrusel: carousel, Foto: counts.photos, UGC: counts.ugc, Promocional: counts.promocional };
  const queue = [];
  while (Object.values(remaining).some(Boolean)) {
    for (const type of Object.keys(remaining)) {
      if (remaining[type] > 0) { queue.push(type); remaining[type]--; }
    }
  }
  return queue;
}

function label(type, index) {
  return `${type} ${index}`;
}

export function generateProposalCalendar(proposal) {
  const { start, end } = resolveProposalPeriod(proposal);
  const days = dayRange(start, end);
  const counts = desiredCounts(proposal.contentCounts);
  const existing = (proposal.monthPlan || []).filter(item => item?.piece || item?.topic || item?.date);
  const occupied = new Set();
  const found = { reels: 0, posts: 0, photos: 0, ugc: 0, promocional: 0 };
  const numbering = { Reel: 0, Post: 0, Carrusel: 0, Foto: 0, UGC: 0, Promocional: 0 };
  for (const item of existing) {
    const type = typeOf(item);
    if (!type) throw new Error('Hay una pieza sin tipo reconocido. Revísala antes de generar más.');
    if (item.date) {
      if (!validDay(item.date) || item.date < start || item.date > end || occupied.has(item.date)) {
        throw new Error('Hay fechas inválidas, fuera del periodo o repetidas. Revísalas antes de generar.');
      }
      occupied.add(item.date);
    }
    found[TYPE_KEYS[type]]++;
    const match = String(item.piece || '').match(/(\d+)\s*$/);
    numbering[type] = Math.max(numbering[type], Number(match?.[1] || 0));
  }
  for (const [key] of CONTENT_COUNTS) {
    if (found[key] > counts[key]) throw new Error('La propuesta ya tiene más piezas que la cantidad indicada. Ajusta la cantidad o quita piezas manualmente.');
  }
  const missingCounts = Object.fromEntries(CONTENT_COUNTS.map(([key]) => [key, counts[key] - found[key]]));
  const queue = typeQueue(missingCounts);
  const available = days.filter(day => !occupied.has(day));
  if (queue.length > available.length) throw new Error(`Faltan días de publicación: hay ${available.length} libres para ${queue.length} piezas. Amplía el periodo o reduce cantidades.`);
  const slots = scheduledDays(available, queue.length);
  const added = queue.map((type, index) => ({
    date: slots[index], piece: label(type, ++numbering[type]), type, pillar: '', topic: '', objective: '', status: ''
  }));
  return { items: [...existing, ...added].sort((a, b) => a.date.localeCompare(b.date)), added: added.length };
}

export function rearrangeProposalCalendar(proposal, seed = 1) {
  const { start, end } = resolveProposalPeriod(proposal);
  const days = dayRange(start, end);
  const items = [...(proposal.monthPlan || [])];
  if (!items.length) throw new Error('Primero genera o agrega piezas al calendario.');
  if (items.length > days.length) throw new Error('No caben todas las piezas en este periodo sin repetir días.');
  if (items.some(item => !validDay(item.date) || !typeOf(item))) throw new Error('Revisa las fechas y tipos de todas las piezas antes de reacomodar.');
  const indices = items.map((item, index) => ({ ...item, index })).sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  let slots = scheduledDays(days, items.length, seed);
  for (let attempt = 1; attempt < days.length && slots.every((day, i) => day === indices[i].date); attempt++) {
    slots = scheduledDays(days, items.length, seed + attempt);
  }
  return { items: items.map((item, index) => ({ ...item, date: slots[indices.findIndex(entry => entry.index === index)] })), changed: slots.some((day, i) => day !== indices[i].date) };
}

export function buildProductionCalendarExport(proposal) {
  const { start, end } = resolveProposalPeriod(proposal);
  const days = dayRange(start, end);
  const items = (proposal.monthPlan || []).filter(item => item?.piece || item?.topic || item?.date);
  if (!proposal.id || !String(proposal.clientName || '').trim()) throw new Error('Guarda la propuesta con el nombre del cliente antes de exportarla.');
  if (!items.length) throw new Error('Primero agrega piezas al calendario.');
  if (items.length > 400 || items.length > days.length) throw new Error('Hay más piezas que días disponibles en el periodo.');
  const occupied = new Set();
  const normalized = items.map(item => {
    const type = typeOf(item);
    if (!type || !validDay(item.date) || item.date < start || item.date > end || !days.includes(item.date) || occupied.has(item.date)) {
      throw new Error('Corrige las fechas, los tipos y los días repetidos antes de exportar.');
    }
    occupied.add(item.date);
    return {
      date: item.date, type, piece: String(item.piece || type).trim().slice(0, 80),
      title: String(item.topic || item.piece || type).trim().slice(0, 160),
      scriptMode: item.scriptMode === 'visual' ? 'visual' : 'voice',
      scriptText: String(item.scriptText || '').trim().slice(0, 8000)
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
  return {
    schemaVersion: 'euphoria_proposal_calendar_v1',
    source: 'Euphoria Propuestas',
    proposalId: String(proposal.id),
    client: { name: String(proposal.clientName).trim() },
    period: { startDate: start, endDate: end },
    items: normalized
  };
}
