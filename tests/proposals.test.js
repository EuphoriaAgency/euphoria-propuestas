import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankProposal, createNextCycleProposal, defaultProposal, normalizeProposal } from '../src/defaultProposal.js';
import { getEmbed } from '../src/mediaEmbed.js';

test('un ciclo nuevo no toma textos ni piezas de la propuesta de ejemplo', () => {
  const draft = createBlankProposal();
  assert.equal(draft.proposalType, 'monthly');
  assert.equal(draft.clientName, '');
  assert.deepEqual(draft.references, []);
  assert.deepEqual(draft.monthPlan, []);
  assert.equal(draft.ctaTitle, '');
});

test('duplicar conserva la identidad y el color, pero limpia los datos del ciclo anterior', () => {
  const previous = { ...defaultProposal, id: 'old-id', cycleNumber: 2, themePreset: 'custom', customAccent: '#123456', periodStart: '2026-10-01', periodEnd: '2026-10-31' };
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
  assert.equal(next.heroMediaUrl, '');
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
