"""Builds dbs/catalog.json + dbs/details/<brand#>.json from jsonDB/*.json and dbs/brands.json.
Run from the repo root:  python3 tools/build_catalog.py
Mirrors the app's CatalogParser so both versions read the data the same way."""
import json, re, glob, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KNOWN = ["Black","Blue","Brown","Clear","Gold","Gray","Green","Orange","Pink","Purple","Red","Silver","White","Yellow"]
LOOK = {c.lower(): c for c in KNOWN}
ALIAS = {"holo":"holographic","flakie":"flakes","top":"top coat","glow":"glow in the dark"}

def txt(v):
    """A string, or None for null/NaN/empty values."""
    return v.strip() or None if isinstance(v, str) else None
def lst(raw):
    return [t.strip() for t in (raw or "").split(",") if t.strip()]
def colors(raw):
    seen, o = set(), []
    for t in lst(raw):
        c = LOOK.get(t.lower())
        if c and c not in seen: seen.add(c); o.append(c)
    return o
def finishes(raw):
    seen, o = set(), []
    for t in lst(raw):
        f = t.lower()
        if f in LOOK: continue
        f = ALIAS.get(f, f)
        if f not in seen: seen.add(f); o.append(f)
    return sorted(o)
def images(raw):
    o = []
    for t in (raw or "").split(", "):
        t = t.strip()
        if t.startswith("http") and re.search(r"\.(jpe?g|png|webp|gif|avif|heic)", t, re.I) and t not in o:
            o.append(t)
    return o
def local_logo(raw):
    """A bare name like "anlac" refers to a file in resources/ (any of svg/png/webp/avif/jpg/jpeg/gif)."""
    t = (raw or "").strip()
    if not t or t.startswith("http"): return None
    d = os.path.join(ROOT, "resources")
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        stem, ext = os.path.splitext(f)
        if stem.lower() == os.path.splitext(t)[0].lower() and ext.lower() in (".svg", ".png", ".webp", ".avif", ".jpg", ".jpeg", ".gif"):
            return "resources/" + f
    return None
def web(raw):
    t = (raw or "").strip()
    return t if t.startswith("http") else None
def num(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def idlist(raw):
    o = []
    for t in lst(raw):
        v = num(t)
        if v is not None and v >= 0 and v == int(v) and int(v) not in o: o.append(int(v))
    return o
def stock(raw):
    r = (raw or "").strip().lower()
    return 1 if r == "in stock" else 0 if r == "out of stock" else None
def clean(raw):
    t = raw or ""
    t = re.sub(r"<[^>]+>", " ", t); t = html.unescape(t.replace("&nbsp;", " "))
    t = re.sub(r"[ \t]{2,}", " ", t).strip()
    return t or None
def month(raw):
    t = str(raw or "").strip().lower()
    if not t: return None
    v = num(t)
    if v is not None: return int(v) if 1 <= v <= 12 and v == int(v) else None
    names = ["january","february","march","april","may","june","july","august","september","october","november","december"]
    if len(t) >= 3:
        for i, n in enumerate(names):
            if n.startswith(t): return i + 1
    return None
def bottle(raw):
    t = str(raw or "").lower().replace(",", ".")
    m = re.search(r"\d+(\.\d+)?", t)
    if not m: return None
    v = float(m.group()); after = t[m.end():].strip()
    if after.startswith(("oz", "fl")): v *= 29.5735
    return round(v, 2) if v > 0 else None
def hexcolor(raw):
    s = (raw or "").strip().lstrip("#")
    return "#" + s.lower() if re.fullmatch(r"[0-9a-fA-F]{6}", s) else None


bj = json.load(open(os.path.join(ROOT, "dbs", "brands.json"), encoding="utf-8"))["brands"]
brands = {}
for d in bj:
    name = d["brand"].strip()
    brands[name.lower()] = {
        "name": name, "bottle": bottle(d.get("bottle_size")), "website": web(d.get("website")),
        "logo": web(d.get("logo")) or local_logo(d.get("logo")), "bgc": hexcolor(d.get("bgc")),
        "country": txt(d.get("country")),
        "ig": txt(d.get("IG")) or txt(d.get("ig")),
        "fb": txt(d.get("FB_group")) or txt(d.get("fb")),
    }

recs = []
for f in sorted(glob.glob(os.path.join(ROOT, "jsonDB", "*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    recs += d["polishes"] if isinstance(d, dict) else d
recs.sort(key=lambda r: ((r.get("brand") or "").lower(), (r.get("name") or "").lower()))

bnames, bidx, rows, extra, seen = [], {}, [], {}, set()
for r in recs:
    pid = num(r.get("id"))
    if pid is None or int(pid) in seen: continue
    pid = int(pid); seen.add(pid)
    raw = (r.get("brand") or "Unknown brand").strip()
    b = brands.get(raw.lower()); disp = b["name"] if b else raw
    if disp not in bidx:
        bidx[disp] = len(bnames); bnames.append(disp)
    ctype = (r.get("collection_type") or "").strip(); ctype = None if (not ctype or num(ctype) is not None) else ctype
    year = num(r.get("release_year")); year = int(year) if year and 1980 <= year <= 2100 else None
    price = num(r.get("price")); price = round(price, 2) if price and price > 0 else None
    ps = (r.get("status") or "").strip().lower()
    imgs = images(r.get("image_urls"))
    rows.append([
        pid, bidx[disp], (r.get("name") or "").strip() or "Unnamed", (r.get("collection") or "").strip() or None, year,
        colors(r.get("base_color")), colors(r.get("other_colors")), finishes(r.get("finish")), ctype, price, None,
        stock(r.get("stock_status")), ps if ps in ("reg", "disc", "le") else None, (imgs or [None])[0],
        web(r.get("url")), idlist(str(r.get("dupes") or "")), month(r.get("release_month")),
    ])
    extra.setdefault(bidx[disp], {})[pid] = [clean(r.get("description")), imgs[:20]]
bl = []
for n in bnames:
    b = brands.get(n.lower(), {"name": n})
    bl.append({k: b.get(k) for k in ("name", "bottle", "website", "logo", "bgc", "country", "ig", "fb")})
out = os.path.join(ROOT, "dbs")
json.dump({"brands": bl, "polishes": rows}, open(os.path.join(out, "catalog.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
import shutil
shutil.rmtree(os.path.join(out, "details"), ignore_errors=True); os.makedirs(os.path.join(out, "details"))
if os.path.exists(os.path.join(out, "details.json")): os.remove(os.path.join(out, "details.json"))
for bi, d in extra.items():   # one small file per brand; loaded when a polish from that brand is opened
    json.dump(d, open(os.path.join(out, "details", f"{bi}.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print(len(bl), "brands,", len(rows), "polishes")
