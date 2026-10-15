import { getEmbed } from './mediaEmbed.js';

export function coverMediaLayout(proposal, references = []) {
  const coverSlot = (slot, urlField, posterField, reference, title) => ({
    slot,
    url: proposal[urlField] || reference?.url || '',
    posterUrl: proposal[urlField] ? proposal[posterField] || '' : reference?.posterUrl || '',
    title
  });
  const slots = {
    main: coverSlot('main', 'heroMediaUrl', 'heroMediaPosterUrl', references[0], 'Visual 1'),
    left: coverSlot('left', 'heroMediaBackUrl', 'heroMediaBackPosterUrl', references[1], 'Visual 2'),
    right: coverSlot('right', 'heroMediaFrontUrl', 'heroMediaFrontPosterUrl', references[2], 'Visual 3')
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

// Una fila nunca termina con una sola referencia. La primera imagen abre la
// galería; el resto conserva su orden y se distribuye en filas de 2 a 4.
export function editorialReferenceRows(references = []) {
  const { featured, remaining } = editorialReferences(references);
  let ordered = featured ? [featured, ...remaining] : remaining;
  // En una fila de cuatro, dos imágenes flanquean los dos reels. La versión
  // móvil sigue usando el orden original de references en su carrusel.
  if (ordered.length === 4 && ordered.filter(item => getEmbed(item.url).type === 'image').length === 2) {
    const images = ordered.filter(item => getEmbed(item.url).type === 'image');
    const other = ordered.filter(item => getEmbed(item.url).type !== 'image');
    ordered = [images[0], ...other, images[1]];
  }
  const rows = [];
  for (let index = 0; index < ordered.length;) {
    const left = ordered.length - index;
    const size = left <= 4 ? left : left % 3 === 1 ? 4 : 3;
    rows.push(ordered.slice(index, index + size));
    index += size;
  }
  return rows;
}
