"""
Debug script to see what Al Jazeera's search page actually looks like.
This will save a screenshot and the HTML so we can find the right selectors.
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

try:
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
    USE_MANAGER = True
except:
    USE_MANAGER = False

def debug_aljazeera():
    print("Creating browser...")
    
    options = Options()
    # NOT headless - we want to see what's happening
    # options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ar")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    
    if USE_MANAGER:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    else:
        driver = webdriver.Chrome(options=options)
    
    try:
        # Go to search page
        url = "https://www.aljazeera.net/search?q=سوريا"
        print(f"Loading: {url}")
        driver.get(url)
        
        # Wait for page to load
        print("Waiting for page to load...")
        time.sleep(5)
        
        # Save screenshot
        os.makedirs("debug", exist_ok=True)
        driver.save_screenshot("debug/aljazeera_search.png")
        print("✓ Saved screenshot to debug/aljazeera_search.png")
        
        # Save HTML
        html = driver.page_source
        with open("debug/aljazeera_search.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✓ Saved HTML to debug/aljazeera_search.html")
        
        # Print page title
        print(f"\nPage title: {driver.title}")
        
        # Try to find ANY links
        all_links = driver.find_elements(By.TAG_NAME, "a")
        print(f"\nTotal links on page: {len(all_links)}")
        
        # Find links that look like articles
        article_links = []
        for link in all_links:
            href = link.get_attribute("href") or ""
            if "/news/" in href or "/opinions/" in href or "/politics/" in href:
                text = link.text.strip()
                if text and len(text) > 20:
                    article_links.append({"text": text[:80], "href": href})
        
        print(f"Article-like links found: {len(article_links)}")
        
        if article_links:
            print("\nSample article links:")
            for i, link in enumerate(article_links[:5], 1):
                print(f"  {i}. {link['text']}")
                print(f"     {link['href'][:80]}")
        
        # Look for specific elements
        print("\n--- Element Analysis ---")
        
        selectors_to_try = [
            ("article", "article"),
            ("search results", ".search-result, .search-results"),
            ("gc-cards", "[class*='gc-card']"),
            ("content cards", "[class*='content-card']"),
            ("post items", "[class*='post'], [class*='Post']"),
            ("list items", "li[class*='item']"),
            ("h3 headings", "h3"),
            ("main content", "main"),
        ]
        
        for name, selector in selectors_to_try:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"  ✓ {name}: {len(elements)} found")
                    # Print first element's class
                    if elements[0].get_attribute("class"):
                        print(f"    First element class: {elements[0].get_attribute('class')[:60]}")
                else:
                    print(f"  ✗ {name}: 0 found")
            except Exception as e:
                print(f"  ✗ {name}: Error - {e}")
        
        # Check for any element with 'search' in class
        print("\n--- Elements with 'search' in class ---")
        search_elements = driver.find_elements(By.CSS_SELECTOR, "[class*='search']")
        for elem in search_elements[:10]:
            tag = elem.tag_name
            cls = elem.get_attribute("class")
            print(f"  <{tag}> class='{cls[:60] if cls else ''}'")
        
        # Keep browser open for manual inspection
        print("\n" + "="*60)
        print("Browser will stay open for 60 seconds for manual inspection.")
        print("Look at the page and identify the correct selectors!")
        print("="*60)
        
        time.sleep(60)
        
    finally:
        driver.quit()


if __name__ == "__main__":
    debug_aljazeera()