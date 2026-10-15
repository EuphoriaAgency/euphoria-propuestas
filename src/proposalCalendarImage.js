import { resolveProposalPeriod, validDay } from './proposalPeriod.js';
import { isVideoPiece } from './proposalScripts.js';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const utcDate = day => new Date(`${day}T12:00:00Z`);
const dayKey = date => date.toISOString().slice(0, 10);

export function buildCalendarImageLayout(proposal = {}) {
  const { start, end } = resolveProposalPeriod(proposal);
  if (!validDay(start) || !validDay(end) || start > end) {
    throw new Error('Define un inicio y fin válidos antes de exportar la imagen.');
  }
  if ((utcDate(end) - utcDate(start)) / DAY_MS > 45) {
    throw new Error('El calendario supera 45 días. Ajusta el periodo antes de exportar la imagen.');
  }
  const pieces = (proposal.monthPlan || []).filter(item => item?.piece || item?.topic || item?.date);
  if (!pieces.length) throw new Error('Agrega piezas al calendario antes de descargar la imagen.');

  const placements = new Map();
  for (const item of pieces) {
    if (!validDay(item.date) || item.date < start || item.date > end) {
      throw new Error('Todas las piezas necesitan una fecha dentro del periodo para exportar la imagen.');
    }
    const previous = placements.get(item.date) || [];
    previous.push({
      type: String(item.piece || item.type || 'Pieza').trim(),
      topic: String(item.topic || item.objective || '').trim(),
      video: isVideoPiece(item)
    });
    placements.set(item.date, previous);
  }

  const first = utcDate(start);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const last = utcDate(end);
  last.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));
  const days = Math.max(35, Math.round((last - first) / DAY_MS) + 1);
  const cells = Array.from({ length: days }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(date.getUTCDate() + index);
    const key = dayKey(date);
    return {
      date: key,
      day: date.getUTCDate(),
      month: MONTHS[date.getUTCMonth()],
      inPeriod: key >= start && key <= end,
      items: placements.get(key) || []
    };
  });
  return { start, end, cells, weeks: days / 7, publicationDays: placements.size, pieces: pieces.length };
}

