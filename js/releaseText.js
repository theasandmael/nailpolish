export function releaseText(p) {
  const m = p.month && p.month >= 1 && p.month <= 12
    ? new Date(2000, p.month - 1, 1).toLocaleString(undefined, { month: "long" }) : null;
  if (m && p.year) return `${m} ${p.year}`;
  return m || (p.year ? String(p.year) : null);
}