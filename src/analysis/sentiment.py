"""
Comprehensive Sentiment Analyzer with Timeline
===============================================

Core Features:
- Scans ALL articles for target mentions (complete coverage, no sampling)
- Groups mentions by time period (YYYY-MM)
- Uses LLM to analyze sentiment for each period
- Returns timeline with evidence quotes and article sources
- Not RAG-based - processes everything chronologically

This is the main analysis engine for SyrSent.
"""

import json
import re
import logging
from collections import defaultdict
from groq import Groq
import os

# Setup logging
logger = logging.getLogger(__name__)

# ============================================================
# TARGET ALIASES - Multi-language entity resolution
# ============================================================
TARGET_ALIASES = {
    # Assad / Regime
    "assad": ["الأسد", "بشار", "النظام", "نظام الأسد", "البعث", "بشار الأسد", "النظام السوري", "النظام البائد", "الأسدي"],
    "الأسد": ["بشار", "النظام", "نظام الأسد", "البعث", "بشار الأسد", "النظام السوري", "النظام البائد"],
    "النظام": ["الأسد", "بشار", "نظام الأسد", "البعث", "النظام السوري", "النظام البائد"],
    
    # HTS
    "hts": ["هتش", "هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع", "أحمد الشرع", "الهيئة", "جبهة النصرة"],
    "هتش": ["هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع", "أحمد الشرع", "الهيئة"],
    "الجولاني": ["هتش", "هيئة تحرير الشام", "الشرع", "أحمد الشرع", "أبو محمد الجولاني"],
    "الشرع": ["الجولاني", "هتش", "هيئة تحرير الشام", "أحمد الشرع"],
    
    # Opposition
    "المعارضة": ["الثوار", "الفصائل", "الجيش الحر", "فصائل المعارضة", "المعارضة السورية"],
    "opposition": ["المعارضة", "الثوار", "الفصائل", "الجيش الحر"],
    
    # Russia
    "russia": ["روسيا", "الروس", "موسكو", "بوتين", "الروسي", "الروسية"],
    "روسيا": ["الروس", "موسكو", "بوتين", "الروسي", "الروسية", "الجانب الروسي"],
    
    # USA
    "usa": ["أمريكا", "الولايات المتحدة", "واشنطن", "الأمريكي", "الأمريكية", "الإدارة الأمريكية"],
    "أمريكا": ["الولايات المتحدة", "واشنطن", "الأمريكي", "الأمريكية", "الإدارة الأمريكية"],
    
    # Iran
    "iran": ["إيران", "طهران", "الإيراني", "الحرس الثوري", "الإيرانية", "حزب الله"],
    "إيران": ["طهران", "الإيراني", "الحرس الثوري", "الإيرانية"],
    
    # Turkey
    "turkey": ["تركيا", "أنقرة", "أردوغان", "التركي", "التركية"],
    "تركيا": ["أنقرة", "أردوغان", "التركي", "التركية", "الجانب التركي"],
    
    # Israel
    "israel": ["إسرائيل", "الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني"],
    "إسرائيل": ["الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني", "الكيان"],
    
    # SDF
    "sdf": ["قسد", "قوات سوريا الديمقراطية", "الأكراد", "الكرد", "الإدارة الذاتية"],
    "قسد": ["قوات سوريا الديمقراطية", "الأكراد", "الكرد", "الإدارة الذاتية", "مسد"],
}

def expand_target(target):
    """
    Get all search terms for a target (aliases and variations).
    
    Args:
        target (str): Target name (English or Arabic)
    
    Returns:
        list: All search terms for this target
    """
    terms = set([target, target.lower()])
    
    if target.lower() in TARGET_ALIASES:
        terms.update(TARGET_ALIASES[target.lower()])
    if target in TARGET_ALIASES:
        terms.update(TARGET_ALIASES[target])
    
    return list(terms)


def count_mentions(text, terms):
    """
    Count how many times any term appears in text.
    
    Args:
        text (str): Text to search
        terms (list): List of search terms
    
    Returns:
        int: Total mention count
    """
    if not text:
        return 0
    text_lower = text.lower()
    return sum(text_lower.count(t.lower()) for t in terms)


# ============================================================
# DATE AND PERIOD PARSING
# ============================================================

def parse_date_to_period(date_str):
    """
    Parse Arabic date to YYYY-MM format.
    
    Args:
        date_str (str): Arabic date string
    
    Returns:
        str: Period in format '2024-03' or 'unknown' if parse fails
    """
    if not date_str:
        return "unknown"
    
    # Arabic month to number mapping
    ar_months = {
        'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
        'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
        'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12',
        'كانون الثاني': '01', 'شباط': '02', 'آذار': '03', 'نيسان': '04',
        'أيار': '05', 'حزيران': '06', 'تموز': '07', 'آب': '08',
        'أيلول': '09', 'تشرين الأول': '10', 'تشرين الثاني': '11', 'كانون الأول': '12',
    }
    
    # Extract year
    year_match = re.search(r'(20\d{2})', date_str)
    if not year_match:
        return "unknown"
    year = year_match.group(1)
    
    # Extract month
    month = "01"  # default
    for ar_month, num in ar_months.items():
        if ar_month in date_str:
            month = num
            break
    
    return f"{year}-{month}"


