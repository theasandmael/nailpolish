export function countryText(raw) {
  const v = (raw || "").trim(); if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) {
    const code = v.toUpperCase();
    const flag = String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    let name = code; try { name = new Intl.DisplayNames(undefined, { type: "region" }).of(code) || code; } catch (e) {}
    return `${flag} ${name}`;
  }
  return v;
}