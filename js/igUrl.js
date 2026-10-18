export function igUrl(raw) {
  let v = (raw || "").trim(); if (!v) return null;
  if (/^https?:/i.test(v)) return v;
  if (/instagram\.com/i.test(v)) return "https://" + v.replace(/^\/+/, "");
  v = v.replace(/^[@/]+|\/+$/g, ""); return v ? "https://www.instagram.com/" + v : null;
}