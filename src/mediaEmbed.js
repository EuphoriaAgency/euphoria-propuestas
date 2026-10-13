export function getEmbed(url = '') {
  const value = String(url || '').trim();
  if (/^data:image\//i.test(value)) return { type: 'image', src: value };
  if (/^data:video\/(mp4|webm)/i.test(value)) return { type: 'video', src: value };

  let parsed;
  try { parsed = new URL(value); } catch { return { type: 'empty' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { type: 'empty' };

  const host = parsed.hostname.toLowerCase();
  const youtube = host === 'youtu.be' ? parsed.pathname.slice(1).split('/')[0]
    : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
      ? parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]
      : null;
  if (youtube && /^[\w-]{11}$/.test(youtube)) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtube}` };

  const vimeo = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)
    ? parsed.pathname.match(/(?:^\/|\/video\/)(\d+)/)?.[1] : null;
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo}` };

  // Un enlace de Dropbox/Drive apunta a una página, aunque el nombre acabe en .mp4.
  if (/(^|\.)(dropbox\.com|dropboxusercontent\.com|drive\.google\.com)$/.test(host)) return { type: 'link', src: value };

  let pathname = parsed.pathname;
  try { pathname = decodeURIComponent(pathname); } catch { /* Conserva la ruta original. */ }
  if (/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(pathname)) return { type: 'image', src: value };
  if (/\.(mp4|webm)$/i.test(pathname)) return { type: 'video', src: value };
  return { type: 'link', src: value };
}
