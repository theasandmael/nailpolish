import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.parse
from bs4 import BeautifulSoup

try:
    from curl_cffi import requests
    USE_CURL_CFFI = True
except ImportError:
    import requests
    USE_CURL_CFFI = False

# Import extraction logic and color/finish maps from extractDesc.py
try:
    import extractDesc
    from extractDesc import (
        COLOR_MAP,
        FINISH_MAP,
        FINISH_PATTERNS,
        standardize_finish,
        extract_base_color,
        extract_other_colors,
        extract_raw_finish,
        clean_html
    )
    HAS_EXTRACT_DESC = True
except ImportError:
    HAS_EXTRACT_DESC = False

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

CSV_FIELDNAMES = [
    "id", "brand", "name", "collection", "release_year", "release_month",
    "base_color", "other_colors", "finish", "collection_type", "price",
    "description", "stock_status", "status", "image_urls", "url"
]

RE_COLLAB_PATTERNS = [
    (re.compile(r"\b(?:PPU|Polish\s*Pick\s*Up)\b", re.I), "PPU"),
    (re.compile(r"\b(?:HHC|Hella\s*Handmade\s*Creations)\b", re.I), "HHC"),
    (re.compile(r"\b(?:LBOH|Little\s*Box\s*of\s*Horrors)\b", re.I), "LBOH"),
    (re.compile(r"\b(?:PGB|Polished\s*Gamers\s*Box)\b", re.I), "PGB"),
    (re.compile(r"\b(?:Rewind|PPU\s*Rewind)\b", re.I), "PPU Rewind"),
]

RE_MONTH_NAME = re.compile(
    r"\b(january|february|march|april|may|june|july|august|september|october|november|december|"
    r"jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b",
    re.I
)
RE_YEAR = re.compile(r"\b(20\d{2}|\d{2})\b")

MONTH_MAP = {
    "jan": "01", "january": "01",
    "feb": "02", "february": "02",
    "mar": "03", "march": "03",
    "apr": "04", "april": "04",
    "may": "05",
    "jun": "06", "june": "06",
    "jul": "07", "july": "07",
    "aug": "08", "august": "08",
    "sep": "09", "sept": "09", "september": "09",
    "oct": "10", "october": "10",
    "nov": "11", "november": "11",
    "dec": "12", "december": "12"
}


def clean_and_sort_colors(color_list):
    """Capitalizes and sorts color names alphabetically."""
    if not color_list:
        return []
    cleaned = set()
    for c in color_list:
        c_clean = c.strip().title()
        if c_clean:
            cleaned.add(c_clean)
    return sorted(list(cleaned))


def format_finish_list(raw_finish):
    """Cleans, title-cases, sorts alphabetically, and formats finishes into a comma-separated list."""
    if not raw_finish:
        return ""

    if HAS_EXTRACT_DESC:
        std_finish = standardize_finish(raw_finish)
    else:
        std_finish = raw_finish

    finishes = set()
    for part in re.split(r"[,/&+\s]+", std_finish):
        part_clean = part.strip().title()
        if part_clean:
            finishes.add(part_clean)

    return ", ".join(sorted(list(finishes)))


def extract_dates_from_text(text):
    """Extracts 4-digit release year and 2-digit numeric month from a string."""
    year_str, month_str = "", ""
    if not text:
        return year_str, month_str

    m_year = RE_YEAR.search(text)
    if m_year:
        found_year = m_year.group(1)
        year_str = found_year if len(found_year) == 4 else f"20{found_year}"

    m_month = RE_MONTH_NAME.search(text)
    if m_month:
        month_key = m_month.group(1).lower()
        month_str = MONTH_MAP.get(month_key, "")

    return year_str, month_str


def clean_collection_name(name):
    """Removes the word 'Collection' (case-insensitive) while preserving parenthetical text."""
    if not name:
        return ""
    cleaned = re.sub(r"(?i)\bcollection\b", "", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"^[\s\-:_,\.]+|[\s\-:_,\.]+$", "", cleaned)
    return cleaned


