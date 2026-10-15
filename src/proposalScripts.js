function pieceKey(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isVideoPiece(item = {}) {
  return /\b(reels?|videos?|ugc|clips?|promocional(?:es)?)\b/.test(pieceKey(`${item.type || ''} ${item.piece || ''}`));
}

export function videoPlanEntries(plan = []) {
  return plan
    .map((item, index) => ({ ...item, index }))
    .filter(isVideoPiece)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || a.index - b.index);
}

export function scriptedVideoEntries(plan = []) {
  return videoPlanEntries(plan).filter(item => String(item.scriptText || '').trim());
}

// Reimportar fechas o temas de Euphoria OS no debe borrar guiones ya redactados.
// Solo se conserva texto cuando el identificador de pieza es único en ambos calendarios.
export function preserveVideoScripts(existing = [], incoming = []) {
  const oldCounts = new Map();
  const newCounts = new Map();
  for (const item of existing) {
    const key = pieceKey(item.piece);
    if (key && isVideoPiece(item)) oldCounts.set(key, (oldCounts.get(key) || 0) + 1);
  }
  for (const item of incoming) {
    const key = pieceKey(item.piece);
    if (key && isVideoPiece(item)) newCounts.set(key, (newCounts.get(key) || 0) + 1);
  }
  const oldByKey = new Map(existing.filter(isVideoPiece).map(item => [pieceKey(item.piece), item]));
  return incoming.map(item => {
    const key = pieceKey(item.piece);
    if (!key || !isVideoPiece(item) || oldCounts.get(key) !== 1 || newCounts.get(key) !== 1) return item;
    const previous = oldByKey.get(key);
    return {
      ...item,
      scriptText: item.scriptText ?? previous.scriptText ?? '',
      scriptMode: item.scriptMode ?? previous.scriptMode ?? 'voice'
    };
  });
}
