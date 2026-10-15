import { resolveProposalPeriod, validDay } from './proposalPeriod.js';
import { arrangeProposalPieces } from './proposalArrangement.js';

export const CONTENT_COUNTS = [
  ['reels', 'Videos / reels'],
  ['posts', 'Posts + carruseles'],
  ['photos', 'Fotos'],
  ['ugc', 'UGC'],
  ['promocional', 'Promocionales']
];

const TYPE_KEYS = { Reel: 'reels', Post: 'posts', Carrusel: 'posts', Foto: 'photos', UGC: 'ugc', Promocional: 'promocional' };

function typeOf(item = {}) {
  // Al renombrar «Reel 1» a «Post 1», el formato debe acompañar el nombre;
  // para nombres libres se conserva el tipo importado o generado.
  const piece = String(item.piece || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = /(ugc|promocional|reel|video|clip|carrusel|carousel|foto|photo|imagen|post|estatic|static)/.test(piece)
    ? piece : String(item.type || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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

const groupOf = item => ['Reel', 'UGC', 'Promocional'].includes(typeOf(item)) ? 'video' : 'static';

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
    if (!days.includes(item.date) || occupied.has(item.date)) {
      throw new Error('Hay fechas vacías, fuera del periodo, en domingo o repetidas. Revísalas antes de generar.');
    }
    occupied.add(item.date);
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
  const added = queue.map((type, index) => ({
    date: '', piece: label(type, ++numbering[type]), type, pillar: '', topic: '', objective: '', status: ''
  }));
  if (!added.length) return { items: [...existing].sort((a, b) => a.date.localeCompare(b.date)), added: 0 };
  const layout = arrangeProposalPieces({ pieces: added, fixed: existing, days: available, groupOf, preserveOrder: true, seed: 1 });
  return { items: [...existing, ...layout.items].sort((a, b) => a.date.localeCompare(b.date)), added: added.length };
}

export function rearrangeProposalCalendar(proposal, seed = 1) {
  const { start, end } = resolveProposalPeriod(proposal);
  const days = dayRange(start, end);
  const items = [...(proposal.monthPlan || [])];
  if (!items.length) throw new Error('Primero genera o agrega piezas al calendario.');
  if (items.length > days.length) throw new Error('No caben todas las piezas en este periodo sin repetir días.');
  if (items.some(item => !typeOf(item) || !days.includes(item.date)) || new Set(items.map(item => item.date)).size !== items.length) {
    throw new Error('Revisa los formatos y las fechas de todas las piezas antes de reacomodar.');
  }
  const layout = arrangeProposalPieces({ pieces: items, days, groupOf, seed });
  return { ...layout, items: layout.items.sort((a, b) => a.date.localeCompare(b.date)) };
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