def format_collab_collection(collection_name, release_year="", release_month=""):
    """
    Formats collaboration collection titles (PPU, HHC, LBOH, etc.) into 'PREFIX - YYYY/MM'
    and returns both the formatted collection name and the collection_type string.
    """
    if not collection_name:
        return "", ""

    matched_prefix = None
    for pattern, prefix in RE_COLLAB_PATTERNS:
        if pattern.search(collection_name):
            matched_prefix = prefix
            break

    if not matched_prefix:
        return clean_collection_name(collection_name), ""

    year_str, month_str = extract_dates_from_text(collection_name)
    if not year_str and release_year:
        year_str = str(release_year)
    if not month_str and release_month:
        month_str = str(release_month).zfill(2)

    if year_str and month_str:
        formatted_name = f"{matched_prefix} - {year_str}/{month_str}"
    elif year_str:
        formatted_name = f"{matched_prefix} - {year_str}"
    else:
        formatted_name = matched_prefix

    return formatted_name, matched_prefix


def fetch_url(url, params=None, retries=3, delay=2):
    """Sends HTTP requests with Chrome impersonation, redirects, and retry backoff on timeouts."""
    kwargs = {
        "headers": HEADERS,
        "params": params,
        "timeout": 15,
        "allow_redirects": True,
    }

    for attempt in range(1, retries + 1):
        try:
            if USE_CURL_CFFI:
                return requests.get(url, impersonate="chrome120", **kwargs)
            else:
                return requests.get(url, **kwargs)
        except Exception as e:
            if attempt < retries:
                time.sleep(delay * attempt)
            else:
                raise e


def detect_platform(url):
    """Accurately detects store engine by checking domain, root endpoints, DOM, and scripts."""
    parsed = urllib.parse.urlparse(url)
    domain = f"{parsed.scheme}://{parsed.netloc}"

    if "lacquertracker.com" in parsed.netloc.lower():
        return "lacquertracker", url

    for shopify_path in ["/products.json?limit=1", "/collections/all/products.json?limit=1"]:
        try:
            r = fetch_url(f"{domain}{shopify_path}", retries=1)
            if r.status_code == 200 and "products" in r.json():
                return "shopify", domain
        except Exception:
            pass

    try:
        r = fetch_url(f"{domain}/products.json", retries=1)
        if r.status_code == 200 and isinstance(r.json(), list):
            return "bigcartel", domain
    except Exception:
        pass

    try:
        r = fetch_url(f"{domain}/wp-json/wp/v2/product?per_page=1", retries=1)
        if r.status_code == 200 and isinstance(r.json(), list):
            return "woocommerce", domain
    except Exception:
        pass

    try:
        r = fetch_url(f"{url}?format=json", retries=1)
        if r.status_code == 200 and "items" in r.json():
            return "squarespace", url
    except Exception:
        pass

    try:
        r = fetch_url(url, retries=1)
        if r.status_code == 200:
            content = r.text.lower()
            if "wixstatic.com" in content or "wix-stores" in content or "_wix" in content:
                return "wix", url
            if "app.ecwid.com" in content or "ecwid" in content:
                return "ecwid", url
    except Exception:
        pass

    return "html_generic", url


