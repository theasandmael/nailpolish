export function listsToDoc() {
  const doc = { v: 1 };
  for (const s of STATUS_ORDER) doc[s] = [];
  for (const [key, s] of state.lists) { const p = BY_KEY.get(key); if (p && doc[s]) doc[s].push(`${p.id}|${p.brand.name}|${p.name}`); }
  return doc;
}