# ============================================================
# DATA LOADING
# ============================================================

def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """
    Load articles from JSON file.
    
    Args:
        filepath (str): Path to articles JSON file
    
    Returns:
        list: Article objects with title, content, date, etc.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# MENTION DETECTION
# ============================================================

def find_all_mentions(articles, target):
    """
    Find ALL articles mentioning the target.
    Groups results by time period.
    
    Args:
        articles (list): All articles
        target (str): Target entity name
    
    Returns:
        tuple: (by_period dict, sorted periods, total articles, total mentions)
    """
    terms = expand_target(target)
    logger.info(f"Scanning articles for: {target}")
    logger.debug(f"Search terms: {terms[:5]}... ({len(terms)} total)")
    
    by_period = defaultdict(list)
    total_mentions = 0
    
    for article in articles:
        content = article.get("content", "")
        title = article.get("title", "")
        full_text = f"{title}\n{content}"
        
        mentions = count_mentions(full_text, terms)
        
        if mentions > 0:
            period = parse_date_to_period(article.get("date", ""))
            
            by_period[period].append({
                "title": title,
                "content": content,
                "date": article.get("date", "Unknown"),
                "url": article.get("url", ""),
                "mentions": mentions
            })
            total_mentions += mentions
    
    # Sort periods chronologically
    sorted_periods = sorted(by_period.keys())
    
    # Log statistics
    total_articles = sum(len(arts) for arts in by_period.values())
    logger.info(f"Found: {total_articles} articles with {total_mentions} mentions")
    logger.info(f"Periods: {len(sorted_periods)}")
    for period in sorted_periods:
        arts = by_period[period]
        mentions = sum(a["mentions"] for a in arts)
        logger.debug(f"  {period}: {len(arts)} articles, {mentions} mentions")
    
    return by_period, sorted_periods, total_articles, total_mentions




# ============================================================
# SENTIMENT ANALYSIS
# ============================================================

def analyze_period(articles, target, period, client):
    """
    Analyze sentiment for a specific time period using LLM.
    
    The LLM understands context, relationships, and factions,
    providing nuanced sentiment analysis beyond simple keywords.
    
    Args:
        articles (list): Articles for this period mentioning target
        target (str): Target entity name
        period (str): Time period (YYYY-MM)
        client: Groq API client
    
    Returns:
        dict: Sentiment analysis with summary, evidence, and confidence
    """
    if not articles:
        return None
    
    # Build context from articles, prioritizing most relevant
    context_parts = []
    total_chars = 0
    max_chars = 8000  # Per period limit
    
    # Sort by mention count (most relevant first)
    sorted_articles = sorted(articles, key=lambda x: x["mentions"], reverse=True)
    
    for art in sorted_articles:
        chunk = f"[{art['title']}]\n{art['content'][:1500]}"  # Truncate long articles
        
        if total_chars + len(chunk) > max_chars:
            break
        
        context_parts.append(chunk)
        total_chars += len(chunk)
    
    context = "\n\n---\n\n".join(context_parts)
    
    prompt = f"""Analyze sentiment toward "{target}" in these Arabic articles from period {period}.

CRITICAL INSTRUCTION - READ CAREFULLY:
You MUST analyze ONLY the sentiment expressed directly TOWARD "{target}".
DO NOT analyze general article sentiment.
DO NOT analyze sentiment toward other entities.

ONLY consider sentences/paragraphs that:
1. Directly mention "{target}"
2. Describe actions BY or TOWARD "{target}"
3. Express opinions/judgments ABOUT "{target}"

IGNORE:
- General article tone (unless about {target})
- Sentiment toward other entities (Russia, USA, etc.)
- Sentences that only mention {target} in passing

EXAMPLE:
Article: "روسيا تتهم المعارضة. تركيا حضرت الاجتماع."
Target: تركيا
✅ ANALYZE: "تركيا حضرت الاجتماع" → neutral statement
❌ IGNORE: "روسيا تتهم المعارضة" → about Russia, not Turkey!

OUTPUT JSON ONLY (no other text):
{{
    "period": "{period}",
    "sentiment": "positive" | "negative" | "neutral" | "mixed",
    "score": -1.0 to 1.0,
    "article_count": {len(articles)},
    "key_themes": ["theme1", "theme2"],
    "evidence": [
        {{"quote": "اقتباس عربي يذكر {target}", "sentiment": "positive/negative"}}
    ],
    "reasoning": "Brief explanation of sentiment toward {target} specifically"
}}

ARTICLES:
{context}

