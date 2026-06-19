import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseReady, storage } from './firebase';

function safeName(value = 'archivo') {
  return String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function uploadProposalMedia(file, proposalId = 'demo') {
  if (!file) throw new Error('No se seleccionó archivo.');
  if (!firebaseReady || !storage) {
    throw new Error('Firebase Storage no está configurado todavía. Pega una URL o configura Storage para subir archivos.');
  }

  const maxBytes = 80 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('El archivo pesa demasiado. Usa videos comprimidos o súbelos a YouTube/Vimeo/Drive y pega el link.');
  }

  const ext = file.name?.split('.').pop() || 'bin';
  const filename = `${Date.now()}-${safeName(file.name || `media.${ext}`)}`;
  const path = `proposal-media/${safeName(proposalId)}/${filename}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || undefined });
  return getDownloadURL(fileRef);
}
