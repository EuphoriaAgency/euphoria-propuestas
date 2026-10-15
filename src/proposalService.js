import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, firebaseReady } from './firebase';
import { createNextCycleProposal } from './defaultProposal';
import { proposalSlugCandidates } from './proposalPublicLink';

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

export async function getPublicProposal(key) {
  if (!key) return null;
  if (firebaseReady) {
    // Tanto el ID antiguo como el alias legible se consultan por documento.
    let snap;
    try {
      snap = await getDoc(doc(db, colName, key));
    } catch (error) {
      if (error.code === 'permission-denied') return null;
      throw error;
    }
    if (!snap.exists() || snap.data().status !== 'published') return null;
    const targetId = snap.data().aliasFor;
    if (!targetId) return { id: snap.id, ...snap.data() };
    try {
      const target = await getDoc(doc(db, colName, targetId));
      return target.exists() && target.data().status === 'published'
        ? { id: target.id, ...target.data() } : null;
    } catch (error) {
      if (error.code === 'permission-denied') return null;
      throw error;
    }
  }
  const byId = localRead().find(p => p.id === key || p.slug === key);
  return byId?.status === 'published' ? byId : null;
}

async function reservePublishedSlug(id, proposal, payload) {
  if (firebaseReady) {
    const proposalRef = doc(db, colName, id);
    for (const slug of proposalSlugCandidates(proposal)) {
      const aliasRef = doc(db, colName, slug);
      const reserved = await runTransaction(db, async transaction => {
        const current = await transaction.get(proposalRef);
        const alias = await transaction.get(aliasRef);
        if (!current.exists()) throw new Error('La propuesta ya no existe.');
        if (!payload.status && current.data().status !== 'published') throw new Error('Publica primero la propuesta.');
        if (alias.exists() && alias.data().aliasFor !== id) return false;
        // Sin updatedAt: los alias no aparecen en el listado administrativo.
        transaction.set(aliasRef, { aliasFor: id, status: 'published' });
        transaction.update(proposalRef, { ...payload, slug, publicLinkReady: true, updatedAt: serverTimestamp() });
        return true;
      });
      if (reserved) return slug;
    }
    throw new Error('Ya existen demasiados enlaces con ese nombre.');
  }
  const items = localRead();
  const index = items.findIndex(item => item.id === id);
  if (index < 0) throw new Error('La propuesta ya no existe.');
  const slug = Array.from(proposalSlugCandidates(proposal)).find(candidate =>
    !items.some(item => item.id !== id && item.slug === candidate));
  if (!slug) throw new Error('Ya existen demasiados enlaces con ese nombre.');
  items[index] = { ...items[index], ...payload, slug, publicLinkReady: true, updatedAt: nowIso() };
  localWrite(items);
  return slug;
}

export async function ensurePublicLink(proposal) {
  if (proposal.status !== 'published') throw new Error('Publica primero la propuesta.');
  if (proposal.publicLinkReady && proposal.slug) return proposal;
  const slug = await reservePublishedSlug(proposal.id, proposal, {});
  return { ...proposal, slug, publicLinkReady: true };
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
  if (payload.status === 'published') {
    const slug = await reservePublishedSlug(id, { ...data, id }, payload);
    return { slug, publicLinkReady: true };
  }
  if (firebaseReady) {
    await updateDoc(doc(db, colName, id), payload);
    return { slug: data.slug || '' };
  }
  const items = localRead();
  const index = items.findIndex(p => p.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], ...payload };
    localWrite(items);
  }
  return { slug: data.slug || '' };
}

export async function deleteProposal(id) {
  if (firebaseReady) {
    const proposalRef = doc(db, colName, id);
    await runTransaction(db, async transaction => {
      const proposal = await transaction.get(proposalRef);
      if (!proposal.exists()) return;
      const slug = proposal.data().publicLinkReady && proposal.data().slug;
      const aliasRef = slug ? doc(db, colName, slug) : null;
      const alias = aliasRef ? await transaction.get(aliasRef) : null;
      if (alias?.exists() && alias.data().aliasFor === id) transaction.delete(aliasRef);
      transaction.delete(proposalRef);
    });
    return;
  }
  localWrite(localRead().filter(p => p.id !== id));
}

export async function duplicateProposal(proposal) {
  return createProposal({
    ...createNextCycleProposal(proposal),
    calendarImportPeriod: null,
    calendarImportSource: ''
  });
}