def extract_lacquertracker_details(detail_url, max_retries=3):
    """Fetches detail page for a polish on Lacquer Tracker with robust color tag & DOM parsing."""
    details = {
        "base_color": "",
        "other_colors": "",
        "finish": "",
        "image_url": "",
        "description": ""
    }
    if not detail_url:
        return details

    response = None
    for attempt in range(1, max_retries + 1):
        try:
            response = fetch_url(detail_url, retries=1)
            if response and response.status_code == 200:
                break
        except Exception as e:
            if attempt < max_retries:
                print(f"   [Retry {attempt}/{max_retries}] Timeout/Error fetching detail page. Retrying in {2 * attempt}s...")
                time.sleep(2 * attempt)
            else:
                print(f"   Warning: Could not extract detail page after {max_retries} attempts ({e})")
                return details

    if not response or response.status_code != 200:
        return details

    try:
        soup = BeautifulSoup(response.text, "html.parser")

        # 1. Gallery Image URL Extraction (Ignores questionmark.png placeholder)
        img_urls = []
        gallery_imgs = soup.select(".gallery img, .photos img, .gallery-container img, ul.gallery li img")

        if not gallery_imgs:
            gallery_imgs = soup.select('img[src*="/images/polish/"], img[src*="/photos/"], img.polish-photo')

        for img in gallery_imgs:
            src = img.get("src") or img.get("data-src") or ""
            if src and "questionmark.png" not in src.lower():
                full_src = src if src.startswith("http") else f"https://www.lacquertracker.com{src}"
                if full_src not in img_urls:
                    img_urls.append(full_src)

        details["image_url"] = ", ".join(img_urls)

        # 2. Description Extraction
        desc_el = soup.select_one(".description, #description, .polish-description, [id*='desc']")
        desc = desc_el.get_text(strip=True) if desc_el else ""
        details["description"] = desc

        # 3. Direct Color Extraction from Lacquer Tracker DOM
        extracted_colors = []

        page_text = soup.get_text()
        color_match = re.search(r"Colou?rs?:\s*([^\n\r\t]+)", page_text, re.I)
        if color_match:
            raw_color_str = color_match.group(1).strip()
            raw_color_str = re.split(r"(?:Type|Finish|Add|Code|User|\n)", raw_color_str, flags=re.I)[0].strip()
            for part in raw_color_str.split(","):
                c_clean = part.strip()
                if c_clean:
                    extracted_colors.append(c_clean)

        if not extracted_colors:
            color_links = soup.select('a[href*="/color/"], a[href*="/colors/"]')
            for cl in color_links:
                c_text = cl.get_text(strip=True)
                if c_text:
                    extracted_colors.append(c_text)

        sorted_colors = clean_and_sort_colors(extracted_colors)

        if sorted_colors:
            details["base_color"] = sorted_colors[0]
            if len(sorted_colors) > 1:
                details["other_colors"] = ", ".join(sorted_colors[1:])
        elif HAS_EXTRACT_DESC and desc:
            base_col = extract_base_color(desc)
            oth_col = extract_other_colors(desc, base_col)
            details["base_color"] = base_col.title() if base_col else ""
            details["other_colors"] = ", ".join(clean_and_sort_colors(oth_col.split(","))) if oth_col else ""

        # 4. Extract Finish
        finish_text = ""
        type_match = re.search(r"(?:Type|Finish):\s*([^\n\r\t]+)", page_text, re.I)
        if type_match:
            raw_finish_str = type_match.group(1).strip()
            finish_text = re.split(r"(?:Add|Code|User|\n)", raw_finish_str, flags=re.I)[0].strip()

        if not finish_text:
            finish_links = soup.select('a[href*="/finish/"], a[href*="/finishes/"], a[href*="/type/"]')
            if finish_links:
                finish_text = ", ".join([fl.get_text(strip=True) for fl in finish_links if fl.get_text(strip=True)])

        if HAS_EXTRACT_DESC and desc and not finish_text:
            raw_f = extract_raw_finish(desc, [])
            finish_text = raw_f if raw_f else finish_text

        details["finish"] = format_finish_list(finish_text)

    except Exception as e:
        print(f"   Warning: Error parsing detail DOM ({e})")

    return details


def scrape_lacquertracker(url):
    """Scrapes polishes from Lacquer Tracker brand/listing page and formats to jsonToCsv schema."""
    all_products = []

    try:
        res = fetch_url(url, retries=3)
    except Exception as e:
        print(f"Failed to fetch Lacquer Tracker URL: {e}")
        return []

    if res.status_code != 200:
        print(f"Failed to fetch Lacquer Tracker URL (Status Code: {res.status_code})")
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    table = soup.find("table")
    if not table:
        print("No polish table found on Lacquer Tracker page.")
        return []

    rows = table.find_all("tr")[1:]  # Skip header row
    total = len(rows)
    print(f"Found {total} polishes on Lacquer Tracker page. Fetching detail data...")

    for idx, row in enumerate(rows, start=1):
        cols = row.find_all("td")
        if len(cols) < 2:
            continue

        name_tag = cols[0].find("a")
        name = name_tag.get_text(strip=True) if name_tag else cols[0].get_text(strip=True)
        link = f"https://www.lacquertracker.com{name_tag['href']}" if name_tag and name_tag.has_attr("href") else ""

        brand = cols[1].get_text(strip=True) if len(cols) > 1 else ""
        raw_collection = cols[2].get_text(strip=True) if len(cols) > 2 else ""

        table_color = cols[3].get_text(strip=True) if len(cols) > 3 else ""
        table_finish = cols[4].get_text(strip=True) if len(cols) > 4 else ""

        print(f"[{idx}/{total}] Scraping: {name}")
        details = extract_lacquertracker_details(link)

        # Standardize finish
        raw_finish_combined = details["finish"] or table_finish
        clean_finish = format_finish_list(raw_finish_combined)

        # Base and secondary colors
        table_colors_sorted = clean_and_sort_colors(table_color.split(",")) if table_color else []
        base_color = details["base_color"] or (table_colors_sorted[0] if table_colors_sorted else "")
        other_colors = details["other_colors"] or (", ".join(table_colors_sorted[1:]) if len(table_colors_sorted) > 1 else "")

        # Extract dates from raw collection and format
        rel_year, rel_month = extract_dates_from_text(raw_collection)
        if not rel_year or not rel_month:
            desc_year, desc_month = extract_dates_from_text(details["description"])
            rel_year = rel_year or desc_year
            rel_month = rel_month or desc_month

        collection, collection_type = format_collab_collection(raw_collection, release_year=rel_year, release_month=rel_month)

        all_products.append({
            "id": "",
            "brand": brand,
            "name": name,
            "collection": collection,
            "release_year": rel_year,
            "release_month": rel_month,
            "base_color": base_color,
            "other_colors": other_colors,
            "finish": clean_finish,
            "collection_type": collection_type,
            "price": "",
            "description": details["description"],
            "stock_status": "",
            "status": "reg",
            "image_urls": details["image_url"],
            "url": link,
            "handle": link.rstrip("/").split("/")[-1] if link else "",
            "product_type": "nail polish",
            "variants": [{"price": "0.00", "available": True, "in_stock": True}],
            "images": [{"src": details["image_url"]}] if details["image_url"] else []
        })

        time.sleep(0.4)

    return all_products


