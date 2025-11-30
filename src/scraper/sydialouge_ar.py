"""
Arabic Publications Scraper for Syrian Dialogue Center
=======================================================

Scrapes:
- Title
- Content
- Author (from bio)
- References (footnotes)
- Date
- Category
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
import os

BASE_URL = "https://sydialogue.org"
PUBLICATIONS_URL = f"{BASE_URL}/category/publicationsar/"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}



def get_publication_urls(max_pages=30):
    all_urls = []

    for page_num in range(1, max_pages + 1):
        if page_num == 1:
            url = PUBLICATIONS_URL
        else:
            url = f"{PUBLICATIONS_URL}page/{page_num}/"

        print(f"Fetching listing page {page_num}: {url}")

        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            print("  No more pages.")
            break

        soup = BeautifulSoup(response.text, "html.parser")

        # NEW CORRECT SELECTOR
        more_links = soup.select("a.more-link.button")

        if not more_links:
            print("  No more articles found on this page.")
            break

        for link in more_links:
            href = link.get("href")
            if href and href.startswith("/"):
                full_url = BASE_URL + href
                if full_url not in all_urls:
                    all_urls.append(full_url)

        time.sleep(1)

    print("Found", len(all_urls), "articles.")
    return all_urls




def extract_author(soup):
    author_info = {"name": None, "bio": None, "position": None}

    # Meta tag
    meta = soup.find("meta", {"name": "author"})
    if meta:
        author_info["name"] = meta.get("content")

    # Bio
    article = soup.find("article")
    if article:
        ps = article.find_all("p")
        for p in ps[-5:]:
            txt = p.get_text(strip=True)
            bio_indicators = ["باحث", "مدير", "رئيس", "في مركز الحوار السوري"]
            if any(x in txt for x in bio_indicators):
                author_info["bio"] = txt
                if "،" in txt:
                    author_info["position"] = txt.split("،")[0]
                break

    return author_info




def extract_references(soup):
    refs = []
    article = soup.find("article")
    if not article:
        return refs

    footnotes = article.find_all("a", id=lambda x: x and x.startswith("_ftn"))

    for fn in footnotes:
        parent = fn.find_parent(["p", "div", "li"])
        if parent:
            text = parent.get_text(strip=True)
            links = [a["href"] for a in parent.find_all("a", href=True)]
            refs.append({"id": fn.get("id"), "text": text, "links": links})

    # fallback [[1]]
    if not refs:
        txt = article.get_text()
        matches = re.findall(r'\[\[?(\d+)\]?\]([^\[]+)', txt)
        for num, cnt in matches:
            if len(cnt.strip()) > 20:
                refs.append({"id": f"ref_{num}", "text": cnt.strip(), "links": []})

    return refs




def get_article_content(url):
    print("  Scraping:", url)

    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        print("    Failed to load")
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    # TITLE
    title_el = soup.find("h1")
    title = title_el.get_text(strip=True) if title_el else None

    # CONTENT
    article = soup.find("article")
    content = None
    if article:
        ps = article.find_all("p")
        chunks = [p.get_text(strip=True) for p in ps if len(p.get_text(strip=True)) > 30]
        content = "\n\n".join(chunks)

    # DATE
    date = None
    for sel in ["time", ".date", ".entry-date"]:
        el = soup.select_one(sel)
        if el:
            date = el.get("datetime") or el.get_text(strip=True)
            break

    # CATEGORY
    cat_el = soup.select_one('a[href*="/category/publicationsar/"]')
    category = cat_el.get_text(strip=True) if cat_el else None

    # AUTHOR
    author = extract_author(soup)

    # REFERENCES
    references = extract_references(soup)

    return {
        "title": title,
        "url": url,
        "content": content,
        "author": author,
        "references": references,
        "date": date,
        "category": category,
        "language": "ar"
    }




def scrape_all(max_pages=30, delay=1):
    urls = get_publication_urls(max_pages)
    results = []

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}]")
        data = get_article_content(url)
        if data:
            results.append(data)
        time.sleep(delay)

    print("Scraped", len(results), "articles.")
    return results




def save_results(articles, filename="data/sydialogue_ar_publications.json"):
    os.makedirs("data", exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print("Saved", len(articles), "articles to", filename)



if __name__ == "__main__":
    articles = scrape_all(max_pages=30)
    save_results(articles)
