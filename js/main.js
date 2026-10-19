"use strict";
/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
function svg(inner, cls) {
  const t = document.createElement("template");
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${inner}</svg>`;
  return t.content.firstChild;
}
const ICON = {
  stash: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  wishlist: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10Z"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6"/><path d="M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>',
  destash: '<path d="M4 7h16"/><path d="M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M9 7V4h6v3"/><path d="M12 16v-5m-2.500 2.500L12 11l2.500 2.500"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
  sort: '<path d="M7 4v16m0 0-3-3m3 3 3-3"/><path d="M17 20V4m0 0-3 3m3-3 3 3"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z"/>',
  export: '<path d="M12 15V3m0 0L8 7m4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  more: '<circle cx="5" cy="12" r="1.200"/><circle cx="12" cy="12" r="1.200"/><circle cx="19" cy="12" r="1.200"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  ext: '<path d="M7 17 17 7M9 7h8v8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.500 3 14.500 0 18M12 3c-3 3.500-3 14.500 0 18"/>',
  pin: '<path d="M12 21s7-6.100 7-11a7 7 0 1 0-14 0c0 4.900 7 11 7 11Z"/><circle cx="12" cy="10" r="2.500"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.900 4.900l1.400 1.400m11.400 11.400 1.400 1.400M2 12h2m16 0h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
  moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500Z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
  import: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20m8-16-2 16"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.500" cy="8.500" r="1.200"/>',
};
const ic = (name, cls) => svg(ICON[name], cls);
const IG_GLYPH = () => { const t = document.createElement("template");
  t.innerHTML = '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a3ab9"/><stop offset=".5" stop-color="#e1306c"/><stop offset="1" stop-color="#fcaf45"/></linearGradient></defs><rect x="2.500" y="2.500" width="19" height="19" rx="5.500" fill="none" stroke="url(#igg)" stroke-width="2"/><circle cx="12" cy="12" r="4.300" fill="none" stroke="url(#igg)" stroke-width="2"/><circle cx="17.200" cy="6.800" r="1.200" fill="url(#igg)"/></svg>';
  return t.content.firstChild; };
const FB_GLYPH = () => { const t = document.createElement("template");
  t.innerHTML = '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877f2"/><path d="M13.200 20v-6.600h2.200l.4-2.700h-2.600V8.900c0-.8.300-1.300 1.400-1.300h1.300V5.200c-.2 0-1-.1-2-.1-2 0-3.400 1.200-3.400 3.500v2.100H8.300v2.700h2.200V20h2.700Z" fill="#fff"/></svg>';
  return t.content.firstChild; };

const STATUS = {
  wishlist: { label: "Wishlist", icon: "wishlist", next: "stash" },
  stash: { label: "Stash", icon: "stash", next: "destash" },
  destash: { label: "Destash", icon: "destash", next: "archive" },
  archive: { label: "Archive", icon: "archive", next: null },
};
const STATUS_ORDER = ["wishlist", "stash", "destash", "archive"];
const SWATCH = {
  Red: "#d14545", Orange: "#e08c3d", Yellow: "#e0c740", Gold: "#d4ad47", Green: "#61b36b", Blue: "#4585d9",
  Purple: "#9466d9", Pink: "#e06bad", Brown: "#8c6145", Silver: "#c2c4cc", Gray: "#9e9e9e", White: "#f5f5f0",
  Black: "#2e2e2e", Clear: "#dbe9f2",
};
const COLOR_ORDER = ["Red","Orange","Yellow","Gold","Green","Blue","Purple","Pink","Brown","Silver","Gray","White","Black","Clear"];
const PSTATUS = { reg: "Regular", disc: "Discontinued", le: "Limited edition" };
const MONEY = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const cmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

function foldKey(t) {
  return String(t).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/['\u2019]/g, "");
}
function hashtag(t) { return foldKey(t).replace(/[^\p{L}\p{N}]/gu, ""); }
function countryText(raw) {
  const v = (raw || "").trim(); if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) {
    const code = v.toUpperCase();
    const flag = String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    let name = code; try { name = new Intl.DisplayNames(undefined, { type: "region" }).of(code) || code; } catch (e) {}
    return `${flag} ${name}`;
  }
  return v;
}
function igUrl(raw) {
  let v = (raw || "").trim(); if (!v) return null;
  if (/^https?:/i.test(v)) return v;
  if (/instagram\.com/i.test(v)) return "https://" + v.replace(/^\/+/, "");
  v = v.replace(/^[@/]+|\/+$/g, ""); return v ? "https://www.instagram.com/" + v : null;
}
function fbUrl(raw) {
  let v = (raw || "").trim(); if (!v) return null;
  if (/^https?:/i.test(v)) return v;
  if (/facebook\.com|fb\.com/i.test(v)) return "https://" + v.replace(/^\/+/, "");
  v = v.replace(/^\/+|\/+$/g, ""); return v ? "https://www.facebook.com/groups/" + v : null;
}

/* ---------- state ---------- */
const state = {
  tab: "stash", dbMode: "brands", search: "", sort: "brand",
  filters: { finishes: new Set(), colors: new Set(), inStock: false, min: "", max: "" },
  nav: [],                    // detail stack: {type:"polish",id} | {type:"brand",name}
  open: {},                   // expanded groups: key -> bool
  lists: new Map(),           // polish key -> status
  catalog: null, extra: {}, shards: {}, sel: null,   // sel: Set of polish keys while bulk-editing
};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

/* ---------- catalog ---------- */
let BRANDS = [], P = [], BY_ID = new Map(), BY_KEY = new Map();
const pkey = p => foldKey(p.brand.name + "|" + p.name);
function buildCatalog(data) {
  BRANDS = data.brands.map(b => ({ ...b, count: 0 }));
  P = data.polishes.map(r => {
    const brand = BRANDS[r[1]]; brand.count++; brand.idx = r[1];
    const p = { id: r[0], brand, name: r[2], collection: r[3], year: r[4], base: r[5], other: r[6], finishes: r[7],
      ctype: r[8], price: r[9], stock: r[11], pstatus: r[12], image: r[13], url: r[14], dupes: r[15], month: r[16] };
    p.search = foldKey(`${brand.name} ${p.name} ${p.collection || ""}`);
    p.ppm = p.price && brand.bottle ? p.price / brand.bottle : null;
    p.key = pkey(p);
    return p;
  });
  BY_ID = new Map(P.map(p => [p.id, p]));
  BY_KEY = new Map(P.map(p => [p.key, p]));
}
function matchesSearch(p, q) {
  const words = foldKey(q).split(/\s+/).filter(Boolean);
  return words.every(w => p.search.includes(w));
}
function releaseText(p) {
  const m = p.month && p.month >= 1 && p.month <= 12
    ? new Date(2000, p.month - 1, 1).toLocaleString(undefined, { month: "long" }) : null;
  if (m && p.year) return `${m} ${p.year}`;
  return m || (p.year ? String(p.year) : null);
}
const statusOf = p => state.lists.get(p.key) || null;

/* ---------- lists: private per signed-in person, else this browser ---------- */
const sync = { ready: false, db: null, ref: null, ok: false, name: "", timer: null, writing: false, dirty: false, skipEcho: 0 };
function listsToDoc() {
  const doc = { v: 1 };
  for (const s of STATUS_ORDER) doc[s] = [];
  for (const [key, s] of state.lists) { const p = BY_KEY.get(key); if (p && doc[s]) doc[s].push(`${p.id}|${p.brand.name}|${p.name}`); }
  return doc;
}
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
function saveLocal() { store.set("lists:v1", JSON.stringify(listsToDoc())); }
function loadLocal() { try { return docToLists(JSON.parse(store.get("lists:v1") || "null")); } catch (e) { return new Map(); } }
function setStatus(p, status) {
  if (status) state.lists.set(p.key, status); else state.lists.delete(p.key);
  persist(); renderAll();
}
function persist() {
  saveLocal();
  if (!sync.ok) return;
  sync.dirty = true;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(flush, 500);
}
async function flush() {
  if (sync.writing || !sync.dirty || !sync.ref) return;
  sync.writing = true; sync.dirty = false;
  try { await sync.ref.set(listsToDoc()); }
  catch (e) {
    if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) {
      sync.ok = false; renderNotice();
      toast("Your lists can't be saved to your account with this access, so they stay in this browser.");
    } else { sync.dirty = true; setTimeout(flush, 2500); }
  }
  sync.writing = false;
  if (sync.dirty) flush();
}
async function initAccount() {
  let db = null, user = null;
  try { [db, user] = await Promise.all([claude.use("db"), claude.use("user")]); } catch (e) {}
  if (user) { try { const me = await user.me(); sync.name = me.name || ""; sync.avatar = me.avatarUrl; sync.id = me.id; } catch (e) {} }
  if (!db || !sync.id) { sync.ready = true; renderNotice(); renderWho(); return; }
  try {
    sync.ref = db.doc(`data/users/${sync.id}/lists`);
    const first = await sync.ref.get();
    sync.ok = true;
    if (first.exists) {
      state.lists = docToLists(first.data());
    } else {
      const local = loadLocal();
      if (local.size) { state.lists = local; sync.dirty = true; await flush(); toast("Moved the lists saved in this browser into your account."); }
    }
    sync.ref.onSnapshot(snap => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return;
      const incoming = docToLists(snap.data());
      let same = incoming.size === state.lists.size;
      if (same) for (const [k, v] of incoming) if (state.lists.get(k) !== v) { same = false; break; }
      if (!same && !sync.writing && !sync.dirty) { state.lists = incoming; saveLocal(); renderAll(); }
    }, () => {});
  } catch (e) { sync.ok = false; }
  sync.ready = true; renderNotice(); renderWho(); renderAll();
}

/* ---------- theme ---------- */
function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode); else root.removeAttribute("data-theme");
  const b = $("#themeBtn"); b.replaceChildren(ic(mode === "dark" ? "moon" : mode === "light" ? "sun" : "auto"));
  b.title = "Theme: " + (mode || "system");
}
let themeMode = store.get("theme") || "system";
applyTheme(themeMode);
$("#backupBtn").replaceChildren(ic("export"));
$("#backupBtn").addEventListener("click", exportBackup);
$("#importBtn").replaceChildren(ic("import"));
$("#importBtn").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", e => { const fs = [...e.target.files]; e.target.value = ""; if (fs.length) importFiles(fs); });
$("#themeBtn").addEventListener("click", () => {
  themeMode = themeMode === "system" ? "light" : themeMode === "light" ? "dark" : "system";
  store.set("theme", themeMode); applyTheme(themeMode);
});

/* ---------- header bits ---------- */
function renderWho() {
  const box = $("#who"); box.replaceChildren();
  if (sync.ok) box.append(h("span", { class: "chip" }, sync.avatar ? h("img", { src: sync.avatar, alt: "" }) : null, h("span", null, sync.name || "Signed in")));
}
function renderNotice() {
  const n = $("#notice"); n.replaceChildren();
  if (sync.ready && !sync.ok) n.append(h("div", { class: "note" }, h("b", null, "Lists are saved in this browser only. "),
    typeof claude !== "undefined"
      ? "Open this page while signed in to claude.ai to keep private lists in your account that follow you across devices."
      : "Use the download button at the top to keep a backup copy."));
}
function toast(msg) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 3600);
}

/* ---------- tabs ---------- */
const TABS = [["stash", "Stash"], ["wishlist", "Wishlist"], ["database", "Database"], ["destash", "Destash"], ["archive", "Archive"]];
function renderTabs() {
  const counts = {}; for (const s of STATUS_ORDER) counts[s] = 0;
  for (const s of state.lists.values()) if (counts[s] != null) counts[s]++;
  const box = $("#tabs"); box.replaceChildren();
  for (const [id, label] of TABS) {
    const showCount = id !== "database";
    box.append(h("button", { class: "tab", role: "tab", "aria-selected": String(state.tab === id), onclick: () => switchTab(id) },
      ic(id), h("span", { class: "label" }, label),
      showCount && counts[id] ? h("span", { class: "count" }, counts[id]) : null));
  }
}
function switchTab(id) {
  exitSelect(); state.tab = id; state.nav = []; state.search = ""; state.sort = "brand";
  state.filters = { finishes: new Set(), colors: new Set(), inStock: false, min: "", max: "" };
  renderAll(); window.scrollTo({ top: 0 });
}

/* ---------- bulk edit ---------- */
function exitSelect() { state.sel = null; }
function startSelect() { state.sel = new Set(); renderAll(); }
function applyBulk(status) {
  const keys = [...state.sel];
  for (const k of keys) { if (status) state.lists.set(k, status); else state.lists.delete(k); }
  persist(); exitSelect(); renderAll();
  toast(status ? `${keys.length} moved to ${STATUS[status].label}` : `${keys.length} removed from this list`);
}
function renderBulk() {
  let bar = $("#bulk");
  if (!state.sel) { if (bar) bar.remove(); document.body.classList.remove("selecting"); return; }
  if (!bar) { bar = h("div", { id: "bulk", role: "toolbar", "aria-label": "Bulk edit" }); document.body.append(bar); }
  document.body.classList.add("selecting");
  const n = state.sel.size, inStatusTab = state.tab !== "database";
  const add = h("button", { class: "btn primary", "data-pop": "1", disabled: n ? null : true }, ic("stash"), inStatusTab ? "Move to…" : "Add to…");
  add.addEventListener("click", () => popMenu(add, STATUS_ORDER.map(s => ({ label: STATUS[s].label, icon: STATUS[s].icon, run: () => applyBulk(s) }))));
  const all = filtered(), allOn = all.length > 0 && all.every(p => state.sel.has(p.key));
  const selAll = h("button", { class: "btn", onclick: () => { allOn ? state.sel.clear() : all.forEach(p => state.sel.add(p.key)); renderContent(); renderBulk(); } }, allOn ? "Deselect all" : "Select all");
  bar.replaceChildren(add, h("span", { class: "count" }, n ? `${n} selected` : "Select polishes"), selAll,
    ...(inStatusTab ? [h("button", { class: "btn danger", disabled: n ? null : true, onclick: () => applyBulk(null) }, ic("trash"), "Remove")] : []));
}

/* ---------- popup menus ---------- */
let openPop = null;
function closePop() { if (openPop) { openPop.remove(); openPop = null; } }
document.addEventListener("click", e => { if (openPop && !openPop.contains(e.target) && !e.target.closest("[data-pop]")) closePop(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closePop(); });
function popMenu(anchorBtn, items, alignRight) {
  closePop();
  const pop = h("div", { class: "pop", role: "menu" },
    items.map(it => h("button", { role: "menuitem", "aria-checked": it.checked ? "true" : null, onclick: () => { closePop(); it.run(); } },
      it.icon ? ic(it.icon) : null, it.label, it.checked ? ic("check") : null)));
  document.body.append(pop); openPop = pop;
  const r = anchorBtn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = alignRight ? r.right - pw : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = left + "px"; pop.style.top = top + "px";
}
window.addEventListener("scroll", () => closePop(), { passive: true });

/* ---------- list data ---------- */
const parsePrice = t => { const v = parseFloat(String(t).trim().replace(",", ".")); return Number.isFinite(v) && v >= 0 ? v : null; };
function listScope() {
  if (state.nav.length && state.nav[state.nav.length - 1].type === "brand") return "brand";
  return state.tab === "database" ? "database" : state.tab;
}
function basePool() {
  const nav = state.nav[state.nav.length - 1];
  const scope = listScope();
  if (scope === "brand") return P.filter(p => p.brand.name === nav.name);
  if (scope === "database") return P;
  const want = scope === "stash" ? "stash" : scope;
  return P.filter(p => statusOf(p) === want);
}
function filtered() {
  const f = state.filters, lo = parsePrice(f.min), hi = parsePrice(f.max);
  return basePool().filter(p => {
    if (state.search && !matchesSearch(p, state.search)) return false;
    if (f.finishes.size && !p.finishes.some(x => f.finishes.has(x))) return false;
    if (f.colors.size && !p.base.some(x => f.colors.has(x))) return false;
    if (f.inStock && p.stock !== 1) return false;
    if (lo != null || hi != null) {
      if (p.price == null) return false;
      if (lo != null && p.price < lo) return false;
      if (hi != null && p.price > hi) return false;
    }
    return true;
  });
}
const filtersActive = () => { const f = state.filters; return f.finishes.size || f.colors.size || f.inStock || parsePrice(f.min) != null || parsePrice(f.max) != null; };
const collThenName = (a, b) => {
  const ca = a.collection || "", cb = b.collection || "";
  if (ca !== cb) { if (!ca) return 1; if (!cb) return -1; return cmp(ca, cb); }
  return cmp(a.name, b.name);
};
const brandCollName = (a, b) => cmp(a.brand.name, b.brand.name) || collThenName(a, b);

function groupsFor(items) {
  const map = new Map();
  const add = (k, p) => { if (!map.has(k)) map.set(k, []); map.get(k).push(p); };
  for (const p of items) {
    switch (state.sort) {
      case "brand": add(p.brand.name, p); break;
      case "color": if (p.base.length) p.base.forEach(c => add(c, p)); else add("Uncategorized Color", p); break;
      case "finish": if (p.finishes.length) p.finishes.forEach(f => add(f.replace(/\b\w/g, c => c.toUpperCase()), p)); else add("Unspecified Finish", p); break;
      case "collectionType": add(p.ctype || "Unspecified Type", p); break;
      case "collection": add(p.collection || "Uncategorized Collection", p); break;
    }
  }
  const out = [...map].map(([title, ps]) => ({ title, polishes: state.sort === "brand" ? ps.sort(collThenName) : ps.sort(brandCollName) }));
  if (state.sort === "color") out.sort((a, b) => (COLOR_ORDER.indexOf(a.title) + 99 * (COLOR_ORDER.indexOf(a.title) < 0)) - (COLOR_ORDER.indexOf(b.title) + 99 * (COLOR_ORDER.indexOf(b.title) < 0)));
  else out.sort((a, b) => cmp(a.title, b.title));
  return out;
}
function splitCollections(items, collapseSingles) {
  const map = new Map(), loose = [];
  for (const p of items) { if (p.collection) { if (!map.has(p.collection)) map.set(p.collection, []); map.get(p.collection).push(p); } else loose.push(p); }
  if (collapseSingles) for (const [k, v] of [...map]) if (v.length === 1) { loose.push(v[0]); map.delete(k); }
  loose.sort(collThenName);
  return { groups: [...map].sort((a, b) => cmp(a[0], b[0])), loose };
}

/* ---------- thumbnails ---------- */
function thumb(p, size = 46) {
  const stroke = p.base.length ? SWATCH[p.base[0]] : null;
  const el = h("div", { class: "thumb", style: `width:${size}px;height:${size}px;${stroke ? `border-color:${stroke}` : ""}` });
  const swatch = () => { el.className = "thumb"; el.style.background = stroke || ""; el.replaceChildren(stroke ? "" : h("span", { class: "q" }, "?")); };
  const logo = () => {
    if (!p.brand.logo) return swatch();
    el.className = "thumb logo"; el.style.background = p.brand.bgc || "#000";
    el.replaceChildren(h("img", { src: p.brand.logo, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: swatch }));
  };
  if (p.image) el.append(h("img", { src: p.image, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: logo }));
  else logo();
  return el;
}
function brandThumb(b, size = 46) {
  const el = h("div", { class: "thumb logo", style: `width:${size}px;height:${size}px;background:${b.bgc || "#000"};border-color:var(--line)` });
  const initial = () => { el.className = "thumb"; el.style.background = "var(--surface-2)"; el.replaceChildren(h("span", { class: "q", style: "font-weight:700" }, b.name.slice(0, 2))); };
  if (b.logo) el.append(h("img", { src: b.logo, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: initial })); else initial();
  return el;
}

/* ---------- rows ---------- */
function polishRow(p, opts) {
  const strong = state.tab === "destash" && listScope() === "destash";
  const side = h("div", { class: "side" + (strong ? " strong" : "") },
    p.price != null ? h("span", { class: "price" }, MONEY.format(p.price)) : null,
    p.ppm != null ? h("span", { class: "perml" }, MONEY.format(p.ppm) + "/mL") : null,
    statusOf(p) ? h("span", { class: "tag" }, ic(STATUS[statusOf(p)].icon), STATUS[statusOf(p)].label) : null,
    p.pstatus === "disc" ? h("span", { class: "tag" }, "Discontinued") : null);
  const picking = !!state.sel;
  const main = h("button", { class: "main", onclick: picking ? () => togglePick(p, wrap) : () => openPolish(p) },
    picking ? h("span", { class: "chk", "aria-hidden": "true" }, ic("check")) : null,
    thumb(p),
    h("div", { class: "txt" },
      opts.showBrand ? h("div", { class: "br" }, p.brand.name) : null,
      h("div", { class: "nm" }, p.name),
      p.collection ? h("div", { class: "co" }, p.collection) : null,
      p.finishes.length ? h("div", { class: "fi" }, p.finishes.join(" · ")) : null),
    side);
  const wrap = h("div", { class: "row" + (picking && state.sel.has(p.key) ? " picked" : "") }, main);
  if (picking) { main.setAttribute("aria-pressed", String(state.sel.has(p.key))); return wrap; }
  const more = h("button", { class: "more", "data-pop": "1", "aria-label": "Move " + p.name, onclick: e => { e.stopPropagation(); rowMenu(more, p); } }, ic("more"));
  wrap.append(h("span", { class: "anchor" }, more));
  return wrap;
}
function togglePick(p, row) {
  const on = !state.sel.has(p.key);
  on ? state.sel.add(p.key) : state.sel.delete(p.key);
  row.classList.toggle("picked", on); row.querySelector(".main").setAttribute("aria-pressed", String(on));
  renderBulk();
}
function rowMenu(btn, p) {
  const cur = statusOf(p), items = [];
  const nx = cur && STATUS[cur].next;
  if (nx) items.push({ icon: STATUS[nx].icon, label: "Move to " + STATUS[nx].label, run: () => setStatus(p, nx) });
  for (const s of STATUS_ORDER) if (s !== cur && s !== nx) items.push({ icon: STATUS[s].icon, label: (cur ? "Move to " : "Add to ") + STATUS[s].label, run: () => setStatus(p, s) });
  if (cur) items.push({ icon: "trash", label: "Remove from lists", run: () => setStatus(p, null) });
  popMenu(btn, items, true);
}

/* ---------- main list ---------- */
function groupOpen(key, defaultOpen) { return key in state.open ? state.open[key] : defaultOpen; }
function toggleGroup(key, defaultOpen) { state.open[key] = !groupOpen(key, defaultOpen); renderContent(); }

function renderList(items) {
  const frag = document.createDocumentFragment();
  const inBrand = listScope() === "brand";
  const statusList = state.tab !== "database" && !inBrand;
  const bigDefaultCollapsed = items.length > 250;
  const showBrand = !inBrand && state.sort !== "brand";

  const collectionBlocks = (ps, scope) => {
    const box = document.createDocumentFragment();
    const { groups, loose } = splitCollections(ps, statusList);
    for (const [name, list] of groups) {
      const k = `c|${scope}|${name}`, open = groupOpen(k, true);
      box.append(h("div", { class: "sub" },
        h("button", { class: "subhead", "aria-expanded": String(open), onclick: () => toggleGroup(k, true) }, ic("chev", "chev"), h("span", null, name), h("span", { class: "n" }, list.length))));
      if (open) list.forEach(p => box.append(polishRow(p, { showBrand: false })));
    }
    loose.forEach(p => box.append(polishRow(p, { showBrand: false })));
    return box;
  };

  if (inBrand) {
    const card = h("div", { class: "card" });
    card.append(collectionBlocks(items.sort(collThenName), "brand"));
    frag.append(card);
  } else {
    for (const g of groupsFor(items)) {
      const k = `g|${state.tab}|${state.sort}|${g.title}`, open = groupOpen(k, !bigDefaultCollapsed);
      const card = h("div", { class: "card" },
        h("button", { class: "ghead", "aria-expanded": String(open), onclick: () => toggleGroup(k, !bigDefaultCollapsed) },
          state.sort === "color" && SWATCH[g.title] ? h("span", { class: "sw", style: `background:${SWATCH[g.title]}` }) : null,
          ic("chev", "chev"), h("span", { class: "gt" }, g.title), h("span", { class: "n" }, g.polishes.length)));
      if (open) {
        if (state.sort === "brand") card.append(collectionBlocks(g.polishes, g.title));
        else g.polishes.forEach(p => card.append(polishRow(p, { showBrand })));
      }
      frag.append(card);
    }
  }
  return frag;
}

function emptyMessage() {
  if (state.search || filtersActive()) return ["No matches", "Try fewer words or clear the filters."];
  switch (state.tab) {
    case "stash": return ["Your stash is empty", "Open a polish in the Database and add it to your stash."];
    case "wishlist": return ["Your wishlist is empty", "Add polishes you want from the Database."];
    case "destash": return ["Nothing to destash", "Move polishes here when you plan to sell them."];
    case "archive": return ["Archive is empty", "Destashed polishes can be moved here."];
    default: return ["Nothing here", ""];
  }
}

function renderBar() {
  const box = $("#bar"); box.replaceChildren();
  if (state.nav.length && state.nav[state.nav.length - 1].type === "polish") return;
  const inBrand = listScope() === "brand";
  const showBrandsGrid = state.tab === "database" && state.dbMode === "brands" && !inBrand;

  const input = h("input", { id: "q", type: "search", placeholder: window.matchMedia("(max-width: 600px)").matches ? "Search" : "Search brand, shade or collection", value: state.search, "aria-label": "Search" });  let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.search = input.value; renderContent(); renderBulk(); }, 140); });
  const bar = h("div", { class: "bar" }, h("label", { class: "search" }, ic("search"), input));

  if (state.tab === "database" && !inBrand) {
    bar.append(h("div", { class: "seg", role: "group" },
      h("button", { "aria-pressed": String(state.dbMode === "brands"), onclick: () => { state.dbMode = "brands"; renderAll(); } }, "Brands"),
      h("button", { "aria-pressed": String(state.dbMode === "polishes"), onclick: () => { state.dbMode = "polishes"; renderAll(); } }, "Polishes")));
  }
  if (!showBrandsGrid) {
    if (!inBrand) {
      const SORTS = [["brand", "Brand", "tag"], ["color", "Color", "database"], ["finish", "Finish", "sort"], ["collection", "Collection", "stash"], ["collectionType", "Collection Type", "archive"]];
      const sortLabel = "Sort: " + SORTS.find(s => s[0] === state.sort)[1];
      const sb = h("button", { class: "btn", "data-pop": "1", "aria-label": sortLabel, title: sortLabel }, ic("sort"), h("span", { class: "lbl" }, sortLabel));
      sb.addEventListener("click", () => popMenu(sb, SORTS.map(s => ({ label: s[1], checked: state.sort === s[0], run: () => { state.sort = s[0]; renderAll(); } }))));
      bar.append(h("span", { class: "anchor" }, sb));
    }
    bar.append(h("button", { class: "btn" + (filtersActive() ? " on" : ""), "aria-label": "Filter", title: "Filter", onclick: openFilters }, ic("filter"), h("span", { class: "lbl" }, "Filter")));
    const selLabel = state.sel ? "Done" : "Select";
    bar.append(h("button", { class: "btn" + (state.sel ? " on" : ""), "aria-label": selLabel + " (bulk edit)", title: selLabel, onclick: () => { if (state.sel) { exitSelect(); renderAll(); } else startSelect(); } }, ic("check"), h("span", { class: "lbl" }, selLabel)));
    if (["stash", "wishlist", "destash"].includes(state.tab) && !inBrand)
      bar.append(h("button", { class: "btn", "aria-label": "Download this list as CSV", title: "Download this list as CSV", onclick: exportCsv }, ic("export"), h("span", { class: "lbl" }, "CSV")));
  }
  box.append(bar);
}

function renderContent() {
  const box = $("#content"); box.replaceChildren();
  if (!state.catalog) { box.append(h("div", { class: "loading" }, "Loading the catalog…")); return; }
  const nav = state.nav[state.nav.length - 1];
  if (nav && nav.type === "polish") { box.append(polishDetail(BY_ID.get(nav.id))); return; }

  if (nav && nav.type === "brand") box.append(brandHeader(BRANDS.find(b => b.name === nav.name)));
  else if (state.tab === "database" && state.dbMode === "brands") { renderBrandList(box); return; }

  const items = filtered();
  const total = items.reduce((s, p) => s + (p.price || 0), 0);
  const parts = [h("span", null, h("b", null, items.length), items.length === 1 ? " polish" : " polishes")];
  if (["stash", "wishlist", "destash", "archive"].includes(state.tab) && !nav && total > 0) parts.push(h("span", null, "Total value ", h("b", null, MONEY.format(total))));
  box.append(h("div", { class: "summary" }, parts));
  if (!items.length) { const [a, b] = emptyMessage(); box.append(h("div", { class: "empty" }, h("b", null, a), b)); return; }
  box.append(renderList(items));
}

function renderBrandList(box) {
  let list = BRANDS.slice();
  if (state.search) {
    const words = foldKey(state.search).split(/\s+/).filter(Boolean);
    const hits = P.filter(p => words.every(w => p.search.includes(w)));
    if (!hits.length) { box.append(h("div", { class: "empty" }, h("b", null, "No matches"), "Try fewer words.")); return; }
    const byBrand = new Map(); hits.forEach(p => { if (!byBrand.has(p.brand.name)) byBrand.set(p.brand.name, []); byBrand.get(p.brand.name).push(p); });
    box.append(h("div", { class: "summary" }, h("span", null, h("b", null, hits.length), hits.length === 1 ? " polish" : " polishes", ` in ${byBrand.size} brand${byBrand.size === 1 ? "" : "s"}`)));
    for (const [name, ps] of [...byBrand].sort((a, b) => cmp(a[0], b[0]))) {
      const card = h("div", { class: "card" }, h("button", { class: "ghead", "aria-expanded": "true", onclick: () => openBrand(name) }, h("span", { class: "gt" }, name), h("span", { class: "n" }, ps.length)));
      ps.sort(collThenName).slice(0, 40).forEach(p => card.append(polishRow(p, { showBrand: false })));
      if (ps.length > 40) card.append(h("div", { class: "row" }, h("button", { class: "link", onclick: () => openBrand(name) }, `See all ${ps.length} in ${name}`)));
      box.append(card);
    }
    return;
  }
  box.append(h("div", { class: "summary" }, h("span", null, h("b", null, list.length), " brands")));
  list.sort((a, b) => cmp(a.name, b.name));
  const card = h("div", { class: "card" });
  for (const b of list) card.append(h("button", { class: "brandrow", onclick: () => openBrand(b.name) },
    brandThumb(b), h("div", null, h("div", { class: "nm" }, b.name), h("div", { class: "sub2" }, [`${b.count} polish${b.count === 1 ? "" : "es"}`, countryText(b.country)].filter(Boolean).join(" · "))), ic("chev", "chev")));
  box.append(card);
}

function renderAll() {
  const nav = state.nav[state.nav.length - 1];
  if (state.sel && ((nav && nav.type === "polish") || (state.tab === "database" && state.dbMode === "brands" && !nav))) exitSelect();
  renderTabs(); renderBar(); renderContent(); renderBulk();
}

/* ---------- navigation ---------- */
function openPolish(p) { state.nav.push({ type: "polish", id: p.id }); renderAll(); window.scrollTo({ top: 0 }); loadExtra(p); }
function openBrand(name) {
  state.nav.push({ type: "brand", name });
  state.search = ""; state.filters = { finishes: new Set(), colors: new Set(), inStock: false, min: "", max: "" };
  renderAll(); window.scrollTo({ top: 0 });
}
function back() { state.nav.pop(); renderAll(); }

/* ---------- brand header ---------- */
function brandHeader(b) {
  const frag = document.createDocumentFragment();
  frag.append(h("div", { class: "backbar" }, h("button", { class: "btn", onclick: back }, ic("back"), "Back")));
  const country = countryText(b.country);
  frag.append(h("div", { class: "bhead" }, brandThumb(b, 64), h("div", null, h("h2", null, b.name),
    h("div", { class: "meta" }, [`${b.count} polish${b.count === 1 ? "" : "es"}`, country].filter(Boolean).join(" · ")))));
  const links = h("div", { class: "socials" });
  if (b.website) links.append(h("a", { class: "soc", href: b.website, target: "_blank", rel: "noopener" }, ic("globe"), "Website"));
  const ig = igUrl(b.ig), fb = fbUrl(b.fb);
  if (ig) links.append(h("a", { class: "soc", href: ig, target: "_blank", rel: "noopener" }, IG_GLYPH(), "Instagram"));
  if (fb) links.append(h("a", { class: "soc", href: fb, target: "_blank", rel: "noopener" }, FB_GLYPH(), "Facebook group"));
  if (links.children.length) frag.append(links);
  return frag;
}

/* ---------- polish detail ---------- */
function loadExtra(p) {
  // Photos and descriptions live in one small file per brand, fetched the first time a polish from it is opened.
  const bi = p.brand.idx;
  if (state.shards[bi]) return;
  state.shards[bi] = "loading"; renderContent();
  fetch(`dbs/details/${bi}.json`).then(r => r.json())
    .then(d => { Object.assign(state.extra, d); state.shards[bi] = "done"; renderContent(); })
    .catch(() => { state.shards[bi] = "done"; renderContent(); });
}
function photoUrls(p) {
  const ex = state.extra[p.id];
  const urls = ex && ex[1] && ex[1].length ? ex[1] : (p.image ? [p.image] : []);
  return urls;
}
function gallery(urls, fallbackEl) {
  const wrap = h("div", { class: "gallery" });
  const n = urls.length, loop = n > 1;
  const pages = loop ? [urls[n - 1], ...urls, urls[0]] : urls;
  let failures = 0;
  const track = h("div", { class: "track", tabindex: "0", "aria-label": "Photos" },
    pages.map((u, i) => {
      const slide = h("div", { class: "slide" });
      slide.append(h("img", { src: u, alt: "", referrerpolicy: "no-referrer", onerror: () => {
        slide.replaceChildren(h("div", { class: "nophoto" }, "Photo unavailable")); failures++;
        if (failures >= pages.length && fallbackEl) wrap.replaceWith(fallbackEl);
      } }));
      return slide;
    }));
  wrap.append(track);
  if (!loop) return wrap;
  const dots = h("div", { class: "dots" }, urls.map(() => h("i")));
  const mark = i => [...dots.children].forEach((d, j) => d.classList.toggle("on", j === i));
  const jump = i => { track.style.scrollSnapType = "none"; track.scrollLeft = i * track.clientWidth; requestAnimationFrame(() => { track.style.scrollSnapType = ""; }); };
  let timer;
  const settle = () => {
    const w = track.clientWidth || 1, i = Math.round(track.scrollLeft / w);
    if (i === 0) { jump(n); mark(n - 1); } else if (i === n + 1) { jump(1); mark(0); } else mark(i - 1);
  };
  track.addEventListener("scroll", () => { clearTimeout(timer); timer = setTimeout(settle, 90); }, { passive: true });
  const step = dir => track.scrollBy({ left: dir * track.clientWidth, behavior: "smooth" });
  track.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); step(1); } if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); } });
  wrap.append(h("button", { class: "arrow l", "aria-label": "Previous photo", onclick: () => step(-1) }, ic("back")),
    h("button", { class: "arrow r", "aria-label": "Next photo", onclick: () => step(1) }, ic("chev")), dots);
  mark(0);
  requestAnimationFrame(() => requestAnimationFrame(() => jump(1)));
  return wrap;
}
function kv(k, v) { return h("div", { class: "kv" }, h("span", null, k), h("span", null, v)); }

function polishDetail(p) {
  const el = h("div", { class: "detail" });
  if (!p) return el;
  el.append(h("div", { class: "backbar" }, h("button", { class: "btn", onclick: back }, ic("back"), "Back")));
  el.append(h("h2", null, p.name));
  el.append(h("p", { class: "by" }, "by ", h("button", { onclick: () => { state.nav = state.nav.filter(n => n.type !== "polish"); const t = state.nav[state.nav.length - 1]; if (t && t.type === "brand" && t.name === p.brand.name) { renderAll(); window.scrollTo({ top: 0 }); } else openBrand(p.brand.name); } }, p.brand.name)));

  const cur = statusOf(p);
  el.append(h("div", { class: "status-pick" }, STATUS_ORDER.map(s =>
    h("button", { "aria-pressed": String(cur === s), onclick: () => setStatus(p, cur === s ? null : s) }, ic(STATUS[s].icon), STATUS[s].label))));

  const swatch = h("div", { class: "bigsw", style: `background:${p.base.length ? SWATCH[p.base[0]] : "var(--surface-2)"}` }, p.base.length ? null : h("span", { class: "q" }, "No photo"));
  const urls = photoUrls(p);
  if (urls.length) el.append(gallery(urls, swatch));
  else if (state.shards[p.brand.idx] === "loading") el.append(h("div", { class: "bigsw" }, h("span", { class: "q" }, "Loading photos…")));
  else el.append(swatch);

  const details = h("div", { class: "panel" }, h("h3", null, "Details"), kv("Brand", p.brand.name));
  if (p.collection) details.append(kv("Collection", p.collection));
  const rel = releaseText(p); if (rel) details.append(kv("Released", rel));
  if (p.pstatus) details.append(kv("Availability", PSTATUS[p.pstatus]));
  if (p.base.length) details.append(kv("Base color", [h("i", { class: "sw", style: `background:${SWATCH[p.base[0]]}` }), p.base.join(", ")]));
  if (p.other.length) details.append(kv("Accent colors", p.other.join(", ")));
  if (p.finishes.length) details.append(kv("Finishes", p.finishes.map(f => f.replace(/\b\w/g, c => c.toUpperCase())).join(", ")));
  if (p.ctype) details.append(kv("Collection type", p.ctype));
  if (p.brand.bottle) details.append(kv("Bottle size", `${+p.brand.bottle.toFixed(1)} mL`));
  if (p.price != null) details.append(kv("Price", MONEY.format(p.price)));
  if (p.ppm != null) details.append(kv("Price per mL", MONEY.format(p.ppm)));
  el.append(details);

  const ex = state.extra[p.id];
  if (ex && ex[0]) el.append(h("div", { class: "panel" }, h("h3", null, "About"), h("div", { class: "about" }, ex[0])));

  // Instagram: hashtag pages open in the Instagram app; a keyword-search address does not.
  const b = hashtag(p.brand.name), n = hashtag(p.name), tags = [];
  for (const t of [b + n, n, b]) if (t && !tags.includes(t)) tags.push(t);
  if (tags.length) el.append(h("div", { class: "panel" }, h("h3", null, "Find more swatches on Instagram"),
    h("div", { class: "tagrow" }, tags.map(t => h("a", { href: `https://www.instagram.com/explore/tags/${encodeURIComponent(t)}/`, target: "_blank", rel: "noopener" }, "#" + t)))));

  const buy = h("div", { class: "panel" }, h("h3", null, "Where to buy"));
  if (p.url || p.price != null || p.stock != null) {
    const inner = [h("div", null, h("div", { style: "font-weight:600" }, p.brand.name), p.url ? h("div", { class: "br", style: "font-size:12px;color:var(--muted)" }, "Open the shop page") : null), h("span", { style: "margin-left:auto;text-align:right" },
      p.price != null ? h("div", null, MONEY.format(p.price)) : null,
      p.stock === 1 ? h("div", { class: "in", style: "color:var(--good);font-size:12px" }, "In stock") : p.stock === 0 ? h("div", { style: "color:var(--bad);font-size:12px" }, "Out of stock") : null)];
    buy.append(p.url ? h("a", { class: "linkrow", href: p.url, target: "_blank", rel: "noopener" }, inner, ic("ext", "ext")) : h("div", { class: "linkrow" }, inner));
  } else buy.append(h("div", { class: "kv" }, h("span", null, "No listings")));
  el.append(buy);

  const dupes = p.dupes.map(id => BY_ID.get(id)).filter(d => d && d !== p);
  if (dupes.length) {
    const panel = h("div", { class: "panel" }, h("h3", null, "Dupes"));
    dupes.forEach(d => panel.append(h("div", { class: "row", style: "border-top:0;border-top:1px solid var(--line)" }, h("button", { class: "main", onclick: () => { state.nav[state.nav.length - 1] = { type: "polish", id: d.id }; renderAll(); window.scrollTo({ top: 0 }); } },
      thumb(d, 40), h("div", { class: "txt" }, h("div", { class: "nm" }, d.name), h("div", { class: "br" }, d.brand.name)), d.price != null ? h("div", { class: "side" }, h("span", { class: "price" }, MONEY.format(d.price))) : null))));
    el.append(panel);
  }
  return el;
}