def scrape_ecwid(url):
    all_products = []
    res = fetch_url(url)
    if res.status_code != 200:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    cards = soup.select(
        '.grid-product, .ec-store__product-card, .grid__item, '
        'div[class*="product-grid-item"], div[class*="productCard"]'
    )

    if not cards:
        cards = soup.select('a[href*="/product/"], a[href*="/shop/"]')

    for idx, card in enumerate(cards, start=1):
        title_el = card.select_one(
            '.grid-product__title, .ec-store__product-title, '
            'h3, h4, [class*="title"], [class*="name"]'
        )
        if not title_el:
            continue

        title = title_el.text.strip()
        link_el = card if card.name == 'a' else card.select_one('a')
        link = link_el.get('href', '') if link_el else ''
        handle = link.rstrip('/').split('/')[-1] if link else ""

        price_el = card.select_one(
            '.grid-product__price, .ec-store__product-price, '
            '[class*="price"], .price'
        )
        price = "0.00"
        if price_el:
            clean_p = re.sub(r"[^\d.]", "", price_el.text.strip())
            if clean_p:
                price = clean_p

        img_el = card.select_one('img')
        img_src = img_el.get("src") or img_el.get("data-src") or "" if img_el else ""

        all_products.append({
            "id": None,
            "title": title,
            "name": title,
            "handle": handle,
            "body_html": "",
            "vendor": urllib.parse.urlparse(url).netloc,
            "brand": urllib.parse.urlparse(url).netloc,
            "product_type": "nail polish",
            "variants": [{
                "id": None,
                "title": "Default Title",
                "sku": handle,
                "available": True,
                "in_stock": True,
                "price": price
            }],
            "images": [{"id": idx, "position": 1, "src": img_src}] if img_src else [],
            "image_urls": img_src,
            "url": link
        })

    print(f"Retrieved {len(all_products)} products from Ecwid store.")
    return all_products


