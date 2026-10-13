import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseReady, storage } from './firebase';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

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

export async function uploadProposalMedia(file, proposalId = 'demo', onProgress = () => {}, onTask = () => {}) {
  if (!file) throw new Error('No se seleccionó archivo.');
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
  await new Promise((resolve, reject) => {
    task.on('state_changed', snapshot => {
      onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes));
    }, reject, resolve);
  });
  return getDownloadURL(fileRef);
}
