import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankProposal, createNextCycleProposal, defaultProposal, normalizeProposal } from '../src/defaultProposal.js';
import { getEmbed } from '../src/mediaEmbed.js';
import { resolveProposalPeriod } from '../src/proposalPeriod.js';
import { validatePublication } from '../src/proposalValidation.js';
import { isVideoPiece, preserveVideoScripts, scriptedVideoEntries, videoPlanEntries } from '../src/proposalScripts.js';
import { buildProductionCalendarExport, generateProposalCalendar, rearrangeProposalCalendar } from '../src/proposalCalendar.js';
import { buildCalendarImageLayout } from '../src/proposalCalendarImage.js';
import { TYPOGRAPHY_PRESETS, typographyVariables } from '../src/proposalTypography.js';
import { visibleProposalReferences } from '../src/proposalReferences.js';
import { coverMediaLayout, editorialReferences, editorialReferenceRows } from '../src/proposalMediaLayout.js';

test('una imagen lateral pasa al centro de portada y mantiene ambos reels visibles', () => {
  const cover = coverMediaLayout({
    heroMediaUrl: 'https://example.com/main.mp4',
    heroMediaBackUrl: 'https://example.com/post.png',
    heroMediaFrontUrl: 'https://example.com/other.webm'
  });
  assert.equal(cover.center.url, 'https://example.com/post.png');
  assert.deepEqual([cover.left?.url, cover.right?.url], ['https://example.com/main.mp4', 'https://example.com/other.webm']);
  assert.equal(cover.items.length, 3);
});

test('la portada y referencias heredadas conservan sus visuales aunque falten cargas nuevas', () => {
  const references = [
    { url: 'https://example.com/video.mp4' },
    { url: 'https://example.com/post.webp' },
    { url: 'https://example.com/otro.mp4' }
  ];
  const cover = coverMediaLayout({}, references);
  assert.equal(cover.center.url, references[1].url);
  assert.deepEqual(cover.items.map(item => item.url), [references[1].url, references[0].url, references[2].url]);
  assert.equal(editorialReferences(references).featured, references[1]);
  assert.deepEqual(editorialReferences(references).remaining, [references[0], references[2]]);
  assert.deepEqual(editorialReferences([{ url: 'https://example.com/reel.mp4' }]).remaining.length, 1);
});

test('cuatro referencias quedan en una fila editorial y los grupos largos no dejan huérfanas', () => {
  for (let count = 1; count <= 13; count++) {
    const references = Array.from({ length: count }, (_, index) => ({ url: `https://example.com/reel-${index}.mp4` }));
    if (count > 1) references[1] = { url: 'https://example.com/post.jpg' };
    const rows = editorialReferenceRows(references);
    assert.equal(rows.flat().length, count);
    assert.deepEqual(rows.flat().map(item => item.url), count > 1
      ? [references[1], references[0], ...references.slice(2)].map(item => item.url)
      : references.map(item => item.url));
    assert.ok(rows.length === 1 || rows.every(row => row.length >= 2));
    if (count === 4) assert.deepEqual(rows.map(row => row.length), [4]);
  }
});

test('dos imágenes y dos reels comparten una fila simétrica sin cambiar el carrusel móvil', () => {
  const references = [
    { url: 'https://example.com/reel-1.mp4' },
    { url: 'https://example.com/imagen-1.jpg' },
    { url: 'https://example.com/imagen-2.png' },
    { url: 'https://example.com/reel-2.mp4' }
  ];
  const rows = editorialReferenceRows(references);
  assert.deepEqual(rows.map(row => row.map(item => item.url)), [[
    references[1].url, references[0].url, references[3].url, references[2].url
  ]]);
  assert.deepEqual(references.map(item => item.url), [
    'https://example.com/reel-1.mp4',
    'https://example.com/imagen-1.jpg',
    'https://example.com/imagen-2.png',
    'https://example.com/reel-2.mp4'
  ]);
});

test('la portada toma miniaturas de cargas propias y de referencias heredadas', () => {
  const references = [{ url: 'https://example.com/reel.mp4', posterUrl: 'https://example.com/reel.jpg' }];
  assert.equal(coverMediaLayout({}, references).center.posterUrl, references[0].posterUrl);
  assert.equal(coverMediaLayout({ heroMediaUrl: references[0].url, heroMediaPosterUrl: 'https://example.com/nuevo.jpg' }, references).center.posterUrl, 'https://example.com/nuevo.jpg');
});

