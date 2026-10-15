// Genera la portada antes de subir el video, desde el archivo local del editor.
// Así la vista pública no necesita descargar ni procesar un video ajeno.
export async function createVideoPoster(file) {
  if (!file || !/^video\//i.test(file.type) || typeof document === 'undefined') return null;
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(() => finish(new Error('Video sin fotograma disponible')), 12000);
      video.onerror = () => finish(new Error('Formato no compatible con este navegador'));
      video.onseeked = () => finish();
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const time = duration > 0.3 ? Math.min(0.5, duration - 0.1) : 0;
        if (time === 0) video.onloadeddata = () => finish();
        else video.currentTime = time;
      };
      video.src = objectUrl;
      video.load();
    });
    if (!video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    const width = Math.min(640, video.videoWidth);
    canvas.width = width;
    canvas.height = Math.round(width * video.videoHeight / video.videoWidth);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    return blob ? new File([blob], 'vista-previa.jpg', { type: 'image/jpeg' }) : null;
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export function videoFirstFrameUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = 't=0.1';
    return parsed.toString();
  } catch {
    return url;
  }
}
