"""
Harmoon Center (مركز حرمون) Comprehensive Scraper
==================================================

Scrapes all publications from the Harmoon Center for Contemporary Studies.

Content Types:
- أبحاث (Researches) - tab=1
- تقارير (Reports) - tab=2  
- تحليل سياسات (Policy Analysis) - tab=3
- تقدير موقف (Position Assessment) - tab=4
- ترجمات (Translations) - tab=5
- تقييم حالة (Case Assessment) - tab=6

Also scrapes:
- مؤتمرات (Conferences)
- أخبار المركز (Center News)
- منتدى حرمون الثقافي (Cultural Forum)
- مجلة قلمون (Qalamoun Magazine)

Author: SyrSent Project
"""

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import requests
import json
import time
import logging
import os
import re
from datetime import datetime
from collections import Counter
from urllib.parse import urljoin, urlparse

try:
    from webdriver_manager.firefox import GeckoDriverManager
    USE_MANAGER = True
except:
    USE_MANAGER = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://www.harmoon.org"

# All content sections to scrape
SECTIONS = [
    # Publications (منشورات)
    {
        "name": "researches",
        "name_ar": "أبحاث",
        "url": "https://www.harmoon.org/publications/?tab=1",
        "category": "researches"
    },
    {
        "name": "reports",
        "name_ar": "تقارير",
        "url": "https://www.harmoon.org/publications/?tab=2",
        "category": "reports"
    },
    {
        "name": "policy_analysis",
        "name_ar": "تحليل سياسات",
        "url": "https://www.harmoon.org/publications/?tab=3",
        "category": "policy_analysis"
    },
    {
        "name": "position_assessment",
        "name_ar": "تقدير موقف",
        "url": "https://www.harmoon.org/publications/?tab=4",
        "category": "position_assessment"
    },
    {
        "name": "translations",
        "name_ar": "ترجمات",
        "url": "https://www.harmoon.org/publications/?tab=5",
        "category": "translations"
    },
    {
        "name": "case_assessment",
        "name_ar": "تقييم حالة",
        "url": "https://www.harmoon.org/publications/?tab=6",
        "category": "case_assessment"
    },
    # Activities (نشاطات)
    {
        "name": "conferences",
        "name_ar": "مؤتمرات",
        "url": "https://www.harmoon.org/news-activities/?tab=1",
        "category": "conferences"
    },
    {
        "name": "center_news",
        "name_ar": "أخبار المركز",
        "url": "https://www.harmoon.org/news-activities/?tab=2",
        "category": "news"
    },
    # Cultural Forum (منتدى حرمون الثقافي)
    {
        "name": "seminars",
        "name_ar": "ندوات",
        "url": "https://www.harmoon.org/culture-forum/?tab=1",
        "category": "seminars"
    },
    {
        "name": "special_interviews",
        "name_ar": "لقاء خاص",
        "url": "https://www.harmoon.org/culture-forum/?tab=2",
        "category": "interviews"
    },
    # Dialogues (حوارات السوريين)
    {
        "name": "dialogue_project",
        "name_ar": "مشروع الحوار",
        "url": "https://www.harmoon.org/dialogues-page/?tab=1",
        "category": "dialogues"
    },
    {
        "name": "dialogue_outputs",
        "name_ar": "مخرجات الحوار",
        "url": "https://www.harmoon.org/dialogues-page/?tab=2",
        "category": "dialogues"
    },
    {
        "name": "dialogue_articles",
        "name_ar": "مقالات حول الحوار",
        "url": "https://www.harmoon.org/dialogues-page/?tab=3",
        "category": "dialogues"
    },
]

# Button selectors for "Load More" (need to discover actual ones)
LOAD_MORE_SELECTORS = [
    (By.CSS_SELECTOR, "button.show-more-button"),
    (By.CSS_SELECTOR, "button.load-more"),
    (By.CSS_SELECTOR, "a.load-more"),
    (By.XPATH, "//button[contains(text(), 'المزيد')]"),
    (By.XPATH, "//a[contains(text(), 'المزيد')]"),
    (By.XPATH, "//button[contains(text(), 'عرض المزيد')]"),
    (By.XPATH, "//a[contains(text(), 'عرض المزيد')]"),
    (By.CSS_SELECTOR, ".pagination a.next"),
    (By.CSS_SELECTOR, "a.next-page"),
    (By.XPATH, "//a[contains(@class, 'next')]"),
]