/* ---------- filter sheet ---------- */
function openFilters() {
  const layer = $("#layer"); layer.replaceChildren();
  const f = state.filters;
  const pool = basePool();
  const finishes = [...new Set(pool.flatMap(p => p.finishes))].sort(cmp);
  const present = new Set(pool.flatMap(p => p.base));
  const colors = [...COLOR_ORDER.filter(c => present.has(c)), ...[...present].filter(c => !COLOR_ORDER.includes(c)).sort(cmp)];
  const close = () => { layer.replaceChildren(); renderAll(); };
  const clear = h("button", { class: "btn", onclick: () => { state.filters = { finishes: new Set(), colors: new Set(), inStock: false, min: "", max: "" }; openFilters(); } }, "Clear filters");
  if (!filtersActive()) clear.setAttribute("disabled", "");

  const opt = (label, set, value, sw) => {
    const b = h("button", { class: "opt", "aria-pressed": String(set.has(value)) }, sw ? h("i", { class: "sw", style: `background:${sw}` }) : null, label, ic("check", "ck"));
    b.addEventListener("click", () => { set.has(value) ? set.delete(value) : set.add(value); b.setAttribute("aria-pressed", String(set.has(value))); });
    return b;
  };
  const group = (title, set, items, swatchOf) => {
    const d = h("details", null, h("summary", null, title, set.size ? h("span", { class: "dot" }) : null),
      items.length ? items.map(v => opt(v.replace(/\b\w/g, c => c.toUpperCase()), set, v, swatchOf && swatchOf(v))) : h("div", { class: "kv" }, h("span", null, "Nothing recorded yet")));
    return d;   // collapsed by default
  };
  const stock = h("input", { class: "switch", type: "checkbox", id: "fstock", checked: f.inStock || null });
  stock.addEventListener("change", () => { f.inStock = stock.checked; });
  const min = h("input", { type: "text", inputmode: "decimal", placeholder: "Min", value: f.min, "aria-label": "Minimum price" });
  const max = h("input", { type: "text", inputmode: "decimal", placeholder: "Max", value: f.max, "aria-label": "Maximum price" });
  min.addEventListener("input", () => { f.min = min.value; }); max.addEventListener("input", () => { f.max = max.value; });

  const sheet = h("div", { class: "sheet", role: "dialog", "aria-label": "Filter" },
    h("div", { class: "hd" }, clear, h("b", null, "Filter"), h("button", { class: "btn primary", onclick: close }, "Done")),
    h("div", { class: "field" }, h("label", { for: "fstock" }, "In stock only", stock)),
    h("div", { class: "field" }, h("div", { style: "font-weight:600;margin-bottom:8px" }, "Price (USD)"), h("div", { class: "pricein" }, min, h("span", { style: "color:var(--muted)" }, "to"), max),
      h("div", { class: "hint" }, "Polishes with no listed price are hidden while a price filter is on.")),
    group("Finish", f.finishes, finishes),
    group("Color", f.colors, colors, v => SWATCH[v]));
  const back = h("div", { class: "sheet-back", onclick: e => { if (e.target === back) close(); } }, sheet);
  layer.append(back);
}