function safeColor(value, fallback) {
  return /^#[\da-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

function accentOnCharcoal(value, fallback) {
  let color = safeColor(value, fallback);
  for (let step = 0; step < 10; step++) {
    const channels = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    const luminance = channels.reduce((sum, channel, index) => {
      const scaled = channel / 255;
      return sum + (scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4)
        * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    if ((luminance + 0.05) / 0.067 >= 4.5) break;
    color = `#${channels.map(channel => Math.round(channel * 0.8 + 255 * 0.2).toString(16).padStart(2, '0')).join('')}`;
  }
  return color;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function textLines(ctx, value, maxWidth) {
  const lines = [];
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function cardMeasurements(ctx, item, width) {
  const maxWidth = width - 34;
  ctx.font = '700 14px sans-serif';
  const typeLines = textLines(ctx, item.type.toUpperCase(), maxWidth);
  ctx.font = '500 17px sans-serif';
  const topicLines = textLines(ctx, item.topic, maxWidth);
  return { typeLines, topicLines, height: 19 + typeLines.length * 19 + (topicLines.length ? 9 + topicLines.length * 23 : 0) + 17 };
}

function drawCard(ctx, x, y, width, item, measurement, color) {
  const { typeLines, topicLines, height } = measurement;
  ctx.fillStyle = '#252627';
  ctx.strokeStyle = '#424347';
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, 4, height, 2);
  ctx.fill();

  let baseline = y + 27;
  ctx.font = '700 14px sans-serif';
  ctx.fillStyle = color;
  for (const line of typeLines) {
    ctx.fillText(line, x + 17, baseline);
    baseline += 19;
  }
  if (topicLines.length) {
    baseline += 9;
    ctx.font = '500 17px sans-serif';
    ctx.fillStyle = '#efede9';
    for (const line of topicLines) {
      ctx.fillText(line, x + 17, baseline);
      baseline += 23;
    }
  }
}

function filenamePart(value) {
  return String(value || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || 'cliente';
}

export async function createProposalCalendarPng(proposal, { primary, secondary } = {}) {
  const layout = buildCalendarImageLayout(proposal);
  if (typeof document === 'undefined') throw new Error('La descarga de imagen requiere un navegador.');
  await document.fonts?.ready;

  const width = 1540;
  const margin = 68;
  const gap = 10;
  const cellWidth = (width - margin * 2 - gap * 6) / 7;
  const cardWidth = cellWidth - 24;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no pudo preparar la imagen del calendario.');

  const measured = layout.cells.map(cell => ({
    ...cell,
    cards: cell.items.map(item => cardMeasurements(ctx, item, cardWidth))
  }));
  const rowHeights = Array.from({ length: layout.weeks }, (_, row) => Math.max(157,
    ...measured.slice(row * 7, row * 7 + 7).map(cell =>
      59 + cell.cards.reduce((sum, card) => sum + card.height + 9, 0) + 12)));
  const height = 276 + rowHeights.reduce((sum, row) => sum + row + gap, 0) + 100;
  // Keep the full sheet within normal browser canvas limits, even with many pieces on one day.
  const scale = height > 7000 ? 1 : 2;
  if (height * scale > 16000) throw new Error('Hay demasiado texto para una sola imagen. Acorta los temas o divide el calendario.');
  canvas.width = width * scale;
  canvas.height = Math.ceil(height * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#111213';
  ctx.fillRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, 260);
  gradient.addColorStop(0, '#242527');
  gradient.addColorStop(1, '#171819');
  ctx.fillStyle = gradient;
  roundedRect(ctx, 32, 32, width - 64, height - 64, 24);
  ctx.fill();

  const video = accentOnCharcoal(primary, '#ffa649');
  const statics = accentOnCharcoal(secondary, '#b5c5d7');
  ctx.fillStyle = video;
  roundedRect(ctx, margin, 74, 54, 5, 2);
  ctx.fill();
  ctx.font = '700 15px sans-serif';
  ctx.fillStyle = '#bcbab5';
  ctx.fillText('EUPHORIA  /  PROPUESTAS', margin, 104);
  ctx.fillStyle = '#f6f3ed';
  let titleSize = 45;
  const name = String(proposal.clientName || 'Cliente').trim() || 'Cliente';
  while (titleSize > 25) {
    ctx.font = `700 ${titleSize}px sans-serif`;
    if (ctx.measureText(name).width <= width - margin * 2 - 330) break;
    titleSize--;
  }
  if (ctx.measureText(name).width > width - margin * 2 - 330) {
    throw new Error('El nombre del cliente es demasiado largo para el encabezado del calendario.');
  }
  ctx.fillText(name, margin, 160);
  ctx.font = '500 19px sans-serif';
  ctx.fillStyle = '#aaa8a4';
  ctx.fillText(`${layout.start} — ${layout.end}`, margin, 219);

  ctx.textAlign = 'right';
  ctx.font = '700 22px sans-serif';
  ctx.fillStyle = '#f4f1ec';
  ctx.fillText(`${layout.publicationDays} días de publicación`, width - margin, 144);
  ctx.font = '500 17px sans-serif';
  ctx.fillStyle = '#aaa8a4';
  ctx.fillText(`${layout.pieces} piezas  ·  Videos / reels y estáticos`, width - margin, 174);
  ctx.textAlign = 'left';

  WEEKDAYS.forEach((day, column) => {
    ctx.fillStyle = '#c5c3be';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(day, margin + column * (cellWidth + gap) + 9, 265);
  });

  let rowY = 276;
  for (let row = 0; row < layout.weeks; row++) {
    for (let column = 0; column < 7; column++) {
      const cell = measured[row * 7 + column];
      const x = margin + column * (cellWidth + gap);
      ctx.fillStyle = cell.inPeriod ? '#1b1c1e' : '#171819';
      ctx.strokeStyle = cell.inPeriod ? '#444548' : '#2d2e30';
      ctx.lineWidth = 1;
      roundedRect(ctx, x, rowY, cellWidth, rowHeights[row], 12);
      ctx.fill();
      ctx.stroke();
      ctx.font = '700 23px sans-serif';
      ctx.fillStyle = cell.inPeriod ? '#f5f2ed' : '#777875';
      ctx.fillText(String(cell.day), x + 13, rowY + 32);
      ctx.textAlign = 'right';
      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = cell.inPeriod ? '#a8a8a6' : '#6b6c6a';
      ctx.fillText(cell.month, x + cellWidth - 13, rowY + 29);
      ctx.textAlign = 'left';
      let cardY = rowY + 51;
      cell.items.forEach((item, index) => {
        drawCard(ctx, x + 12, cardY, cardWidth, item, cell.cards[index], item.video ? video : statics);
        cardY += cell.cards[index].height + 9;
      });
    }
    rowY += rowHeights[row] + gap;
  }

  ctx.fillStyle = video;
  roundedRect(ctx, margin, height - 77, 15, 15, 4);
  ctx.fill();
  ctx.fillStyle = '#dad8d3';
  ctx.font = '500 16px sans-serif';
  ctx.fillText('Videos / reels', margin + 26, height - 64);
  ctx.fillStyle = statics;
  roundedRect(ctx, margin + 192, height - 77, 15, 15, 4);
  ctx.fill();
  ctx.fillStyle = '#dad8d3';
  ctx.fillText('Estáticos', margin + 218, height - 64);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No se pudo generar el PNG en este navegador.');
  return {
    blob,
    filename: `calendario_propuesta_${filenamePart(name)}_${layout.start}_${layout.end}.png`,
    pieces: layout.pieces
  };
}
