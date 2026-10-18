export function foldKey(t) {
  return String(t).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/['\u2019]/g, "");
}