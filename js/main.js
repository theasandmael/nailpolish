"use strict";

import { applyTheme } from './applyTheme.js';
import { buildCatalog } from './buildCatalog.js';
import { countryText } from './countryText.js';
import { docToLists } from './docToLists.js';
import { exportPolishDataAsZip } from './exportPolishDataAsZip.js';
import { fbUrl } from './fbUrl.js';
import { flush } from './flush.js';
import { foldKey } from './foldKey.js';
import { h } from './h.js';
import { hashtag } from './hashtag.js';
import { igUrl } from './igUrl.js';
import { initAccount } from './initAccount.js';
import { listsToDoc } from './listsToDoc.js';
import { loadLocal } from './loadLocal.js';
import { matchesSearch } from './matchesSearch.js';
import { persist } from './persist.js';
import { releaseText } from './releaseText.js';
import { saveLocal } from './saveLocal.js';
import { setStatus } from './setStatus.js';
import { svg } from './svg.js';


// Expose functions globally if required by inline HTML (like onclick attributes)
window.applyTheme = applyTheme;
window.exportPolishDataAsZip = exportPolishDataAsZip;

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);

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
  hash: '<path d="M5 9h14M5 15h14M10 4 8 20m8-16-2 16"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.500" cy="8.500" r="1.200"/>',
};

// Make ic globally available if helper files reference it
window.ic = (name, cls) => {
  const t = document.createElement("template");
  t.innerHTML = `<svg class="${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;
  return t.content.firstChild;
};

const IG_GLYPH = () => { 
  const t = document.createElement("template");
  t.innerHTML = '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a3ab9"/><stop offset=".5" stop-color="#e1306c"/><stop offset="1" stop-color="#fcaf45"/></linearGradient></defs><rect x="2.500" y="2.500" width="19" height="19" rx="5.500" fill="none" stroke="url(#igg)" stroke-width="2"/><circle cx="12" cy="12" r="4.300" fill="none" stroke="url(#igg)" stroke-width="2"/><circle cx="17.200" cy="6.800" r="1.200" fill="url(#igg)"/></svg>';
  return t.content.firstChild; 
};

const FB_GLYPH = () => { 
  const t = document.createElement("template");
  t.innerHTML = '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#1877f2"/><path d="M13.200 20v-6.600h2.200l.4-2.700h-2.600V8.900c0-.8.300-1.300 1.400-1.300h1.300V5.200c-.2 0-1-.1-2-.1-2 0-3.400 1.200-3.400 3.500v2.100H8.300v2.700h2.200V20h2.700Z" fill="#fff"/></svg>';
  return t.content.firstChild; 
};

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

/* ---------- state ---------- */
const state = {
  tab: "stash", dbMode: "brands", search: "", sort: "brand",
  filters: { finishes: new Set(), colors: new Set(), inStock: false, min: "", max: "" },
  nav: [],                    
  open: {},                   
  lists: new Map(),           
  catalog: null, extra: null, extraLoading: null,
};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

/* ---------- catalog ---------- */
let BRANDS = [], P = [], BY_ID = new Map(), BY_KEY = new Map();
const pkey = p => foldKey(p.brand.name + "|" + p.name);
const statusOf = p => state.lists.get(p.key) || null;

/* ---------- theme ---------- */
let themeMode = store.get("theme") || "system";
applyTheme(themeMode);
$("#themeBtn").addEventListener("click", () => {
  themeMode = themeMode === "system" ? "light" : themeMode === "light" ? "dark" : "system";
  store.set("theme", themeMode); applyTheme(themeMode);
});

// App startup logic...
async function start() {
  state.lists = loadLocal();                  
  let data;
  try { data = await (await fetch("dbs/brands.json")).json(); }
  catch (e) { $("#content").replaceChildren(h("div", { class: "empty" }, h("b", null, "The catalog didn't load"), "Reload the page to try again.")); return; }
  
  // buildCatalog imported or defined globally
  if (typeof buildCatalog === "function") {
    buildCatalog(data);
  }
  state.catalog = true;
  state.lists = loadLocal();
  renderNotice(); 
  renderAll();
  initAccount();
}

start();