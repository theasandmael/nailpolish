export function matchesSearch(p, q) {
  const words = foldKey(q).split(/\s+/).filter(Boolean);
  return words.every(w => p.search.includes(w));
}