JSON:"""

    try:
        response = client.chat.completions.create(
            model="qwen/qwen3-32b",
            messages=[
                {"role": "system", "content": "You are a JSON API. Output valid JSON only. No <think> tags."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=1500
        )
        
        result = response.choices[0].message.content
        
        # Clean response - remove thinking tags if present
        result = re.sub(r'<think>.*?</think>', '', result, flags=re.DOTALL)
        result = result.strip()
        
        # Extract JSON from response
        start = result.find('{')
        end = result.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
        
    except Exception as e:
        logger.error(f"Error analyzing period {period}: {e}", exc_info=True)
    
    return None


# ============================================================
# MAIN ANALYSIS WORKFLOW
# ============================================================

def analyze_sentiment_timeline(targets, client, articles_path="data/sydialogue_ar_publications.json"):
    """
    Main entry point for sentiment timeline analysis.
    
    Analyzes sentiment evolution for target entities across all time periods
    in the articles dataset. Returns comprehensive results grouped by target
    and period with sentiment scores, evidence, and themes.
    
    Args:
        targets (list): Entity names to analyze (e.g., ['Assad', 'HTS'])
        client: Groq API client for LLM sentiment analysis
        articles_path (str): Path to articles JSON file
    
    Returns:
        dict: Results containing sentiment timeline for each target with:
              - timeline (list): Period-by-period analysis
              - total_articles (int): Articles mentioning target
              - total_mentions (int): Total mention count
              - error (str): Error message if analysis failed
    """
    logger.info("="*60)
    logger.info("COMPREHENSIVE SENTIMENT ANALYSIS WITH TIMELINE")
    logger.info("="*60)
    
    # Load all articles
    articles = load_articles(articles_path)
    logger.info(f"Loaded {len(articles)} total articles")
    
    results = {
        "targets": {}
    }
    
    for target in targets:
        # Find ALL mentions of target across articles
        by_period, sorted_periods, total_articles, total_mentions = find_all_mentions(articles, target)
        
        if not by_period:
            results["targets"][target] = {
                "error": "No mentions found",
                "timeline": [],
                "total_articles": 0,
                "total_mentions": 0
            }
            continue
        
        # Analyze sentiment for each time period
        logger.info(f"Analyzing {len(sorted_periods)} periods for '{target}'...")
        
        timeline = []
        all_evidence = []
        all_themes = []
        score_sum = 0
        score_count = 0
        
        for period in sorted_periods:
            period_articles = by_period[period]
            logger.info(f"  Analyzing {period} ({len(period_articles)} articles)...")
            
            period_analysis = analyze_period(period_articles, target, period, client)
            
            if period_analysis:
                timeline.append({
                    "period": period,
                    "sentiment": period_analysis.get("sentiment", "neutral"),
                    "score": period_analysis.get("score", 0),
                    "article_count": len(period_articles),
                    "mention_count": sum(a["mentions"] for a in period_articles),
                    "themes": period_analysis.get("key_themes", []),
                    "reasoning": period_analysis.get("reasoning", "")
                })
                
                # Collect evidence with period info
                for ev in period_analysis.get("evidence", []):
                    ev["period"] = period
                    all_evidence.append(ev)
                
                all_themes.extend(period_analysis.get("key_themes", []))
                
                if period_analysis.get("score") is not None:
                    score_sum += period_analysis["score"]
                    score_count += 1
        
        # Calculate overall sentiment from average score
        avg_score = score_sum / score_count if score_count > 0 else 0
        overall_sentiment = "negative" if avg_score < -0.2 else "positive" if avg_score > 0.2 else "neutral"
        
        # Detect trend across time periods
        if len(timeline) >= 2:
            first_half = [t["score"] for t in timeline[:len(timeline)//2]]
            second_half = [t["score"] for t in timeline[len(timeline)//2:]]
            first_avg = sum(first_half) / len(first_half) if first_half else 0
            second_avg = sum(second_half) / len(second_half) if second_half else 0
            
            if second_avg > first_avg + 0.2:
                trend = "improving"
            elif second_avg < first_avg - 0.2:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        # Compile final results for this target
        results["targets"][target] = {
            "overall_sentiment": overall_sentiment,
            "overall_score": round(avg_score, 2),
            "trend": trend,
            "total_articles": total_articles,
            "total_mentions": total_mentions,
            "periods_analyzed": len(timeline),
            "timeline": timeline,
            "evidence": all_evidence[:15],  # Top 15 quotes
            "key_themes": list(set(all_themes))[:10],
            "reasoning": f"Based on {total_articles} articles across {len(timeline)} time periods. Overall sentiment is {overall_sentiment} with {trend} trend."
        }
    
    return results


# ============================================================
# BACKWARDS COMPATIBILITY
# ============================================================

def analyze_sentiment(targets, client, n_chunks=None):
    """
    Wrapper for backwards compatibility with existing code.
    
    Args:
        targets (list): Entity names to analyze
        client: Groq API client
        n_chunks (int): Ignored - analysis includes all articles
    
    Returns:
        str: JSON string with sentiment analysis results
    """
    result = analyze_sentiment_timeline(targets, client)
    return json.dumps(result, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    # Test sentiment analysis
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    result = analyze_sentiment_timeline(["الأسد"], client)
    logger.info("="*60)
    logger.info("SENTIMENT ANALYSIS RESULT:")
    logger.info("="*60)
    logger.info(json.dumps(result, ensure_ascii=False, indent=2))