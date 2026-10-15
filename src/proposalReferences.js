export function visibleProposalReferences(references) {
  return (Array.isArray(references) ? references : []).filter(ref =>
    ref && [ref.url, ref.title, ref.note, ref.pillar].some(value => String(value || '').trim())
  );
}