def scrape_wix_page(url):
    all_products = []
    res = fetch_url(url)
    if res.status_code != 200:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    cards = soup.select(
        '[data-hook="product-item-root"], [data-hook="product-item"], '
        'li[data-hook="grid-item"], div[data-hook="product-list-grid-item"]'
    )

    if not cards:
        cards = soup.select('a[href*="/product-page/"], [data-hook*="product-item"]')

    seen_links = set()
    for idx, card in enumerate(cards, start=1):
        title_el = card.select_one('[data-hook="product-item-name"], [data-hook="product-item-title"], h3, h4') if card.name != 'a' else None
        if not title_el:
            continue

        title = title_el.text.strip()
        link_el = card if card.name == 'a' else card.select_one('a[href*="/product-page/"]') or card.select_one('a')
        link = link_el.get('href', '') if link_el else ''
        if link:
            link = urllib.parse.urljoin(url, link)
        if link in seen_links:
            continue
        seen_links.add(link)
        handle = link.rstrip('/').split('/')[-1] if link else ""

        price_el = card.select_one('[data-hook="product-item-price-to-pay"], [data-hook="product-item-price"], span')
        price = "0.00"
        if price_el:
            clean_p = re.sub(r"[^\d.]", "", price_el.text.strip())
            if clean_p:
                price = clean_p
        if price == "0.00":
            card_prices = re.findall(r"\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)", card.get_text(" ", strip=True))
            if card_prices:
                price = card_prices[-1].replace(",", "")

        out_of_stock = card.select_one('[data-hook="product-item-out-of-stock-ribbon"]')
        in_stock = out_of_stock is None

        img_el = card.select_one('img')
        img_src = img_el.get("src") or img_el.get("data-src") or "" if img_el else ""
        if img_src:
            img_src = urllib.parse.urljoin(url, img_src)

        all_products.append({
            "id": None,
            "title": title,
            "name": title,
            "handle": handle,
            "body_html": "",
            "vendor": urllib.parse.urlparse(url).netloc,
            "brand": urllib.parse.urlparse(url).netloc,
            "product_type": "nail polish",
            "variants": [{
                "id": None,
                "title": "Default Title",
                "sku": handle,
                "available": in_stock,
                "in_stock": in_stock,
                "price": price
            }],
            "images": [{"id": idx, "position": 1, "src": img_src}] if img_src else [],
            "image_urls": img_src,
            "url": link
        })

    # Wix Store Gallery is a React widget and is sometimes emitted as plain product
    # links without data-hook card markup. Parse the nearest product card instead.
    if not all_products:
        for idx, link_el in enumerate(soup.select('a[href*="/product-page/"]'), start=1):
            link = urllib.parse.urljoin(url, link_el.get("href", "").split("?", 1)[0])
            if not link or link in seen_links:
                continue

            card = link_el
            card_text = ""
            img_el = None
            for ancestor in link_el.parents:
                if getattr(ancestor, "name", None) in ("body", "html"):
                    break
                candidate_img = ancestor.select_one("img")
                candidate_text = ancestor.get_text(" ", strip=True)
                if candidate_img and candidate_text:
                    card = ancestor
                    card_text = candidate_text
                    img_el = candidate_img
                    if "$" in candidate_text or "Price" in candidate_text:
                        break

            title_el = card.select_one('[data-hook="product-item-name"], [data-hook="product-item-title"], h3, h4')
            title = title_el.get_text(" ", strip=True) if title_el else ""
            if not title:
                title = link_el.get("aria-label") or link_el.get("title") or ""
            if not title:
                title = re.sub(r"[-_]+", " ", urllib.parse.urlparse(link).path.rstrip("/").split("/")[-1]).strip()
                title = title.title()

            card_text = re.sub(r"\s+", " ", card_text)
            card_text = re.sub(r"^(?:Quick\s*View\s*)+", "", card_text, flags=re.I)
            for label in ("Regular Price", "Sale Price", "New Scents!", "Surprise Restock!", "Price"):
                card_text = card_text.replace(label, "")

            if title.lower() not in card_text.lower():
                title_match = re.sub(r"\s+", " ", title).strip()
                card_text = title_match
            else:
                price_match = re.findall(r"\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)", card_text)
                card_text = card_text.replace(title, "", 1).strip()
                title_match = title

            prices = re.findall(r"\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)", soup.get_text(" ", strip=True) if not card_text else card_text)
            if not prices:
                prices = re.findall(r"\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)", title_el.get_text(" ", strip=True) if title_el else "")
            price = prices[-1].replace(",", "") if prices else "0.00"

            img_src = ""
            if img_el:
                img_src = img_el.get("src") or img_el.get("data-src") or ""
                img_src = urllib.parse.urljoin(url, img_src) if img_src else ""

            lower_card = card.get_text(" ", strip=True).lower()
            in_stock = not any(marker in lower_card for marker in ("out of stock", "sold out"))
            handle = urllib.parse.urlparse(link).path.rstrip("/").split("/")[-1]
            seen_links.add(link)

            all_products.append({
                "id": None,
                "title": title,
                "name": title,
                "handle": handle,
                "body_html": "",
                "vendor": urllib.parse.urlparse(url).netloc,
                "brand": urllib.parse.urlparse(url).netloc,
                "product_type": "nail polish",
                "variants": [{
                    "id": None,
                    "title": "Default Title",
                    "sku": handle,
                    "available": in_stock,
                    "in_stock": in_stock,
                    "price": price
                }],
                "images": [{"id": idx, "position": 1, "src": img_src}] if img_src else [],
                "image_urls": img_src,
                "url": link
            })

    print(f"Retrieved {len(all_products)} products from Wix store.")
    return all_products


