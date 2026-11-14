#!/usr/bin/env python3
"""
Cron job script to scrape brand stores using universalScraper,
update stock statuses and prices, compare with previous JSON data,
detect newly added products across all brands, and send a single 
consolidated email notification digest using encrypted environment variables.
"""

import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import universalScraper

# --- CONFIGURATION ---
DATA_DIR = "data"            # Directory where brand JSON files are stored
BRANDS_CONFIG = "brands.json" # JSON file mapping brand names to store URLs

# Encrypted credentials/settings pulled securely from Environment Variables
EMAIL_SENDER = os.environ.get("EMAIL_SENDER")
EMAIL_PASSWORD = os.environ.get("EMAIL_APP_PASSWORD")
EMAIL_RECIPIENT = os.environ.get("EMAIL_RECIPIENT")  # Encrypted secret

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587


def load_brands():
    """Loads brand URLs from configuration file."""
    if os.path.exists(BRANDS_CONFIG):
        with open(BRANDS_CONFIG, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "ExampleBrand": "https://www.lacquertracker.com/brand/example"
    }


def send_single_digest_email(new_products_dict):
    """Sends exactly ONE consolidated email notification using secure env variables."""
    if not new_products_dict or not EMAIL_RECIPIENT:
        print("[!] Email recipient not configured securely in environment variables.")
        return

    subject = "💅 Nail Polish Alert: New Products Added Digest"
    
    html_content = "<h2>New Nail Polish Products Discovered Across Brands</h2>"
    for brand, products in new_products_dict.items():
        html_content += f"<h3>Brand: {brand}</h3><ul>"
        for p in products:
            name = p.get("name") or p.get("title", "Unknown")
            price = p.get("price", "N/A")
            url = p.get("url", "#")
            html_content += f"<li><b>{name}</b> - Price: ${price} | <a href='{url}'>View Product</a></li>"
        html_content += "</ul>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_SENDER
    msg["To"] = EMAIL_RECIPIENT
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, EMAIL_RECIPIENT, msg.as_string())
        server.quit()
        print(f"\n[+] Single digest notification email successfully sent securely.")
    except Exception as e:
        print(f"\n[!] Error sending email: {e}")


def get_product_identifier(product):
    """Returns a unique identifier for a product (URL, handle, or name)."""
    return product.get("url") or product.get("handle") or product.get("name") or product.get("title")


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    brands = load_brands()
    all_new_discoveries = {}

    for brand_name, url in brands.items():
        print(f"\n--- Checking {brand_name} ({url}) ---")
        try:
            scraped_data = universalScraper.scrape_store(url)
            new_products = scraped_data.get("products", [])
        except Exception as e:
            print(f"[!] Error scraping {brand_name}: {e}")
            continue

        filename = f"{brand_name.lower().replace(' ', '_')}.json"
        filepath = os.path.join(DATA_DIR, filename)

        old_products_map = {}
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                    old_list = old_data.get("products", []) if isinstance(old_data, dict) else old_data
                    for p in old_list:
                        identifier = get_product_identifier(p)
                        if identifier:
                            old_products_map[identifier] = p
            except Exception as e:
                print(f"[!] Warning: Could not parse old JSON for {brand_name}: {e}")

        brand_new_items = []
        for p in new_products:
            identifier = get_product_identifier(p)
            if identifier and identifier not in old_products_map:
                brand_new_items.append(p)

        if brand_new_items:
            all_new_discoveries[brand_name] = brand_new_items
            print(f"[+] Found {len(brand_new_items)} new product(s) for {brand_name}!")

        output_payload = {
            "platform": scraped_data.get("platform", "unknown"),
            "products": new_products
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2, ensure_ascii=False)
        print(f"[*] Updated JSON saved for {brand_name}.")

    if all_new_discoveries:
        send_single_digest_email(all_new_discoveries)
    else:
        print("\n[*] No new products added across any brands. No email sent.")


if __name__ == "__main__":
    main()