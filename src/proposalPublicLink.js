import { resolveProposalPeriod } from './proposalPeriod.js';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const RESERVED = new Set(['admin', 'demo', 'p', 'assets']);

export function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

export function isReadableSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80 && !RESERVED.has(value);
}

export function suggestedProposalSlug(proposal) {
  const fullName = slugify(proposal.clientName);
  const shortName = fullName.slice(0, 40);
  const name = (fullName.length > 40 ? shortName.replace(/-[^-]*$/, '') : shortName) || 'propuesta';
  const phraseWords = String(proposal.positioning || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .split('-').filter(Boolean).slice(0, 6);
  const period = resolveProposalPeriod(proposal);
  const datedMonth = period.start ? MONTHS[Number(period.start.slice(5, 7)) - 1] : '';
  const descriptor = phraseWords.length ? phraseWords : (datedMonth ? [datedMonth] : ['ciclo', String(proposal.cycleNumber || 1)]);
  const parts = [name];
  for (const word of descriptor) {
    if (`${parts.join('-')}-${word}`.length > 80) break;
    parts.push(word);
  }
  return parts.length > 1 ? parts.join('-') : slugify(`${name}-${datedMonth || 'propuesta'}`);
}

export function* proposalSlugCandidates(proposal) {
  const preferred = proposal.publicLinkReady && proposal.slug
    ? slugify(proposal.slug) : suggestedProposalSlug(proposal);
  if (!isReadableSlug(preferred)) throw new Error('No se puede crear una dirección pública con ese nombre.');
  yield preferred;
  const year = resolveProposalPeriod(proposal).start?.slice(0, 4);
  const withYear = year && !preferred.endsWith(`-${year}`) ? slugify(`${preferred.slice(0, 75)}-${year}`) : '';
  if (withYear && withYear !== preferred) yield withYear;
  for (let n = 2; n < 50; n++) yield slugify(`${preferred.slice(0, 76)}-${n}`);
}

export function publicProposalPath(proposal) {
  return proposal.publicLinkReady && proposal.slug && isReadableSlug(proposal.slug) ? `/${proposal.slug}` : `/p/${proposal.id}`;
}
