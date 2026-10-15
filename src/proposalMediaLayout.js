import { getEmbed } from './mediaEmbed.js';

export function coverMediaLayout(proposal, references = []) {
  const slots = {
    main: { slot: 'main', url: proposal.heroMediaUrl || references[0]?.url || '', title: 'Visual principal' },
    left: { slot: 'left', url: proposal.heroMediaBackUrl || references[1]?.url || '', title: 'Visual izquierdo' },
    right: { slot: 'right', url: proposal.heroMediaFrontUrl || references[2]?.url || '', title: 'Visual derecho' }
  };
  const available = [slots.main, slots.left, slots.right].filter(item => item.url);
  // Las piezas estáticas necesitan más anchura que un reel. La principal gana
  // cuando también es una imagen; de lo contrario, la primera imagen se centra.
  const center = available.find(item => getEmbed(item.url).type === 'image') || available[0] || null;
  if (!center) return { center: null, left: null, right: null, items: [] };

  const left = slots.left.url && slots.left !== center ? slots.left
    : slots.main.url && slots.main !== center && center === slots.left ? slots.main : null;
  const right = slots.right.url && slots.right !== center ? slots.right
    : slots.main.url && slots.main !== center && center === slots.right ? slots.main : null;
  return { center, left, right, items: [center, left, right].filter(Boolean) };
}

export function editorialReferences(references = []) {
  const imageIndex = references.findIndex(item => getEmbed(item.url).type === 'image');
  if (imageIndex < 0) return { featured: null, remaining: references };
  return {
    featured: references[imageIndex],
    remaining: references.filter((_, index) => index !== imageIndex)
  };
}
