import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankProposal, createNextCycleProposal, defaultProposal, normalizeProposal } from '../src/defaultProposal.js';
import { getEmbed } from '../src/mediaEmbed.js';
import { resolveProposalPeriod } from '../src/proposalPeriod.js';
import { validatePublication } from '../src/proposalValidation.js';
import { preserveVideoScripts, scriptedVideoEntries, videoPlanEntries } from '../src/proposalScripts.js';
import { buildProductionCalendarExport, generateProposalCalendar, rearrangeProposalCalendar } from '../src/proposalCalendar.js';

test('un ciclo nuevo no toma textos ni piezas de la propuesta de ejemplo', () => {
  const draft = createBlankProposal();
  assert.equal(draft.proposalType, 'monthly');
  assert.equal(draft.clientName, '');
  assert.deepEqual(draft.references, []);
  assert.deepEqual(draft.monthPlan, []);
  assert.equal(draft.scriptsTitle, 'Cada pieza, una idea clara.');
  assert.equal(draft.ctaTitle, '');
});

test('duplicar conserva la identidad y el color, pero limpia los datos del ciclo anterior', () => {
  const previous = { ...defaultProposal, id: 'old-id', cycleNumber: 2, themePreset: 'custom', customAccent: '#123456', periodStart: '2026-10-01', periodEnd: '2026-10-31', scriptsTitle: 'Guiones de octubre', monthPlan: [{ date: '2026-10-02', piece: 'Reel 1', scriptText: 'Guion anterior' }] };
  const next = createNextCycleProposal(previous);
  assert.equal(previous.periodStart, '2026-10-01');
  assert.equal(next.id, undefined);
  assert.equal(next.cycleNumber, 3);
  assert.equal(next.status, 'draft');
  assert.equal(next.proposalType, 'monthly');
  assert.equal(next.clientName, previous.clientName);
  assert.equal(next.customAccent, '#123456');
  assert.deepEqual(next.deliverables, previous.deliverables);
  assert.equal(next.periodStart, '');
  assert.equal(next.strategyTitle, '');
  assert.deepEqual(next.references, []);
  assert.deepEqual(next.monthPlan, []);
  assert.equal(next.scriptsTitle, 'Cada pieza, una idea clara.');
  assert.equal(next.heroMediaUrl, '');
  assert.deepEqual(resolveProposalPeriod({ ...next, calendarImportPeriod: { startDate: '2026-10-01', endDate: '2026-10-31' } }), { start: '', end: '' });
});

test('la propuesta publicada antes de introducir ciclos conserva sus títulos de presentación', () => {
  const legacy = { ...defaultProposal };
  delete legacy.proposalType;
  delete legacy.systemTitle;
  delete legacy.visualTitle;
  delete legacy.calendarTitle;
  const restored = normalizeProposal(legacy);
  assert.equal(restored.proposalType, 'initial');
  assert.equal(restored.systemTitle, defaultProposal.systemTitle);
  assert.equal(restored.visualTitle, defaultProposal.visualTitle);
  assert.equal(restored.calendarTitle, defaultProposal.calendarTitle);
  assert.equal(restored.scriptsTitle, defaultProposal.scriptsTitle);
});

test('el cliente ve solo guiones de video, ordenados por su fecha real del calendario', () => {
  const plan = [
    { date: '2026-11-12', piece: 'Reel 2', topic: 'Promocional', scriptMode: 'visual', scriptText: 'Planos del consultorio' },
    { date: '2026-11-04', piece: 'Post 1', topic: 'Servicios', scriptText: 'Texto de un post' },
    { date: '2026-11-07', piece: 'Video / Reel 1', topic: 'Dolor de rodilla', scriptText: 'Apertura\nDesarrollo\nCierre' },
    { date: '2026-11-09', piece: 'Foto 1', topic: 'Retrato' },
    { date: '2026-11-10', piece: 'Reel 3', topic: 'Sin guion' }
  ];
  assert.deepEqual(videoPlanEntries(plan).map(item => item.piece), ['Video / Reel 1', 'Reel 3', 'Reel 2']);
  assert.deepEqual(scriptedVideoEntries(plan).map(item => [item.piece, item.index]), [['Video / Reel 1', 2], ['Reel 2', 0]]);
});

test('volver a importar el mismo calendario conserva guiones únicos sin arrastrarlos a otra pieza', () => {
  const previous = [
    { piece: 'Reel 1', date: '2026-10-01', topic: 'Anterior', scriptText: 'Guion aprobado', scriptMode: 'voice' },
    { piece: 'Reel 2', date: '2026-10-02', topic: 'Anterior', scriptText: 'Secuencia', scriptMode: 'visual' }
  ];
  const updated = preserveVideoScripts(previous, [
    { piece: 'Reel 1', date: '2026-11-10', topic: 'Nuevo tema' },
    { piece: 'Post 1', date: '2026-11-11', topic: 'Estático' },
    { piece: 'Reel 3', date: '2026-11-12', topic: 'Nuevo video' }
  ]);
  assert.equal(updated[0].date, '2026-11-10');
  assert.equal(updated[0].topic, 'Nuevo tema');
  assert.equal(updated[0].scriptText, 'Guion aprobado');
  assert.equal(updated[1].scriptText, undefined);
  assert.equal(updated[2].scriptText, undefined);
  const ambiguous = preserveVideoScripts(previous, [{ piece: 'Reel 1' }, { piece: 'Reel 1' }]);
  assert.equal(ambiguous[0].scriptText, undefined);
});

