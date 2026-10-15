// Mismo criterio editorial que Producción: repartir fechas por intervalos,
// alternar familias y conservar cada pieza al cambiar su día. Una propuesta
// usa como máximo un contenido por fecha; no hay piezas operativas bloqueadas.
function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let n = Math.imul(value ^ (value >>> 15), value | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function spread(days, count, rng) {
  return Array.from({ length: count }, (_, i) => {
    const low = Math.floor(i * days.length / count);
    const high = Math.floor((i + 1) * days.length / count);
    return days[low + Math.floor(rng() * (high - low))];
  }).sort();
}

// Penaliza las rachas de video y estático igual que el calendario operativo.
function alternatingSlots(dates, fixed, videoCount, rng, groupOf) {
  const slots = [...dates.map(date => ({ date })), ...fixed.map(item => ({ date: item.date, group: groupOf(item) }))]
    .sort((a, b) => a.date.localeCompare(b.date));
  const remaining = Array(slots.length + 1).fill(0);
  for (let i = slots.length - 1; i >= 0; i--) remaining[i] = remaining[i + 1] + (slots[i].group ? 0 : 1);
  const cache = new Map();
  const choices = (i, videos) => slots[i].group ? [slots[i].group]
    : [...(videos ? ['video'] : []), ...(remaining[i] > videos ? ['static'] : [])];
  const stepCost = (group, last, run) => group === last ? 2 * run + 1 : 1;
  const cost = (i, videos, last, run) => {
    if (i === slots.length) return 0;
    const key = `${i}/${videos}/${last}/${run}`;
    if (cache.has(key)) return cache.get(key);
    const best = Math.min(...choices(i, videos).map(group => {
      const same = last === group;
      return stepCost(group, last, run) + cost(i + 1, videos - (!slots[i].group && group === 'video' ? 1 : 0), group, same ? run + 1 : 1);
    }));
    cache.set(key, best);
    return best;
  };
  const score = cost(0, videoCount, '', 0);
  let videos = videoCount, last = '', run = 0;
  const result = [];
  for (let i = 0; i < slots.length; i++) {
    const best = cost(i, videos, last, run);
    const options = choices(i, videos).filter(group => {
      const same = last === group;
      return stepCost(group, last, run) + cost(i + 1, videos - (!slots[i].group && group === 'video' ? 1 : 0), group, same ? run + 1 : 1) === best;
    });
    const group = options[Math.floor(rng() * options.length)];
    if (!slots[i].group) {
      result.push({ date: slots[i].date, group });
      if (group === 'video') videos--;
    }
    run = group === last ? run + 1 : 1;
    last = group;
  }
  return { slots: result, score };
}

function assignPieces(pieces, slots, rng, preserveOrder) {
  if (preserveOrder) return pieces.map((item, i) => ({ item, date: slots[i].date }));
  const assigned = new Map();
  const order = shuffled(pieces, rng);
  const slotOrder = shuffled(slots.map((_, i) => i), rng);
  const place = (item, visited) => {
    for (const i of slotOrder) {
      if (visited.has(i) || slots[i].date === item.date) continue;
      visited.add(i);
      if (!assigned.has(i) || place(assigned.get(i), visited)) { assigned.set(i, item); return true; }
    }
    return false;
  };
  order.forEach(item => place(item, new Set()));
  const placed = new Set(assigned.values());
  const unmatched = order.filter(item => !placed.has(item));
  slots.forEach((_, i) => { if (!assigned.has(i)) assigned.set(i, unmatched.pop()); });
  return slots.map((slot, i) => ({ item: assigned.get(i), date: slot.date }));
}

function changedDateSlots(previous, next) {
  const old = new Set(previous);
  return next.filter(date => !old.has(date)).length;
}

export function arrangeProposalPieces({ pieces, fixed = [], days, groupOf, seed = 1, preserveOrder = false }) {
  if (!pieces.length) return { items: [], changed: false, changedDateCount: 0 };
  if (pieces.length > days.length) throw new Error('No caben todas las piezas en este periodo.');
  const rng = random(seed);
  const originalDates = pieces.map(item => item.date).sort();
  const originalValid = new Set(originalDates).size === pieces.length && originalDates.every(date => days.includes(date));
  const fixedDates = fixed.map(item => item.date);
  const videoCount = pieces.filter(item => groupOf(item) === 'video').length;
  const dayNumber = day => Date.parse(`${day}T12:00:00Z`) / 86400000;
  let best;
  for (let attempt = 0; attempt < 16; attempt++) {
    let dates;
    if (attempt === 0 && originalValid) dates = originalDates;
    else if (attempt === 1 && originalValid && days.length > pieces.length) {
      const spare = days.filter(date => !originalDates.includes(date));
      dates = [...originalDates];
      dates[Math.floor(rng() * dates.length)] = spare[Math.floor(rng() * spare.length)];
      dates.sort();
    } else dates = spread(days, pieces.length, rng);

    const layout = alternatingSlots(dates, fixed, videoCount, rng, groupOf);
    const assigned = ['video', 'static'].flatMap(group => assignPieces(
      pieces.filter(item => groupOf(item) === group),
      layout.slots.filter(slot => slot.group === group), rng, preserveOrder
    ));
    const byItem = new Map(assigned.map(({ item, date }) => [item, date]));
    const items = pieces.map(item => ({ ...item, date: byItem.get(item) }));
    const movedCount = pieces.filter(item => byItem.get(item) !== item.date).length;
    const changedDateCount = originalValid ? changedDateSlots(originalDates, dates) : 0;
    const timeline = [...dates, ...fixedDates].map(dayNumber).sort((a, b) => a - b);
    const allDays = [...days, ...fixedDates].sort();
    const edge = (dayNumber(allDays.at(-1)) - dayNumber(allDays[0]) + 1) / (timeline.length + 1) / 2;
    const points = [dayNumber(allDays[0]) - edge, ...timeline, dayNumber(allDays.at(-1)) + edge];
    const spacing = points.slice(1).reduce((sum, value, i) => sum + (value - points[i]) ** 2, 0);
    const score = [layout.score, -changedDateCount, -movedCount, spacing];
    const better = !best || score.some((value, i) => value < best.score[i] && score.slice(0, i).every((v, j) => v === best.score[j]));
    if (better) best = { items, changed: movedCount > 0, changedDateCount, score };
  }
  return best;
}
