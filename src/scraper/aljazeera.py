"""
Al Jazeera FULL HISTORY Scraper (2011 - Present)
================================================

Scrapes ALL Syria articles from Al Jazeera Arabic going back to 2011.

Based on discovered button:
- Class: 'show-more-button big-margin'
- Loads: 10-20 articles per click
- Keep clicking until we reach 2011!

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

# Target: Get everything back to 2011
TARGET_YEAR = 2011

# Max articles (safety limit - Syria coverage could be 10,000+)
MAX_ARTICLES = 15000

# Max clicks (safety limit)
MAX_CLICKS = 1500

# Button selectors (in order of preference)
BUTTON_SELECTORS = [
    (By.CSS_SELECTOR, "button.show-more-button"),
    (By.CSS_SELECTOR, "button.show-more-button.big-margin"),
    (By.XPATH, "//button[contains(@class, 'show-more-button')]"),
    (By.XPATH, "//button[contains(text(), 'اعرض المزيد')]"),
]

# Syria keywords
SYRIA_KEYWORDS = [
    "سوريا", "سوري", "السوري", "السورية",
    "دمشق", "حلب", "إدلب", "حمص", "حماة", "درعا",
    "الأسد", "بشار", "الشرع", "الجولاني",
    "هيئة تحرير", "النصرة", "قسد", "الجولان",
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

def extract_articles(html):
    """Extract unique articles from HTML."""
    articles = {}
    soup = BeautifulSoup(html, "html.parser")
    
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        
        # Match article URL pattern (2011-2025)
        if re.search(r'/20(1[1-9]|2[0-5])/\d{1,2}/\d{1,2}/', href):
            # Build full URL
            if href.startswith("/"):
                url = f"https://www.aljazeera.net{href}"
            elif href.startswith("http"):
                url = href
            else:
                continue
            
            url = url.split("?")[0]
            
            if url in articles:
                continue
            
            # Get title
            title = link.get_text(strip=True)
            
            if not title or len(title) < 10:
                for parent in link.parents:
                    if parent.name in ["article", "div", "li", "section"]:
                        h = parent.find(["h1", "h2", "h3", "h4"])
                        if h:
                            title = h.get_text(strip=True)
                            break
                    if title and len(title) >= 10:
                        break
            
            title = title.split(" | ")[0].strip()
            title = re.sub(r'\s+', ' ', title)
            
            if not title or len(title) < 10:
                continue
            
            # Extract date from URL
            date = ""
            m = re.search(r'/(\d{4})/(\d{1,2})/(\d{1,2})/', url)
            if m:
                date = f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
            
            articles[url] = {
                "title": title,
                "url": url,
                "date": date,
                "source": "aljazeera",
                "language": "ar",
            }
    
    return articles


def get_oldest_year(articles):
    """Get the oldest year from articles."""
    years = []
    for a in articles.values():
        date = a.get("date", "")
        if date and len(date) >= 4:
            try:
                year = int(date[:4])
                years.append(year)
            except:
                pass
    return min(years) if years else 9999


def get_year_distribution(articles):
    """Get article count by year."""
    years = Counter()
    for a in articles.values():
        date = a.get("date", "")
        if date and len(date) >= 4:
            years[date[:4]] += 1
    return years


# ============================================================
# LOAD MORE CLICKING
# ============================================================

def find_load_more_button(driver):
    """Find the Load More button."""
    for by, selector in BUTTON_SELECTORS:
        try:
            elements = driver.find_elements(by, selector)
            for elem in elements:
                try:
                    if elem.is_displayed() and elem.is_enabled():
                        text = elem.text
                        if "المزيد" in text:
                            return elem
                except:
                    continue
        except:
            continue
    return None


def click_load_more(driver):
    """Click the Load More button."""
    # Scroll to bottom
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(1)
    
    button = find_load_more_button(driver)
    
    if not button:
        return False
    
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
        time.sleep(0.5)
        
        try:
            button.click()
        except:
            driver.execute_script("arguments[0].click();", button)
        
        return True
    except:
        return False


# ============================================================
# MAIN SCRAPER
# ============================================================

def scrape_full_history(
    url="https://www.aljazeera.net/where/mideast/arab/syria/",
    headless=True,
    output_file="data/aljazeera_syria_full_history.json",
    save_interval=50
):
    """
    Scrape ALL articles going back to 2011.
    
    Args:
        url: Page URL
        headless: Run browser invisibly
        output_file: Where to save results
        save_interval: Save progress every N clicks
    """
    
    logger.info("="*70)
    logger.info("AL JAZEERA FULL HISTORY SCRAPER")
    logger.info("="*70)
    logger.info(f"URL: {url}")
    logger.info(f"Target: All articles back to {TARGET_YEAR}")
    logger.info(f"Max articles: {MAX_ARTICLES}")
    logger.info(f"Max clicks: {MAX_CLICKS}")
    logger.info("="*70)
    
    # Load existing progress
    all_articles = {}
    if os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                for a in json.load(f):
                    all_articles[a["url"]] = a
            logger.info(f"Loaded {len(all_articles)} existing articles")
            
            # Show current progress
            oldest = get_oldest_year(all_articles)
            logger.info(f"Oldest article so far: {oldest}")
        except Exception as e:
            logger.warning(f"Could not load existing: {e}")
    
    # Create browser
    logger.info("\nStarting browser...")
    driver = create_browser(headless=headless)
    
    if not driver:
        logger.error("Failed to create browser!")
        return list(all_articles.values())
    
    try:
        # Load page
        logger.info(f"Loading {url}...")
        driver.get(url)
        time.sleep(5)
        
        click_count = 0
        no_new_count = 0
        last_save = 0
        
        while True:
            # Extract articles
            prev_count = len(all_articles)
            current = extract_articles(driver.page_source)
            all_articles.update(current)
            new_count = len(all_articles) - prev_count
            
            # Get oldest year
            oldest_year = get_oldest_year(all_articles)
            
            # Log progress
            if click_count % 10 == 0 or new_count > 0:
                logger.info(
                    f"  Click #{click_count}: {len(all_articles)} articles "
                    f"(+{new_count}) | Oldest: {oldest_year}"
                )
            
            # Check if we've reached our target year
            if oldest_year <= TARGET_YEAR:
                logger.info(f"\n✓ Reached target year {TARGET_YEAR}!")
                break
            
            # Check limits
            if len(all_articles) >= MAX_ARTICLES:
                logger.info(f"\n✓ Reached max articles limit ({MAX_ARTICLES})")
                break
            
            if click_count >= MAX_CLICKS:
                logger.info(f"\n✓ Reached max clicks limit ({MAX_CLICKS})")
                break
            
            # Check if stuck
            if new_count == 0:
                no_new_count += 1
                if no_new_count >= 10:
                    logger.info("\nNo new articles after 10 attempts, stopping")
                    break
            else:
                no_new_count = 0
            
            # Click Load More
            if click_load_more(driver):
                click_count += 1
                time.sleep(2.5)  # Wait for content
            else:
                # No button - scroll and retry
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                no_new_count += 1
            
            # Save progress periodically
            if click_count - last_save >= save_interval:
                save_articles(all_articles, output_file)
                last_save = click_count
                
                # Show year distribution
                years = get_year_distribution(all_articles)
                logger.info("  Year distribution: " + 
                    ", ".join(f"{y}:{c}" for y, c in sorted(years.items(), reverse=True)[:5]))
        
        # Final save
        save_articles(all_articles, output_file)
        
    except KeyboardInterrupt:
        logger.info("\n\nInterrupted by user - saving progress...")
        save_articles(all_articles, output_file)
        
    except Exception as e:
        logger.error(f"\nError: {e}")
        save_articles(all_articles, output_file)
        
    finally:
        try:
            driver.quit()
        except:
            pass
    
    # Final stats
    result = list(all_articles.values())
    
    logger.info("\n" + "="*70)
    logger.info("SCRAPING COMPLETE!")
    logger.info("="*70)
    logger.info(f"Total articles: {len(result)}")
    logger.info(f"Total clicks: {click_count}")
    
    oldest = get_oldest_year(all_articles)
    logger.info(f"Date range: {oldest} - 2025")
    
    # Year distribution
    years = get_year_distribution(all_articles)
    logger.info("\nArticles by year:")
    for year, count in sorted(years.items(), reverse=True):
        logger.info(f"  {year}: {count}")
    
    return result


def save_articles(articles_dict, filename):
    """Save articles to JSON."""
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else ".", exist_ok=True)
    articles_list = list(articles_dict.values())
    
    # Sort by date (newest first)
    articles_list.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles_list, f, ensure_ascii=False, indent=2)
    
    logger.info(f"✓ Saved {len(articles_list)} articles to {filename}")


# ============================================================
# CONTENT FETCHER (run separately after scraping)
# ============================================================

def fetch_all_content(input_file, output_file=None, delay=0.3):
    """
    Fetch content for all articles in a JSON file.
    Run this AFTER the main scraping is done.
    """
    
    if output_file is None:
        output_file = input_file.replace(".json", "_with_content.json")
    
    logger.info(f"Loading articles from {input_file}...")
    
    with open(input_file, "r", encoding="utf-8") as f:
        articles = json.load(f)
    
    logger.info(f"Loaded {len(articles)} articles")
    
    need_content = [a for a in articles if not a.get("content")]
    logger.info(f"Articles needing content: {len(need_content)}")
    
    for i, article in enumerate(need_content, 1):
        if i % 100 == 0:
            logger.info(f"  Progress: {i}/{len(need_content)}")
            # Save progress
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(articles, f, ensure_ascii=False, indent=2)
        
        content = fetch_article_content(article["url"])
        if content:
            article.update(content)
        
        time.sleep(delay)
    
    # Final save
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    with_content = len([a for a in articles if a.get("content")])
    logger.info(f"\n✓ Done! {with_content}/{len(articles)} articles have content")
    logger.info(f"Saved to: {output_file}")


def fetch_article_content(url):
    """Fetch full article content."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
        }
        r = requests.get(url, headers=headers, timeout=20)
        
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.content, "html.parser")
        
        # Title
        title = ""
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
        
        # Content
        paragraphs = []
        article = soup.find("article") or soup.find("main")
        
        if article:
            for p in article.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 50:
                    if not any(s in text[:30] for s in ["المصدر", "اشترك", "تابعنا", "انضم"]):
                        paragraphs.append(text)
        
        content = "\n\n".join(paragraphs)
        
        if len(content) < 100:
            return None
        
        return {
            "title": title if title else None,
            "content": content,
            "content_length": len(content),
        }
    except:
        return None


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════╗
    ║  AL JAZEERA FULL HISTORY SCRAPER                                     ║
    ║                                                                      ║
    ║  Target: ALL Syria articles from 2011 to present                     ║
    ║                                                                      ║
    ║  This will:                                                          ║
    ║  1. Keep clicking "Load More" until reaching 2011                    ║
    ║  2. Save progress every 50 clicks (resumable!)                       ║
    ║  3. Stop when hitting 2011 or max limits                             ║
    ║                                                                      ║
    ║  Expected: 5,000 - 15,000+ articles                                  ║
    ║  Time: 1-3 hours (depends on connection)                             ║
    ║                                                                      ║
    ║  Press Ctrl+C anytime to stop - progress is saved!                   ║
    ╚══════════════════════════════════════════════════════════════════════╝
    """)
    
    # Configuration
    HEADLESS = True  # Set False to watch browser
    OUTPUT = "data/aljazeera_syria_full_history.json"
    
    print(f"\nOutput file: {OUTPUT}")
    print(f"Headless mode: {HEADLESS}")
    print("\nStarting in 3 seconds... (Ctrl+C to cancel)")
    time.sleep(3)
    
    start = datetime.now()
    
    # STEP 1: Scrape all article URLs
    articles = scrape_full_history(
        url="https://www.aljazeera.net/where/mideast/arab/syria/",
        headless=HEADLESS,
        output_file=OUTPUT,
        save_interval=50
    )
    
    print(f"\n{'='*70}")
    print(f"STEP 1 COMPLETE: Scraped {len(articles)} article URLs")
    print(f"Duration: {datetime.now() - start}")
    print(f"{'='*70}")
    
    # STEP 2: Fetch content (optional - can run separately)
    print("\n" + "="*70)
    print("STEP 2: Fetch article content?")
    print("="*70)
    print("This will download the full text of each article.")
    print("It takes ~0.3 seconds per article.")
    print(f"Estimated time: {len(articles) * 0.3 / 60:.0f} minutes")
    print("\nTo fetch content later, run:")
    print(f'  python -c "from aljazeera_full_history import fetch_all_content; fetch_all_content(\'{OUTPUT}\')"')
    
    try:
        response = input("\nFetch content now? (y/n): ").strip().lower()
        if response == 'y':
            fetch_all_content(OUTPUT)
    except:
        print("\nSkipping content fetch. Run it later if needed.")
    
    print(f"\n{'='*70}")
    print(f"ALL DONE!")
    print(f"Total duration: {datetime.now() - start}")
    print(f"Output: {OUTPUT}")
    print(f"{'='*70}")