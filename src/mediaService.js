import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseReady, storage } from './firebase';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_IDLE_MS = 90 * 1000;

function mediaType(file) {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return { kind: 'image', contentType: file.type || `image/${extension === 'jpg' ? 'jpeg' : extension}` };
  if (['mp4', 'webm', 'mov'].includes(extension)) return { kind: 'video', contentType: file.type || ({ mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' })[extension] };
  return null;
}

function safeName(value = 'archivo') {
  return String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function checkProposalStorage() {
  const bucket = storage?.app?.options?.storageBucket;
  if (!firebaseReady || !storage || !bucket) {
    return { state: 'missing', message: 'Firebase Storage no está configurado para este sitio.' };
  }
  try {
    // La consulta sólo distingue un bucket inexistente; un 403 de metadatos no impide
    // que la subida autenticada tenga permiso mediante Firebase Storage.
    const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 404) {
      const body = await response.json().catch(() => null);
      if (/specified bucket does not exist/i.test(body?.error?.message || '')) {
        return { state: 'missing', message: `El bucket ${bucket} no existe. Crea Cloud Storage en el proyecto de Firebase antes de subir archivos.` };
      }
    }
  } catch {
    // Si la consulta pública falla por red/CORS, deja que el SDK informe el error real.
  }
  return { state: 'unknown' };
}

export async function uploadProposalMedia(file, proposalId = 'demo', onProgress = () => {}, onTask = () => {}) {
  if (!file) throw new Error('No se seleccionó archivo.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('No hay conexión. Vuelve a conectarte antes de subir el archivo.');
  if (!firebaseReady || !storage) {
    throw new Error('Firebase Storage no está configurado todavía. Pega una URL o configura Storage para subir archivos.');
  }

  const type = mediaType(file);
  if (!type) throw new Error('Archivo no compatible. Usa JPG, PNG, WebP, GIF, MP4, WebM o MOV.');
  const maxBytes = type.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) throw new Error(`El archivo supera ${type.kind === 'video' ? '500 MB' : '20 MB'}. Para videos grandes, pega un enlace de Dropbox, YouTube o Vimeo.`);
  const filename = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}-${safeName(file.name)}`;
  const path = `proposal-media/${safeName(proposalId)}/${filename}`;
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file, { contentType: type.contentType });
  onTask(task);
  let stalled = false;
  let bytes = 0;
  let idleTimer;
  const armIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      stalled = true;
      task.cancel();
    }, MAX_IDLE_MS);
  };
  armIdleTimer();
  try {
    await new Promise((resolve, reject) => {
      task.on('state_changed', snapshot => {
        if (snapshot.bytesTransferred > bytes) {
          bytes = snapshot.bytesTransferred;
          armIdleTimer();
        }
        onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes), snapshot);
      }, error => {
        if (stalled) {
          const timeout = new Error('La subida no transfirió datos durante 90 segundos. Revisa la conexión o los permisos del bucket e intenta con un solo archivo.');
          timeout.code = 'storage/stalled';
          reject(timeout);
        } else {
          reject(error);
        }
      }, resolve);
    });
  } finally {
    clearTimeout(idleTimer);
  }
  return getDownloadURL(fileRef);
}