/* ---------- CSV export ---------- */
function csvField(v) { v = String(v ?? ""); return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
const csvHeader = ["ID", "Brand", "Name", "Collection", "Collection Type", "Released", "Base Colors", "Accent Colors", "Finishes", "Price", "Price per mL", "Stock", "Product Status", "Link"];
const csvRow = p => [p.id, p.brand.name, p.name, p.collection || "", p.ctype || "", releaseText(p) || "", p.base.join(", "), p.other.join(", "),
  p.finishes.map(f => f.replace(/\b\w/g, c => c.toUpperCase())).join(", "), p.price != null ? p.price.toFixed(2) : "", p.ppm != null ? p.ppm.toFixed(2) : "",
  p.stock === 1 ? "In stock" : p.stock === 0 ? "Out of stock" : "", p.pstatus ? PSTATUS[p.pstatus] : "", p.url || ""];
const csvText = list => String.fromCharCode(0xFEFF) + [csvHeader, ...list.map(csvRow)].map(r => r.map(csvField).join(",")).join("\r\n") + "\r\n";
const listOf = s => P.filter(p => statusOf(p) === s).sort((a, b) => cmp(a.brand.name, b.brand.name) || cmp(a.name, b.name));
const today = () => new Date().toISOString().slice(0, 10);

// Saves a file: through Claude's download prompt when the page runs inside claude.ai, otherwise a normal browser download.
async function saveFile(filename, data) {
  let dl = null; try { dl = await claude.use("downloads"); } catch (e) {}
  if (dl) {
    try { await dl.save({ filename, data }); } catch (e) { if (!e || e.code !== "declined") toast("Couldn't save the file."); }
    return;
  }
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const a = h("a", { href: url, download: filename }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function exportCsv() {
  const list = listOf(state.tab);
  if (!list.length) { toast("This list is empty."); return; }
  await saveFile(`${STATUS[state.tab].label}-${today()}.csv`, csvText(list));
}
/* ---------- import (local file) ---------- */
function parseCsv(text) {
  const rows = []; let row = [], f = "", q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function statusFromName(name) {
  const n = name.toLowerCase();
  return ["destash", "wishlist", "archive", "stash"].find(s => n.includes(s)) || null;   // "destash" before "stash"
}
// Reads one CSV exported by this page (ID, Brand, Name, ...) and puts each polish it can find on that list.
function importCsv(text, status, tally) {
  const rows = parseCsv(text); if (rows.length < 2) return;
  const head = rows[0].map(x => x.trim().toLowerCase());
  const iId = head.indexOf("id"), iBrand = head.indexOf("brand"), iName = head.indexOf("name");
  if (iBrand < 0 || iName < 0) { tally.bad++; return; }
  for (const r of rows.slice(1)) {
    const p = BY_KEY.get(foldKey((r[iBrand] || "").trim() + "|" + (r[iName] || "").trim()))
      || (iId >= 0 && BY_ID.get(Number(r[iId])) && foldKey(BY_ID.get(Number(r[iId])).name) === foldKey((r[iName] || "").trim()) ? BY_ID.get(Number(r[iId])) : null);
    if (p) { state.lists.set(p.key, status); tally.ok++; } else tally.miss++;
  }
}
async function importFiles(files) {
  const tally = { ok: 0, miss: 0, bad: 0 };
  const fallback = ["stash", "wishlist", "destash", "archive"].includes(state.tab) ? state.tab : "stash";
  try {
    for (const file of files) {
      if (/\.zip$/i.test(file.name)) {
        if (typeof JSZip === "undefined") { toast("The import tool didn't load. Check your connection and reload."); return; }
        const zip = await JSZip.loadAsync(file);
        for (const entry of Object.values(zip.files)) {
          if (entry.dir || !/\.csv$/i.test(entry.name) || /__MACOSX/.test(entry.name)) continue;
          importCsv(await entry.async("string"), statusFromName(entry.name) || fallback, tally);
        }
      } else importCsv(await file.text(), statusFromName(file.name) || fallback, tally);
    }
  } catch (e) { toast("Couldn't read that file."); return; }
  if (tally.ok) { persist(); renderAll(); }
  const parts = [tally.ok ? `Imported ${tally.ok} polish${tally.ok === 1 ? "" : "es"}` : "Nothing imported"];
  if (tally.miss) parts.push(`${tally.miss} not found in the catalog`);
  if (tally.bad) parts.push(`${tally.bad} file${tally.bad === 1 ? "" : "s"} weren't in the expected format`);
  toast(parts.join(" · "));
}
async function exportBackup() {
  if (typeof JSZip === "undefined") { toast("The backup tool didn't load. Check your connection and reload."); return; }
  const zip = new JSZip(); let n = 0;
  for (const s of STATUS_ORDER) { const list = listOf(s); if (list.length) { zip.file(`${s}.csv`, csvText(list)); n += list.length; } }
  if (!n) { toast("Your lists are empty, so there's nothing to back up."); return; }
  await saveFile(`polish-backup-${today()}.zip`, await zip.generateAsync({ type: "blob" }));
}

/* ---------- start ---------- */
async function start() {
  state.lists = loadLocal();                  // placeholder until the catalog is read; re-resolved below
  let data;
  try { data = await (await fetch("dbs/catalog.json")).json(); }
  catch (e) { $("#content").replaceChildren(h("div", { class: "empty" }, h("b", null, "The catalog didn't load"), "Reload the page to try again.")); return; }
  buildCatalog(data);
  state.catalog = true;
  state.lists = loadLocal();
  renderNotice(); renderAll();
  initAccount();
}
start();