test('un ciclo nuevo no toma textos ni piezas de la propuesta de ejemplo', () => {
  const draft = createBlankProposal();
  assert.equal(draft.proposalType, 'monthly');
  assert.equal(draft.clientName, '');
  assert.deepEqual(draft.references, []);
  assert.deepEqual(draft.monthPlan, []);
  assert.equal(draft.scriptsTitle, 'Cada pieza, una idea clara.');
  assert.equal(draft.ctaTitle, '');
  assert.equal(draft.showCalendar, true);
});

test('solo producción publica videos desarrollados sin fechas y conserva la opción de volver al calendario', () => {
  const legacy = normalizeProposal({ clientName: 'Cliente anterior', monthPlan: [{ date: '2026-11-04', piece: 'Reel 1', topic: 'Tema' }] });
  assert.equal(legacy.showCalendar, true);
  assert.equal(validatePublication(legacy), '');
  const production = normalizeProposal({
    ...legacy,
    showCalendar: false,
    monthPlan: [
      { piece: 'Reel 1', type: 'Reel', topic: 'Servicios', scriptText: 'Apertura, desarrollo y cierre.' },
      { piece: 'Video 2', topic: 'Testimonio', scriptMode: 'visual', scriptText: 'Planos de la sesión.' }
    ]
  });
  assert.equal(production.showCalendar, false);
  assert.equal(validatePublication(production), '');
  assert.deepEqual(scriptedVideoEntries(production.monthPlan).map(item => item.piece), ['Reel 1', 'Video 2']);
  assert.match(validatePublication({ ...production, monthPlan: [{ piece: 'Reel 1', topic: 'Tema' }] }), /guion o estructura/);
  assert.match(validatePublication({ ...production, monthPlan: [{ piece: 'Post 1', topic: 'Solo post' }] }), /al menos un video/);
  assert.match(validatePublication({ ...production, showCalendar: true }), /fecha/);
  const next = createNextCycleProposal(production);
  assert.equal(next.showCalendar, false);
  assert.deepEqual(next.monthPlan, []);
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
  assert.equal(next.heroMediaPosterUrl, '');
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

test('una propuesta inicial se publica sin capturar entregables de cotización', () => {
  const proposal = normalizeProposal({
    clientName: 'Dra. Ejemplo', proposalType: 'initial',
    strategyTitle: 'Enfoque', strategyText: 'Desarrollo de contenido',
    deliverables: [],
    periodStart: '2026-11-01', periodEnd: '2026-11-30',
    monthPlan: [{ date: '2026-11-04', piece: 'Reel 1', topic: 'Dolor de rodilla' }]
  });
  assert.equal(validatePublication(proposal), '');
});

test('un selector ofrece fuentes únicas y combinadas sin perder la configuración anterior', () => {
  const legacy = normalizeProposal({ clientName: 'Cliente anterior', sectionTypography: null });
  assert.equal(legacy.typographyPreset, 'editorial');
  assert.deepEqual(legacy.sectionTypography, {});
  const fonts = typographyVariables('clinical');
  assert.match(fonts['--proposal-heading-font'], /Manrope/);
  const customized = { ...legacy, typographyPreset: 'gastronomy', sectionTypography: { intro: 'clinical', visuals: 'inherit' } };
  assert.equal(typographyVariables(customized.typographyPreset)['--proposal-body-font'], "'DM Sans', system-ui, sans-serif");
  assert.ok(TYPOGRAPHY_PRESETS.length > 4);
  for (const preset of TYPOGRAPHY_PRESETS.filter(item => item.value.startsWith('single-'))) {
    const variables = typographyVariables(preset.value);
    assert.equal(variables['--proposal-heading-font'], variables['--proposal-body-font']);
  }
  assert.equal(typographyVariables('fuente-desconocida')['--proposal-heading-font'], typographyVariables('editorial')['--proposal-heading-font']);
  const nextCycle = createNextCycleProposal(customized);
  assert.equal(nextCycle.typographyPreset, 'gastronomy');
  assert.equal(nextCycle.sectionTypography.intro, 'clinical');
});

test('la vista del cliente conserva la cuarta referencia y las siguientes', () => {
  const references = Array.from({ length: 5 }, (_, index) => ({ title: `Ejemplo ${index + 1}`, url: `https://example.com/${index + 1}` }));
  assert.deepEqual(visibleProposalReferences([...references, { title: '  ', url: '' }]), references);
  assert.equal(visibleProposalReferences(references)[3].title, 'Ejemplo 4');
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

test('las variaciones separan reels con estáticos, ocupan nuevos días y mantienen cada guion', () => {
  const proposal = {
    id: 'variaciones', clientName: 'Mabel Limón', periodStart: '2026-10-09', periodEnd: '2026-11-12',
    contentCounts: { reels: 7, posts: 6, photos: 0, ugc: 0, promocional: 0 }, monthPlan: []
  };
  const first = generateProposalCalendar(proposal).items.map(item => item.piece === 'Reel 1'
    ? { ...item, topic: 'Tema elegido', scriptText: 'Guion escrito', scriptMode: 'visual' } : item);
  const layouts = new Set();
  const before = new Set(first.map(item => item.date));
  for (let seed = 1; seed <= 12; seed++) {
    const result = rearrangeProposalCalendar({ ...proposal, monthPlan: first }, seed);
    assert.equal(result.items.length, 13);
    assert.equal(new Set(result.items.map(item => item.date)).size, 13);
    assert.deepEqual(result.items.map(item => isVideoPiece(item)), [true, false, true, false, true, false, true, false, true, false, true, false, true]);
    assert.ok(result.changedDateCount >= 1);
    assert.ok(result.items.some(item => !before.has(item.date)));
    assert.ok(result.items.every(item => new Date(`${item.date}T12:00:00Z`).getUTCDay() !== 0));
    assert.deepEqual(result.items.find(item => item.piece === 'Reel 1'), {
      ...first.find(item => item.piece === 'Reel 1'), date: result.items.find(item => item.piece === 'Reel 1').date
    });
    layouts.add(result.items.map(item => item.date).join(','));
  }
  assert.ok(layouts.size >= 6, `Solo hubo ${layouts.size} distribuciones de fechas`);
});

test('al renombrar una pieza, su formato sigue el nombre visible', () => {
  const proposal = {
    id: 'renombrar', clientName: 'Dra. Ejemplo', periodStart: '2026-11-02', periodEnd: '2026-11-30',
    monthPlan: [{ date: '2026-11-02', piece: 'Post 1', type: 'Reel', topic: 'Nuevo tema' }]
  };
  assert.equal(isVideoPiece(proposal.monthPlan[0]), false);
  assert.equal(buildProductionCalendarExport(proposal).items[0].type, 'Post');
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

test('el PNG conserva todas las piezas de un día y muestra las semanas completas del periodo', () => {
  const proposal = {
    clientName: 'Dra. Ejemplo', periodStart: '2026-10-12', periodEnd: '2026-11-12',
    monthPlan: [
      { date: '2026-10-15', piece: 'Reel 1', topic: 'Dolor de rodilla' },
      { date: '2026-10-15', piece: 'Post 1', topic: 'Servicios' },
      { date: '2026-10-15', piece: 'Foto 1', topic: 'Consultorio' },
      { date: '2026-11-12', piece: 'Reel 2', topic: 'Paciente ideal' }
    ]
  };
  const layout = buildCalendarImageLayout(proposal);
  assert.equal(layout.cells.length, 35);
  assert.equal(layout.cells[0].date, '2026-10-11');
  assert.equal(layout.cells.at(-1).date, '2026-11-14');
  assert.equal(layout.cells[0].inPeriod, false);
  assert.equal(layout.cells.find(cell => cell.date === '2026-10-15').items.length, 3);
  assert.deepEqual(layout.cells.find(cell => cell.date === '2026-10-15').items.map(item => item.video), [true, false, false]);
  assert.equal(layout.pieces, 4);
  assert.equal(layout.publicationDays, 2);
  assert.throws(() => buildCalendarImageLayout({ ...proposal, monthPlan: [...proposal.monthPlan, { piece: 'Reel 3' }] }), /fecha/);
  assert.throws(() => buildCalendarImageLayout({ ...proposal, periodStart: '2026-10-16' }), /periodo/);
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