# ============================================================
# BROWSER
# ============================================================

def create_browser(headless=True):
    """Create Firefox browser."""
    options = Options()
    
    if headless:
        options.add_argument("-headless")
    
    options.set_preference("intl.accept_languages", "ar")
    options.set_preference("general.useragent.override",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0")
    
    try:
        if USE_MANAGER:
            service = Service(GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=options)
        else:
            driver = webdriver.Firefox(options=options)
        
        driver.set_window_size(1400, 900)
        driver.set_page_load_timeout(60)
        return driver
        
    except Exception as e:
        logger.error(f"Browser creation failed: {e}")
        return None


# ============================================================
# ARTICLE EXTRACTION
# ============================================================

def extract_articles_from_page(html, base_url=BASE_URL):
    """
    Extract article links from a listing page.
    """
    articles = {}
    soup = BeautifulSoup(html, "html.parser")
    
    # Find all article links - Harmoon uses various URL patterns
    url_patterns = [
        r'/researches/',
        r'/reports/',
        r'/policy-analysis/',
        r'/position-assessment/',
        r'/translations/',
        r'/case-assessment/',
        r'/news/',
        r'/conferences/',
        r'/seminars/',
        r'/dialogues/',
        r'/magazine/',
    ]
    
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        
        # Check if it matches article patterns
        is_article = any(pattern in href for pattern in url_patterns)
        
        # Also check for Arabic slugs (common in Harmoon URLs)
        if not is_article and "harmoon.org" in href:
            # Check if URL has content after domain (not just category page)
            parsed = urlparse(href)
            path_parts = [p for p in parsed.path.split("/") if p]
            if len(path_parts) >= 2:  # Has category and slug
                is_article = True
        
        if not is_article:
            continue
        
        # Build full URL
        if href.startswith("/"):
            url = urljoin(base_url, href)
        elif href.startswith("http"):
            url = href
        else:
            continue
        
        # Skip if already found
        url = url.rstrip("/")
        if url in articles:
            continue
        
        # Skip category/listing pages
        skip_patterns = [
            "/publications/?",
            "/news-activities/?",
            "/culture-forum/?",
            "/dialogues-page/?",
            "/magazine/?tab",
        ]
        if any(p in url for p in skip_patterns):
            continue
        
        # Get title
        title = link.get_text(strip=True)
        
        # Try to find better title from parent
        if not title or len(title) < 10:
            for parent in link.parents:
                if parent.name in ["article", "div", "li", "section"]:
                    h = parent.find(["h1", "h2", "h3", "h4", "h5"])
                    if h:
                        title = h.get_text(strip=True)
                        break
                if title and len(title) >= 10:
                    break
        
        # Clean title
        title = re.sub(r'\s+', ' ', title).strip()
        
        if not title or len(title) < 5:
            continue
        
        # Try to extract date from page
        date = ""
        for parent in link.parents:
            if parent.name in ["article", "div", "li"]:
                # Look for date element
                date_el = parent.find(class_=re.compile(r'date|time|تاريخ', re.I))
                if date_el:
                    date_text = date_el.get_text(strip=True)
                    # Try to parse Arabic date
                    date = parse_arabic_date(date_text)
                    break
                # Also look for time element
                time_el = parent.find("time")
                if time_el:
                    date = time_el.get("datetime", "")[:10]
                    break
        
        articles[url] = {
            "title": title,
            "url": url,
            "date": date,
            "source": "harmoon",
            "language": "ar",
        }
    
    return articles


def parse_arabic_date(text):
    """
    Try to parse Arabic date text.
    Common formats:
    - "10 تموز/يوليو ,2016"
    - "2024-01-15"
    - "15/01/2024"
    """
    if not text:
        return ""
    
    # Try ISO format first
    iso_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
    if iso_match:
        return iso_match.group(0)
    
    # Try slash format
    slash_match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if slash_match:
        d, m, y = slash_match.groups()
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    
    # Try to find year
    year_match = re.search(r'(20\d{2})', text)
    if year_match:
        year = year_match.group(1)
        # Try to find month
        arabic_months = {
            'كانون الثاني': '01', 'يناير': '01',
            'شباط': '02', 'فبراير': '02',
            'آذار': '03', 'مارس': '03',
            'نيسان': '04', 'أبريل': '04',
            'أيار': '05', 'مايو': '05',
            'حزيران': '06', 'يونيو': '06',
            'تموز': '07', 'يوليو': '07',
            'آب': '08', 'أغسطس': '08',
            'أيلول': '09', 'سبتمبر': '09',
            'تشرين الأول': '10', 'أكتوبر': '10',
            'تشرين الثاني': '11', 'نوفمبر': '11',
            'كانون الأول': '12', 'ديسمبر': '12',
        }
        for month_name, month_num in arabic_months.items():
            if month_name in text:
                # Try to find day
                day_match = re.search(r'(\d{1,2})', text)
                day = day_match.group(1).zfill(2) if day_match else "01"
                return f"{year}-{month_num}-{day}"
        
        return f"{year}-01-01"
    
    return ""


# ============================================================
# PAGE SCRAPING WITH LOAD MORE / PAGINATION
# ============================================================

def find_load_more_button(driver):
    """Find Load More or Next Page button."""
    for by, selector in LOAD_MORE_SELECTORS:
        try:
            elements = driver.find_elements(by, selector)
            for elem in elements:
                if elem.is_displayed() and elem.is_enabled():
                    return elem
        except:
            continue
    return None


def find_pagination_links(driver):
    """Find pagination links (page 2, 3, etc.)."""
    try:
        # Look for pagination container
        pagination = driver.find_elements(By.CSS_SELECTOR, ".pagination a, .page-numbers a, nav.pagination a")
        
        links = []
        for elem in pagination:
            href = elem.get_attribute("href")
            text = elem.text.strip()
            if href and (text.isdigit() or "next" in text.lower() or "التالي" in text):
                links.append((href, text))
        
        return links
    except:
        return []


def scrape_section(section, headless=True, max_pages=50):
    """
    Scrape a single section, handling pagination.
    """
    name = section["name"]
    url = section["url"]
    category = section["category"]
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Scraping: {section['name_ar']} ({name})")
    logger.info(f"URL: {url}")
    logger.info(f"{'='*60}")
    
    driver = create_browser(headless=headless)
    if not driver:
        return []
    
    all_articles = {}
    pages_scraped = 0
    
    try:
        # Load initial page
        driver.get(url)
        time.sleep(3)
        
        while pages_scraped < max_pages:
            pages_scraped += 1
            
            # Extract articles from current page
            html = driver.page_source
            articles = extract_articles_from_page(html)
            
            prev_count = len(all_articles)
            for article_url, article in articles.items():
                if article_url not in all_articles:
                    article["category"] = category
                    article["section"] = name
                    all_articles[article_url] = article
            
            new_count = len(all_articles) - prev_count
            logger.info(f"  Page {pages_scraped}: {len(all_articles)} articles (+{new_count})")
            
            if new_count == 0 and pages_scraped > 1:
                logger.info("  No new articles, stopping")
                break
            
            # Try to find next page
            
            # Method 1: Click "Load More" button
            button = find_load_more_button(driver)
            if button:
                try:
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                    time.sleep(0.5)
                    button.click()
                    logger.info("  → Clicked Load More")
                    time.sleep(3)
                    continue
                except:
                    pass
            
            # Method 2: Check for pagination links
            pagination = find_pagination_links(driver)
            if pagination:
                # Find next page
                current_page = pages_scraped
                next_url = None
                
                for href, text in pagination:
                    if text.isdigit() and int(text) == current_page + 1:
                        next_url = href
                        break
                    if "next" in text.lower() or "التالي" in text:
                        next_url = href
                        break
                
                if next_url:
                    logger.info(f"  → Going to next page: {next_url}")
                    driver.get(next_url)
                    time.sleep(3)
                    continue
            
            # Method 3: Try URL-based pagination
            # Try adding /page/N/ or ?paged=N
            if pages_scraped == 1:
                test_urls = [
                    f"{url}&paged=2",
                    url.replace("?", "/page/2/?") if "?" in url else f"{url}page/2/",
                ]
                
                for test_url in test_urls:
                    try:
                        driver.get(test_url)
                        time.sleep(2)
                        test_html = driver.page_source
                        test_articles = extract_articles_from_page(test_html)
                        
                        if test_articles and len(test_articles) > 0:
                            # Found pagination pattern!
                            logger.info(f"  → Found pagination pattern")
                            pages_scraped += 1
                            
                            for article_url, article in test_articles.items():
                                if article_url not in all_articles:
                                    article["category"] = category
                                    article["section"] = name
                                    all_articles[article_url] = article
                            
                            # Continue with this pattern
                            page_num = 3
                            while page_num <= max_pages:
                                if "&paged=" in test_url:
                                    next_url = f"{url}&paged={page_num}"
                                else:
                                    next_url = url.replace("?", f"/page/{page_num}/?") if "?" in url else f"{url}page/{page_num}/"
                                
                                driver.get(next_url)
                                time.sleep(2)
                                
                                page_html = driver.page_source
                                page_articles = extract_articles_from_page(page_html)
                                
                                if not page_articles:
                                    break
                                
                                prev = len(all_articles)
                                for article_url, article in page_articles.items():
                                    if article_url not in all_articles:
                                        article["category"] = category
                                        article["section"] = name
                                        all_articles[article_url] = article
                                
                                new = len(all_articles) - prev
                                logger.info(f"  Page {page_num}: {len(all_articles)} articles (+{new})")
                                
                                if new == 0:
                                    break
                                
                                page_num += 1
                            
                            break
                    except:
                        continue
            
            # No more pages found
            logger.info("  No more pages")
            break
        
        result = list(all_articles.values())
        logger.info(f"  ✓ Total from {name}: {len(result)} articles")
        return result
        
    except Exception as e:
        logger.error(f"  Error: {e}")
        return list(all_articles.values())
        
    finally:
        try:
            driver.quit()
        except:
            pass


# ============================================================
# CONTENT FETCHING
# ============================================================

def fetch_article_content(url):
    """Fetch full article content."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
        }
        r = requests.get(url, headers=headers, timeout=30)
        
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.content, "html.parser")
        
        # Title
        title = ""
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
        
        # Author
        author = ""
        author_el = soup.find(class_=re.compile(r'author|writer|كاتب', re.I))
        if author_el:
            author = author_el.get_text(strip=True)
        
        # Date
        date = ""
        # Look for date in various places
        date_el = soup.find(class_=re.compile(r'date|time|تاريخ', re.I))
        if date_el:
            date = parse_arabic_date(date_el.get_text(strip=True))
        
        if not date:
            # Try meta tags
            meta_date = soup.find("meta", property="article:published_time")
            if meta_date:
                date = meta_date.get("content", "")[:10]
        
        # Content
        paragraphs = []
        
        # Try article body
        content_selectors = [
            "article .entry-content",
            "article .post-content",
            ".article-content",
            ".entry-content",
            "article",
            "main .content",
        ]
        
        content_el = None
        for selector in content_selectors:
            content_el = soup.select_one(selector)
            if content_el:
                break
        
        if content_el:
            for p in content_el.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 30:
                    # Skip navigation/boilerplate
                    if not any(s in text[:50] for s in ["اقرأ أيضًا", "شارك", "تابعنا", "مشاركة"]):
                        paragraphs.append(text)
        
        content = "\n\n".join(paragraphs)
        
        if len(content) < 100:
            return None
        
        return {
            "title": title if title else None,
            "author": author if author else None,
            "date": date if date else None,
            "content": content,
            "content_length": len(content),
        }
        
    except Exception as e:
        return None


# ============================================================
# MAIN SCRAPER
# ============================================================

def scrape_all_harmoon(
    headless=True,
    fetch_content=True,
    output_file="data/harmoon_all.json",
    sections=None
):
    """
    Scrape all Harmoon content.
    
    Args:
        headless: Run browser invisibly
        fetch_content: Also fetch article content
        output_file: Where to save results
        sections: List of section names to scrape (None = all)
    """
    
    logger.info("="*70)
    logger.info("HARMOON CENTER COMPREHENSIVE SCRAPER")
    logger.info("="*70)
    logger.info(f"Sections: {len(SECTIONS)}")
    logger.info(f"Headless: {headless}")
    logger.info(f"Fetch content: {fetch_content}")
    logger.info("="*70)
    
    all_articles = {}  # URL -> article
    
    # Load existing progress
    if os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                for a in json.load(f):
                    all_articles[a["url"]] = a
            logger.info(f"Loaded {len(all_articles)} existing articles")
        except:
            pass
    
    # Scrape each section
    sections_to_scrape = SECTIONS
    if sections:
        sections_to_scrape = [s for s in SECTIONS if s["name"] in sections]
    
    for i, section in enumerate(sections_to_scrape, 1):
        logger.info(f"\n[{i}/{len(sections_to_scrape)}]")
        
        try:
            articles = scrape_section(section, headless=headless)
            
            # Add to collection
            new_count = 0
            for a in articles:
                if a["url"] not in all_articles:
                    all_articles[a["url"]] = a
                    new_count += 1
            
            logger.info(f"Added {new_count} new articles (total: {len(all_articles)})")
            
            # Save progress
            save_articles(all_articles, output_file)
            
        except Exception as e:
            logger.error(f"Error scraping {section['name']}: {e}")
        
        time.sleep(3)
    
    # Fetch content
    if fetch_content:
        logger.info("\n" + "="*70)
        logger.info("Fetching article content...")
        logger.info("="*70)
        
        need_content = [a for a in all_articles.values() if not a.get("content")]
        logger.info(f"Articles needing content: {len(need_content)}")
        
        for i, article in enumerate(need_content, 1):
            if i % 25 == 0:
                logger.info(f"  Progress: {i}/{len(need_content)}")
                save_articles(all_articles, output_file)
            
            content = fetch_article_content(article["url"])
            if content:
                article.update(content)
            
            time.sleep(0.5)
        
        save_articles(all_articles, output_file)
    
    # Final stats
    result = list(all_articles.values())
    
    logger.info("\n" + "="*70)
    logger.info("COMPLETE!")
    logger.info("="*70)
    logger.info(f"Total articles: {len(result)}")
    logger.info(f"With content: {len([a for a in result if a.get('content')])}")
    
    # Category distribution
    categories = Counter(a.get("category", "unknown") for a in result)
    logger.info("\nBy category:")
    for cat, count in categories.most_common():
        logger.info(f"  {cat}: {count}")
    
    # Year distribution
    years = Counter()
    for a in result:
        date = a.get("date", "")
        if date and len(date) >= 4:
            years[date[:4]] += 1
    
    if years:
        logger.info("\nBy year:")
        for y, c in sorted(years.items(), reverse=True)[:5]:
            logger.info(f"  {y}: {c}")
    
    return result


def save_articles(articles_dict, filename):
    """Save articles to JSON."""
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)
    articles_list = list(articles_dict.values())
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles_list, f, ensure_ascii=False, indent=2)
    logger.info(f"✓ Saved {len(articles_list)} articles")


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════╗
    ║  HARMOON CENTER COMPREHENSIVE SCRAPER                                ║
    ║  مركز حرمون للدراسات المعاصرة                                        ║
    ║                                                                      ║
    ║  Content types:                                                      ║
    ║  • أبحاث (Researches)                                                ║
    ║  • تقارير (Reports)                                                  ║
    ║  • تحليل سياسات (Policy Analysis)                                    ║
    ║  • تقدير موقف (Position Assessment)                                  ║
    ║  • ترجمات (Translations)                                             ║
    ║  • تقييم حالة (Case Assessment)                                      ║
    ║  • مؤتمرات (Conferences)                                             ║
    ║  • ندوات (Seminars)                                                  ║
    ║  • مجلة قلمون (Qalamoun Magazine)                                    ║
    ║                                                                      ║
    ║  All Syria-focused political analysis content                        ║
    ╚══════════════════════════════════════════════════════════════════════╝
    """)
    
    # Configuration
    HEADLESS = True         # Set False to watch browser
    FETCH_CONTENT = True    # Get full article text
    OUTPUT = "data/harmoon_all.json"
    
    start = datetime.now()
    
    articles = scrape_all_harmoon(
        headless=HEADLESS,
        fetch_content=FETCH_CONTENT,
        output_file=OUTPUT
    )
    
    print(f"\n{'='*70}")
    print(f"Duration: {datetime.now() - start}")
    print(f"Articles: {len(articles)}")
    print(f"Output: {OUTPUT}")
    print(f"{'='*70}")