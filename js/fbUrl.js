function fbUrl(raw) {
  let v = (raw || "").trim(); if (!v) return null;
  if (/^https?:/i.test(v)) return v;
  if (/facebook\.com|fb\.com/i.test(v)) return "https://" + v.replace(/^\/+/, "");
  v = v.replace(/^\/+|\/+$/g, ""); return v ? "https://www.facebook.com/groups/" + v : null;
}