def scrape_wix(url):
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    query.pop("page", None)

    all_products = []
    seen_urls = set()
    page_number = 1
    while page_number <= 100:
        page_query = dict(query)
        if page_number > 1:
            page_query["page"] = [str(page_number)]
        query_string = urllib.parse.urlencode(page_query, doseq=True)
        page_url = urllib.parse.urlunparse(parsed._replace(query=query_string))

        page_products = scrape_wix_page(page_url)
        new_products = [product for product in page_products if product["url"] not in seen_urls]
        if page_number > 1 and not new_products:
            break

        all_products.extend(new_products)
        seen_urls.update(product["url"] for product in new_products)

        if len(page_products) == 0 or len(page_products) < 20:
            break
        page_number += 1

    print(f"Retrieved {len(all_products)} unique products across Wix pages.")
    return all_products


def scrape_bigcartel(domain):
    all_products = []
    res = fetch_url(f"{domain}/products.json")
    if res.status_code != 200:
        return []

    try:
        raw_products = res.json()
    except Exception:
        return []

    for item in raw_products:
        title = item.get("name", "")
        handle = item.get("url", "").rstrip("/").split("/")[-1]

        variants = []
        for idx, option in enumerate(item.get("options", []), start=1):
            variants.append({
                "id": option.get("id"),
                "title": option.get("name", "Default Title"),
                "sku": option.get("code", handle),
                "available": not option.get("sold_out", False),
                "in_stock": not option.get("sold_out", False),
                "price": f"{option.get('price', 0.0):.2f}"
            })

        images = []
        img_urls = []
        for idx, img in enumerate(item.get("images", []), start=1):
            src = img.get("url", "")
            if src:
                images.append({"id": idx, "position": idx, "src": src})
                img_urls.append(src)

        all_products.append({
            "id": item.get("id"),
            "title": title,
            "name": title,
            "handle": handle,
            "body_html": item.get("description", ""),
            "vendor": urllib.parse.urlparse(domain).netloc,
            "brand": urllib.parse.urlparse(domain).netloc,
            "product_type": "nail polish",
            "variants": variants,
            "images": images,
            "image_urls": ", ".join(img_urls),
            "url": f"{domain}/product/{handle}"
        })

    print(f"Retrieved {len(all_products)} products from BigCartel API.")
    return all_products


def scrape_shopify(domain):
    all_products = []
    page = 1
    while True:
        url = f"{domain}/products.json?limit=250&page={page}"
        res = fetch_url(url)
        if res.status_code != 200:
            break

        try:
            products = res.json().get("products", [])
        except Exception:
            break

        if not products:
            break

        for p in products:
            p["name"] = p.get("title", "")
            p["brand"] = p.get("vendor", "")
            img_list = [i.get("src", "") for i in p.get("images", []) if i.get("src")]
            p["image_urls"] = ", ".join(img_list)
            p["url"] = f"{domain}/products/{p.get('handle', '')}"
            for v in p.get("variants", []):
                v["in_stock"] = v.get("available", False)

        all_products.extend(products)
        print(f"Retrieved {len(products)} products from Shopify API page {page}")
        page += 1
        time.sleep(0.5)

    return all_products


def scrape_woocommerce(domain):
    all_products = []
    page = 1
    while True:
        res = fetch_url(f"{domain}/wp-json/wp/v2/product", params={"per_page": 100, "page": page})
        if res.status_code != 200:
            break

        try:
            products = res.json()
        except Exception:
            break

        if not products or not isinstance(products, list):
            break

        for p in products:
            p["name"] = p.get("name", "")
            p["brand"] = urllib.parse.urlparse(domain).netloc
            p["url"] = p.get("link", "")

        all_products.extend(products)
        total_pages = int(res.headers.get("X-WP-TotalPages", 1))
        print(f"Retrieved {len(products)} products from WooCommerce page {page}/{total_pages}")

        if page >= total_pages:
            break
        page += 1
        time.sleep(0.5)

    return all_products


