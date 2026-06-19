import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, firebaseReady } from './firebase';

const LS_KEY = 'euphoria_proposals_demo';
const colName = 'proposals';

function nowIso() {
  return new Date().toISOString();
}

function localRead() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function localWrite(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export async function listProposals() {
  if (firebaseReady) {
    const q = query(collection(db, colName), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return localRead().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function getProposalById(id) {
  if (!id) return null;
  if (firebaseReady) {
    const ref = doc(db, colName, id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  return localRead().find(p => p.id === id) || null;
}

export async function getProposalBySlug(slug) {
  if (!slug) return null;
  if (firebaseReady) {
    const q = query(collection(db, colName), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return { id: first.id, ...first.data() };
  }
  return localRead().find(p => p.slug === slug) || null;
}

export async function createProposal(data) {
  const payload = {
    ...data,
    createdAt: firebaseReady ? serverTimestamp() : nowIso(),
    updatedAt: firebaseReady ? serverTimestamp() : nowIso()
  };
  if (firebaseReady) {
    const ref = await addDoc(collection(db, colName), payload);
    return ref.id;
  }
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const items = localRead();
  items.unshift({ id, ...payload });
  localWrite(items);
  return id;
}

export async function updateProposal(id, data) {
  const payload = {
    ...data,
    updatedAt: firebaseReady ? serverTimestamp() : nowIso()
  };
  if (firebaseReady) {
    await updateDoc(doc(db, colName, id), payload);
    return;
  }
  const items = localRead();
  const index = items.findIndex(p => p.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...payload };
    localWrite(items);
  }
}

export async function deleteProposal(id) {
  if (firebaseReady) {
    await deleteDoc(doc(db, colName, id));
    return;
  }
  localWrite(localRead().filter(p => p.id !== id));
}

export async function duplicateProposal(proposal) {
  const copy = {
    ...proposal,
    clientName: `${proposal.clientName || 'Propuesta'} · copia`,
    clientDisplayName: `${proposal.clientDisplayName || proposal.clientName || 'Propuesta'} · copia`,
    slug: `${proposal.slug || 'propuesta'}-copia-${Date.now().toString().slice(-4)}`,
    status: 'draft'
  };
  delete copy.id;
  return createProposal(copy);
}