test('genera cantidades por tipo, alterna formatos y conserva títulos y guiones al reacomodar', () => {
  const proposal = {
    id: 'prueba123', clientName: 'Dra. Ejemplo', periodStart: '2026-11-02', periodEnd: '2026-11-30',
    contentCounts: { reels: 3, posts: 3, photos: 1, ugc: 0, promocional: 0 }, monthPlan: []
  };
  const generated = generateProposalCalendar(proposal);
  assert.equal(generated.added, 7);
  assert.equal(new Set(generated.items.map(item => item.date)).size, 7);
  assert.deepEqual(generated.items.filter(item => item.type === 'Reel').map(item => item.piece), ['Reel 1', 'Reel 2', 'Reel 3']);
  assert.equal(generated.items.filter(item => ['Post', 'Carrusel'].includes(item.type)).length, 3);
  const first = generated.items.find(item => item.piece === 'Reel 1');
  const written = generated.items.map(item => item === first ? { ...item, topic: 'Dolor de rodilla', scriptText: 'Apertura\nCierre' } : item);
  const rearranged = rearrangeProposalCalendar({ ...proposal, monthPlan: written }, 14);
  assert.equal(rearranged.changed, true);
  assert.equal(rearranged.items.find(item => item.piece === 'Reel 1').scriptText, 'Apertura\nCierre');
  assert.equal(rearranged.items.find(item => item.piece === 'Reel 1').topic, 'Dolor de rodilla');
  assert.ok(rearranged.items.some((item, index) => item.date !== written[index].date));
});

test('exporta un archivo independiente para Producción y rechaza fechas repetidas', () => {
  const proposal = {
    id: 'prueba123', clientName: 'Dr. Félix', periodStart: '2026-11-02', periodEnd: '2026-11-30',
    monthPlan: [
      { date: '2026-11-02', piece: 'Reel 1', type: 'Reel', topic: 'Dolor de rodilla', scriptText: 'Inicio y cierre', scriptMode: 'voice' },
      { date: '2026-11-04', piece: 'Post 1', type: 'Post', topic: 'Consulta' }
    ]
  };
  const data = buildProductionCalendarExport(proposal);
  assert.equal(data.schemaVersion, 'euphoria_proposal_calendar_v1');
  assert.equal(data.items[0].title, 'Dolor de rodilla');
  assert.equal(data.items[0].scriptText, 'Inicio y cierre');
  assert.equal(data.items[1].scriptText, '');
  assert.deepEqual(data.period, { startDate: '2026-11-02', endDate: '2026-11-30' });
  assert.throws(() => buildProductionCalendarExport({ ...proposal, monthPlan: proposal.monthPlan.map(item => ({ ...item, date: '2026-11-02' })) }), /repetidos/);
});

test('enlaces de Firebase Storage, MOV y plataformas externas se manejan sin falsa reproducción', () => {
  const file = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/proposal-media%2Fclient%2Freference.mp4?alt=media&token=abc';
  assert.equal(getEmbed(file).type, 'video');
  assert.equal(getEmbed('https://example.com/video.mov').type, 'link');
  assert.equal(getEmbed('https://www.dropbox.com/s/demo/reference.mp4?dl=0').type, 'link');
  assert.equal(getEmbed('https://drive.google.com/file/d/demo/view').type, 'link');
  assert.equal(getEmbed('https://youtu.be/abcdefghijk').src, 'https://www.youtube-nocookie.com/embed/abcdefghijk');
  assert.equal(getEmbed('javascript:alert(1)').type, 'empty');
  assert.doesNotThrow(() => getEmbed('https://example.com/%E0%A4%A.mp4'));
});

test('el calendario deduce su periodo sin capturar fechas en la portada', () => {
  const proposal = {
    clientName: 'Cliente de prueba',
    proposalType: 'monthly',
    monthPlan: [
      { date: '2026-11-18', piece: 'Reel 2' },
      { date: '2026-11-03', piece: 'Reel 1' }
    ]
  };
  assert.deepEqual(resolveProposalPeriod(proposal), { start: '2026-11-03', end: '2026-11-18' });
  assert.equal(validatePublication(proposal), '');
  assert.deepEqual(resolveProposalPeriod({ ...proposal, calendarImportPeriod: { startDate: '2026-11-01', endDate: '2026-11-30' } }), { start: '2026-11-01', end: '2026-11-30' });
  assert.deepEqual(resolveProposalPeriod({ ...proposal, calendarImportPeriod: { startDate: '2026-10-01', endDate: '2026-10-31' } }), { start: '2026-11-03', end: '2026-11-18' });
  assert.equal(validatePublication({ ...proposal, periodStart: '2026-11-20', periodEnd: '2026-11-30' }), 'Hay piezas fuera del rango del calendario; ajusta las fechas.');
  assert.equal(validatePublication({ ...proposal, monthPlan: [{ date: '2026-02-30', piece: 'Reel 1' }] }), 'Hay una fecha inválida en el calendario.');
});