def parse_sqsp_dimensions(img_data):
    orig = img_data.get("originalSize")
    if isinstance(orig, dict):
        return orig.get("width"), orig.get("height")
    elif isinstance(orig, str) and "x" in orig:
        try:
            parts = orig.split("x")
            return int(parts[0]), int(parts[1])
        except ValueError:
            pass
    return None, None


def scrape_squarespace(url):
    res = fetch_url(f"{url}?format=json")
    if res.status_code != 200:
        return []

    items = res.json().get("items", [])
    formatted = []
    for item in items:
        title = item.get("title", "")
        handle = item.get("urlId", "")
        body_html = item.get("body", "")

        variants = []
        for idx, var in enumerate(item.get("variants", []), start=1):
            price_cents = var.get("price", 0)
            qty = var.get("qtyInStock", 0)
            sold_out = item.get("soldOut", False)
            in_stock = (not sold_out) and (qty > 0 or qty is None)
            variants.append({
                "id": var.get("id"),
                "title": var.get("attributes", {}).get("Title", "Default Title"),
                "sku": var.get("sku", handle),
                "available": in_stock,
                "in_stock": in_stock,
                "price": f"{(price_cents / 100):.2f}",
                "position": idx
            })

        images_data = item.get("items", []) or item.get("media", [])
        if not images_data and item.get("assetUrl"):
            images_data = [{"assetUrl": item.get("assetUrl")}]

        images = []
        img_urls = []
        for idx, img in enumerate(images_data, start=1):
            if isinstance(img, dict):
                src = img.get("assetUrl") or img.get("url", "")
                w, h = parse_sqsp_dimensions(img)
                if src:
                    images.append({"id": img.get("id", idx), "position": idx, "src": src, "width": w, "height": h})
                    img_urls.append(src)

        formatted.append({
            "id": item.get("id"),
            "title": title,
            "name": title,
            "handle": handle,
            "body_html": body_html,
            "vendor": "Squarespace Store",
            "brand": "Squarespace Store",
            "product_type": "nail polish",
            "variants": variants,
            "images": images,
            "image_urls": ", ".join(img_urls),
            "url": f"{url.rstrip('/')}/{handle}"
        })

    return formatted


def scrape_html_generic(url):
    all_products = []
    res = fetch_url(url)
    if res.status_code != 200:
        print(f"Failed to fetch page (Status Code: {res.status_code})")
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    cards = soup.select(
        ".card, article.card, .productCard, .productGrid .product, "
        "li.product, .product-grid-item, .product-item, .productGrid li, "
        ".product-list-thumb, .product-tile, .product-card, a.product-list-link, "
        "ul.products-list > li, div.product-list-container > a, .product, .grid-item"
    )

    for idx, card in enumerate(cards, start=1):
        title_el = card.select_one(
            ".card-title a, .productCard-title a, h4.card-title, "
            ".card-title, .product-title a, .product-item-title a, "
            ".product-list-thumb-name, .product-name, h3, h4"
        ) or card

        title = title_el.text.strip()
        link = card.get("href") or (title_el.get("href") if title_el else "")
        handle = link.rstrip("/").split("/")[-1] if link else ""

        price_el = card.select_one(
            ".price--withoutTax, .price--main, .price, .productCard-price, "
            ".price-section .price, .product-price, .product-list-thumb-price"
        )
        price = "0.00"
        if price_el:
            clean_p = re.sub(r"[^\d.]", "", price_el.text.strip())
            if clean_p:
                price = clean_p

        out_of_stock = card.select_one(
            ".out-of-stock, .badge--outOfStock, .card-figcaption-button--outOfStock, "
            ".product-list-thumb-status, .sold-out"
        )
        in_stock = True
        if out_of_stock and "sold out" in out_of_stock.text.lower():
            in_stock = False

        img_el = card.select_one("img.card-image, .card-img-container img, .product-image img, img")
        img_src = ""
        if img_el:
            img_src = img_el.get("data-src") or img_el.get("src") or img_el.get("data-srcset") or ""
            if not img_src and img_el.get("srcset"):
                img_src = img_el.get("srcset").split(",")[0].split(" ")[0]

        all_products.append({
            "id": None,
            "title": title,
            "name": title,
            "handle": handle,
            "body_html": "",
            "vendor": urllib.parse.urlparse(url).netloc,
            "brand": urllib.parse.urlparse(url).netloc,
            "product_type": "nail polish",
            "variants": [{
                "id": None,
                "title": "Default Title",
                "sku": handle,
                "available": in_stock,
                "in_stock": in_stock,
                "price": price
            }],
            "images": [{"id": idx, "position": 1, "src": img_src}] if img_src else [],
            "image_urls": img_src,
            "url": link
        })

    print(f"Retrieved {len(all_products)} products via Generic HTML Scraper.")
    return all_products


