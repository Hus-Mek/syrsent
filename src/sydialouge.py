"""
Syrian Dialogue Center scraper
https://sydialogue.org/en/
"""

import requests
from bs4 import BeautifulSoup
import json
import os
import time


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_publications(pages=1):
    """Fetch publications from Syrian Dialogue Center."""
    base_url = "https://sydialogue.org/en/category/publications/"
    articles = []
    for page in range(1, pages + 1):
        if page == 1:
            url = base_url
        else:
            url = f"{base_url}page/{page}/"

        print(f"Fetching: {url}")

        response = requests.get(url, headers=HEADERS, timeout=30)
        if response.status_code != 200:
            print(f"Failed to fetch page {page}: {response.status_code}")
            continue

        soup = BeautifulSoup(response.text, "html.parser")

        # Find article links and titles
        for link in soup.find_all("a"):
            href = link.get("href", "")
            title = link.get_text(strip=True)

            # Filter for publication links
            if "/en/" in href and title and len(title) > 20:
                # Skip navigation links
                if title.lower() in ["read more", "publications", "home"]:
                    continue

                articles.append({
                    "title": title,
                    "url": href if href.startswith("http") else f"https://sydialogue.org{href}",
                })

    # Remove duplicates
    seen = set()
    unique_articles = []
    for article in articles:
        if article["url"] not in seen:
            seen.add(article["url"])
            unique_articles.append(article)

    return unique_articles

def get_article_content(url):
    """Fetch full content and date from a single article page."""
    print(f"  Fetching content: {url}")
    
    response = requests.get(url, headers=HEADERS, timeout=30)
    if response.status_code != 200:
        print(f"  Failed: {response.status_code}")
        return None, None

    soup = BeautifulSoup(response.text, "html.parser")
    
    # Get the main article content
    article = soup.find("article")
    if not article:
        return None, None
    
    # Extract text paragraphs
    paragraphs = article.find_all("p")
    content = "\n\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
    
    # Try to find publication date
    date = None
    
    # Common date locations - try multiple selectors
    date_selectors = [
        "time",
        ".date",
        ".post-date",
        ".entry-date",
        ".published",
        "span.date"
    ]
    
    for selector in date_selectors:
        date_elem = soup.select_one(selector)
        if date_elem:
            date = date_elem.get("datetime") or date_elem.get_text(strip=True)
            if date:
                break
    
    return content, date

def scrape_full_publications(max_pages=50, delay=2):
    """Scrape publications with full content."""
    publications = get_publications(max_pages)
    
    for pub in publications:
        content, date = get_article_content(pub["url"])
        pub["content"] = content
        pub["date"] = date
        time.sleep(delay)
    
    return publications

def save_results(articles, filename="data/sydialogue_publications.json"):
    """Save articles to JSON file."""
    # Create data folder if it doesn't exist
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(articles)} articles to {filename}")

if __name__ == "__main__":
    results = scrape_full_publications(30, delay=2)
    
    print(f"\nFound {len(results)} publications:\n")
    for article in results:
        print(f"- {article['title'][:60]}...")
    
    save_results(results)