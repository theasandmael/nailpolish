function docToLists(doc) {
  const m = new Map();
  for (const s of STATUS_ORDER) for (const entry of (doc && doc[s]) || []) {
    const [id, brand, ...rest] = String(entry).split("|");
    const name = rest.join("|");
    const byName = BY_KEY.get(foldKey(brand + "|" + name));
    const byId = BY_ID.get(Number(id));
    const p = byName || (byId && foldKey(byId.name) === foldKey(name) ? byId : null);
    if (p) m.set(p.key, s);
  }
  return m;
}