def generate_clean_filename(target_url, ext="json"):
    """Generates clean output file name, extracting brand names and appending _lacquertracker for Lacquer Tracker URLs."""
    parsed = urllib.parse.urlparse(target_url)

    if "lacquertracker.com" in parsed.netloc.lower():
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ["brand", "polish"]:
            brand_slug = parts[1]
            return f"{brand_slug}_lacquertracker.{ext}"
        return f"lacquertracker.{ext}"

    netloc = parsed.netloc.lower()
    clean_name = re.sub(r"^www\.", "", netloc)
    clean_name = re.sub(r"\.(com|org|net|co\.uk|io|store|ca|au)$", "", clean_name)
    clean_name = re.sub(r"[^\w-]", "", clean_name)
    if not clean_name:
        clean_name = "scraped_products"
    return f"{clean_name}.{ext}"


def scrape_store(target_url):
    print(f"\nAnalyzing: {target_url}")
    platform, endpoint = detect_platform(target_url)
    print(f"Detected Platform: {platform.upper()}")

    if platform == "lacquertracker":
        products = scrape_lacquertracker(endpoint)
    elif platform == "shopify":
        products = scrape_shopify(endpoint)
    elif platform == "bigcartel":
        products = scrape_bigcartel(endpoint)
    elif platform == "ecwid":
        products = scrape_ecwid(endpoint)
    elif platform == "wix":
        products = scrape_wix(endpoint)
    elif platform == "woocommerce":
        products = scrape_woocommerce(endpoint)
    elif platform == "squarespace":
        products = scrape_squarespace(endpoint)
    else:
        products = scrape_html_generic(endpoint)

    return {"platform": platform, "products": products}


def export_to_csv(products, output_path):
    """Exports scraped products using the exact CSV schema format from jsonToCsv.py."""
    rows = []
    for item in products:
        row = {
            "id": item.get("id", ""),
            "brand": item.get("brand", item.get("vendor", "")),
            "name": item.get("name", item.get("title", "")),
            "collection": item.get("collection", ""),
            "release_year": item.get("release_year", ""),
            "release_month": item.get("release_month", ""),
            "base_color": item.get("base_color", ""),
            "other_colors": item.get("other_colors", ""),
            "finish": item.get("finish", ""),
            "collection_type": item.get("collection_type", ""),
            "price": item.get("price", ""),
            "description": item.get("description", item.get("body_html", "")),
            "stock_status": item.get("stock_status", ""),
            "status": item.get("status", "reg"),
            "image_urls": item.get("image_urls", ""),
            "url": item.get("url", "")
        }
        rows.append(row)

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Universal Product Scraper for E-commerce Sites & Lacquer Tracker")
    parser.add_argument("url", nargs="?", help="The target store or Lacquer Tracker URL")
    parser.add_argument("-o", "--output", help="Optional target output directory/folder path")
    parser.add_argument("-f", "--format", choices=["json", "csv"], help="Output file format (csv or json)")

    args = parser.parse_args()

    target_url = args.url
    if not target_url:
        target_url = input("Enter store or Lacquer Tracker URL: ").strip()

    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    data = scrape_store(target_url)

    output_format = args.format
    if not output_format:
        output_format = "csv" if data["platform"] == "lacquertracker" else "json"

    default_filename = generate_clean_filename(target_url, ext=output_format)

    if args.output:
        target_dir = args.output
        os.makedirs(target_dir, exist_ok=True)
        output_filename = os.path.join(target_dir, default_filename)
    else:
        output_filename = default_filename

    if output_format == "csv":
        export_to_csv(data["products"], output_filename)
    else:
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nSuccessfully scraped {len(data['products'])} products.")
    print(f"Saved to: {output_filename}\n")


if __name__ == "__main__":
    main()