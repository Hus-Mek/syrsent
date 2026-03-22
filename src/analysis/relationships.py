"""
Relationship Mapper v2
======================

Tracks relationships between Syrian political entities OVER TIME.
Differentiates between:
- Assad Regime (pre-December 2024)
- New Syrian Government / HTS-led (post-December 2024)

Provides article references and timeline evolution of relationships
between all tracked entities.
"""

import json
import re
import logging
from collections import defaultdict
from groq import Groq
import os

# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ============================================================
# ENTITY DEFINITIONS - Updated for political transition
# ============================================================

ENTITIES = {
    # OLD REGIME (pre-Dec 2024)
    "نظام_الأسد": {
        "name_en": "Assad Regime",
        "name_ar": "نظام الأسد",
        "type": "former_government",
        "active_period": {"end": "2024-12"},
        "aliases": ["الأسد", "بشار", "نظام الأسد", "النظام السوري", "النظام البائد", "الأسدي", "بشار الأسد", "النظام"]
    },
    
    # NEW GOVERNMENT (post-Dec 2024)
    "الحكومة_الجديدة": {
        "name_en": "New Syrian Government",
        "name_ar": "الحكومة السورية الجديدة",
        "type": "current_government", 
        "active_period": {"start": "2024-12"},
        "aliases": ["الحكومة الجديدة", "الحكومة السورية", "الحكومة الانتقالية", "الإدارة الجديدة", "حكومة دمشق"]
    },
    
    # HTS / Jolani / Sharaa
    "هتش": {
        "name_en": "HTS / Al-Sharaa",
        "name_ar": "هيئة تحرير الشام",
        "type": "ruling_faction",
        "aliases": ["هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع", "أحمد الشرع", "الهيئة", "جبهة النصرة", "أبو محمد الجولاني"]
    },
    
    # Opposition (general)
    "المعارضة": {
        "name_en": "Syrian Opposition",
        "name_ar": "المعارضة السورية",
        "type": "opposition",
        "aliases": ["الثوار", "الفصائل", "الجيش الحر", "فصائل المعارضة", "الجيش الوطني", "المعارضة السورية"]
    },
    
    # SDF / Kurds
    "قسد": {
        "name_en": "SDF / Kurdish Forces",
        "name_ar": "قوات سوريا الديمقراطية",
        "type": "armed_faction",
        "aliases": ["قوات سوريا الديمقراطية", "الأكراد", "الكرد", "الإدارة الذاتية", "ب ي د", "الوحدات الكردية"]
    },
    
    # ISIS
    "داعش": {
        "name_en": "ISIS",
        "name_ar": "داعش",
        "type": "terrorist",
        "aliases": ["الدولة الإسلامية", "تنظيم الدولة", "داعش"]
    },
    
    # FOREIGN POWERS
    "روسيا": {
        "name_en": "Russia",
        "name_ar": "روسيا",
        "type": "foreign_power",
        "aliases": ["الروس", "موسكو", "بوتين", "الروسي", "الجانب الروسي"]
    },
    
    "أمريكا": {
        "name_en": "United States",
        "name_ar": "الولايات المتحدة",
        "type": "foreign_power",
        "aliases": ["الولايات المتحدة", "واشنطن", "الأمريكي", "الإدارة الأمريكية", "البيت الأبيض"]
    },
    
    "إيران": {
        "name_en": "Iran",
        "name_ar": "إيران",
        "type": "foreign_power",
        "aliases": ["طهران", "الإيراني", "الحرس الثوري", "النظام الإيراني"]
    },
    
    "تركيا": {
        "name_en": "Turkey",
        "name_ar": "تركيا",
        "type": "foreign_power",
        "aliases": ["أنقرة", "أردوغان", "التركي", "الجانب التركي"]
    },
    
    "إسرائيل": {
        "name_en": "Israel",
        "name_ar": "إسرائيل",
        "type": "foreign_power",
        "aliases": ["الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني", "الكيان"]
    },
    
    # Militias
    "حزب_الله": {
        "name_en": "Hezbollah",
        "name_ar": "حزب الله",
        "type": "militia",
        "aliases": ["حزب الله", "حزب الله اللبناني", "الحزب"]
    },
    
    "الميليشيات_الإيرانية": {
        "name_en": "Pro-Iran Militias",
        "name_ar": "الميليشيات الإيرانية",
        "type": "militia",
        "aliases": ["الميليشيات", "الميليشيات الإيرانية", "الميليشيات الشيعية", "الفصائل الموالية لإيران"]
    },
}

# ============================================================
# RELATIONSHIP TYPE DEFINITIONS
# ============================================================

# Relationship types with Arabic equivalents and visual colors
RELATIONSHIP_TYPES = {
    "alliance": {"ar": "تحالف", "color": "#4caf50"},
    "support": {"ar": "دعم", "color": "#8bc34a"},
    "conflict": {"ar": "صراع", "color": "#f44336"},
    "tension": {"ar": "توتر", "color": "#ff9800"},
    "opposition": {"ar": "معارضة", "color": "#ff5722"},
    "negotiation": {"ar": "تفاوض", "color": "#2196f3"},
    "neutral": {"ar": "حياد", "color": "#9e9e9e"},
    "cooperation": {"ar": "تعاون", "color": "#00bcd4"},
}


# ============================================================
# DATE AND PERIOD PARSING
# ============================================================

def parse_date_to_period(date_str):
    """
    Parse Arabic date string to YYYY-MM format for period grouping.
    
    Args:
        date_str (str): Arabic date string
    
    Returns:
        str: Period in format '2024-03' or 'unknown' if parse fails
    """
    if not date_str:
        return "unknown"
    
    # Arabic month to numeric month mapping
    ar_months = {
        'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
        'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
        'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12',
        'كانون الثاني': '01', 'شباط': '02', 'آذار': '03', 'نيسان': '04',
        'أيار': '05', 'حزيران': '06', 'تموز': '07', 'آب': '08',
        'أيلول': '09', 'تشرين الأول': '10', 'تشرين الثاني': '11', 'كانون الأول': '12',
    }
    
    # Extract year from date string
    year_match = re.search(r'(20\d{2})', date_str)
    if not year_match:
        return "unknown"
    year = year_match.group(1)
    
    # Extract month - default to January if not found
    month = "01"
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
        list: Article objects with title, content, date, url, etc.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# ENTITY DETECTION AND PAIRING
# ============================================================

def find_entities_in_text(text, period=None):
    """
    Find entities mentioned in text.
    
    If period provided, handles regime transition (distinguishing
    Assad regime references from new government references).
    
    Args:
        text (str): Text to search for entity mentions
        period (str): Time period (YYYY-MM) for context-aware detection
    
    Returns:
        set: Entity IDs found in text
    """
    if not text:
        return set()
    
    found = set()
    
    for entity_id, info in ENTITIES.items():
        # Check if entity is active in this period
        if period and period != "unknown":
            active = info.get("active_period", {})
            # If entity has an end date and we're past it, still detect but will be labeled
            if active.get("end") and period > active["end"]:
                pass  # Entity no longer active but still detectable
            # If entity has a start date and we're before it, skip
            if active.get("start") and period < active["start"]:
                continue
        
        # Check if any alias appears in text
        for alias in info.get("aliases", []):
            if alias in text:
                found.add(entity_id)
                break
    
    return found


def find_articles_with_entity_pairs(articles):
    """
    Find articles mentioning at least 2 entities, grouped by time period.
    
    Args:
        articles (list): All articles
    
    Returns:
        dict: Nested dict {pair_key: {period: [articles with both entities]}}
    """
    pair_articles = defaultdict(lambda: defaultdict(list))
    
    for article in articles:
        content = article.get("content", "")
        title = article.get("title", "")
        full_text = f"{title}\n{content}"
        period = parse_date_to_period(article.get("date", ""))
        
        # Find all entities in this article
        entities = find_entities_in_text(full_text, period)
        
        # If 2+ entities found, record all entity pairs
        if len(entities) >= 2:
            entity_list = sorted(list(entities))
            for i, e1 in enumerate(entity_list):
                for e2 in entity_list[i+1:]:
                    pair_key = f"{e1}|{e2}"
                    pair_articles[pair_key][period].append({
                        "title": title,
                        "content": content[:2000],
                        "date": article.get("date", ""),
                        "period": period,
                        "url": article.get("url", "")
                    })
    
    return pair_articles




# ============================================================
# RELATIONSHIP ANALYSIS
# ============================================================

def analyze_relationship_period(entity1, entity2, articles, period, client):
    """
    Analyze relationship between two entities for a specific time period.
    
    Uses LLM to determine relationship type (alliance, conflict, etc.) based on
    article evidence. Carefully validates that relationships are explicitly
    supported by text mentioning both entities.
    
    Args:
        entity1 (str): First entity ID
        entity2 (str): Second entity ID
        articles (list): Articles mentioning both entities in this period
        period (str): Time period (YYYY-MM)
        client: Groq API client
    
    Returns:
        dict: Relationship analysis with type, strength, evidence, and article refs
    """
    if not articles:
        return None
    
    # Get entity information
    e1_info = ENTITIES.get(entity1, {"name_en": entity1, "name_ar": entity1})
    e2_info = ENTITIES.get(entity2, {"name_en": entity2, "name_ar": entity2})
    
    # Build context from articles (max 8 per period to control token usage)
    context_parts = []
    for i, art in enumerate(articles[:8]):
        context_parts.append(f"[Article {i+1}] {art['title']}\nDate: {art['date']}\nURL: {art['url']}\n{art['content'][:800]}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Add political transition context if relevant
    transition_note = ""
    if period >= "2024-12":
        transition_note = """
IMPORTANT CONTEXT: As of December 2024, the Assad regime fell. The new Syrian government is led by former HTS/opposition figures.
- References to "النظام" (the regime) now typically mean the FORMER Assad regime
- The new government is led by Ahmed al-Sharaa (formerly known as al-Jolani)
- Distinguish between references to the old regime vs new government
"""
    
    prompt = f"""You are analyzing the relationship between two specific entities based on Arabic news articles.

ENTITY 1: {e1_info.get('name_ar')} ({e1_info.get('name_en')})
ENTITY 2: {e2_info.get('name_ar')} ({e2_info.get('name_en')})
{transition_note}

CRITICAL RULES - YOU MUST FOLLOW THESE:

1. ONLY analyze content that EXPLICITLY discusses interactions between {e1_info.get('name_en')} and {e2_info.get('name_en')}.

2. REQUIRED for relationship evidence:
   ✅ Text must mention BOTH entities in the SAME context
   ✅ Text must describe an action, statement, or position by one toward the other
   ✅ You must provide an EXACT QUOTE that proves the interaction

3. DO NOT infer relationships from:
   ❌ Both entities mentioned separately in different parts of article
   ❌ Both entities doing similar things (unless explicitly coordinating)
   ❌ Third-party statements about both entities
   ❌ General regional dynamics

4. DISTINGUISH accusations from facts:
   ✅ "Russia accuses Turkey of X" = Russia-Turkey interaction
   ❌ "Russia accuses Turkey of X" ≠ evidence that X is true
   
5. If NO direct interaction exists:
   - Set relationship_type = "no_data"
   - Set has_direct_content = false
   - State: "No direct interaction between these entities found"
   - DO NOT fabricate or infer a relationship

ARTICLES FROM {period}:
{context}

VERIFICATION CHECKLIST (answer before providing JSON):
□ Did I find text that mentions BOTH {e1_info.get('name_en')} AND {e2_info.get('name_en')} together?
□ Does that text describe a direct interaction/statement between them?
□ Can I provide an exact quote proving this interaction?
□ Am I accurately representing what the text says (not inverting or fabricating)?

If you answered NO to any question above, you MUST return "no_data".

Respond with JSON only:
{{
    "relationship_type": "alliance|conflict|tension|support|opposition|negotiation|neutral|cooperation|no_data",
    "strength": 0.0 to 1.0,
    "sentiment": "positive|negative|neutral",
    "description": "ONE sentence describing the DIRECT interaction between {e1_info.get('name_en')} and {e2_info.get('name_en')}. If no interaction: 'No direct interaction found.'",
    "description_ar": "وصف مختصر بالعربية",
    "key_events": ["ONLY events involving BOTH entities directly"],
    "evidence": [
        {{
            "quote": "EXACT Arabic quote showing BOTH {e1_info.get('name_ar')} AND {e2_info.get('name_ar')} interacting",
            "article_index": 1,
            "interpretation": "What this quote proves about the {e1_info.get('name_en')}-{e2_info.get('name_en')} relationship"
        }}
    ],
    "article_references": [article numbers that contain direct interaction evidence],
    "has_direct_content": true|false
}}

EXAMPLES OF CORRECT ANALYSIS:

Example 1 - No Relationship:
Article: "Russia accused of chemical weapons use in Syria"
Entity pair: US-Turkey
✅ CORRECT: {{"relationship_type": "no_data", "has_direct_content": false, "description": "No direct interaction found."}}
❌ WRONG: Reporting anything about US-Turkey based on this article

Example 2 - Accusation (not relationship):
Article: "روسيا تتهم الولايات المتحدة وتركيا بدعم HTS"
Entity pair: US-Turkey  
✅ CORRECT: {{"relationship_type": "no_data", "description": "Article discusses Russian accusations, not US-Turkey direct interaction"}}
❌ WRONG: "US and Turkey cooperating"

Example 3 - Actual Relationship:
Article: "تركيا أعلنت رفضها للموقف الأمريكي بشأن القوات الكردية"
Entity pair: US-Turkey
✅ CORRECT: {{"relationship_type": "tension", "quote": "تركيا أعلنت رفضها للموقف الأمريكي", "description": "Turkey publicly rejected US position on Kurdish forces"}}

REMEMBER: If you cannot find a direct quote showing BOTH entities interacting, you MUST return "no_data". Do not fabricate relationships."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        
        result = response.choices[0].message.content
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            parsed = json.loads(json_match.group())
            
            # Add article URLs to evidence
            if parsed.get("evidence"):
                for ev in parsed["evidence"]:
                    idx = ev.get("article_index", 1) - 1
                    if 0 <= idx < len(articles):
                        ev["article_url"] = articles[idx].get("url", "")
                        ev["article_title"] = articles[idx].get("title", "")
            
            # Add referenced articles to result
            parsed["articles"] = []
            for idx in parsed.get("article_references", []):
                if 0 < idx <= len(articles):
                    art = articles[idx-1]
                    parsed["articles"].append({
                        "title": art["title"],
                        "url": art["url"],
                        "date": art["date"]
                    })
            
            return parsed
            
    except Exception as e:
        logger.error(f"Error analyzing {entity1}-{entity2} for {period}: {e}", exc_info=True)
    
    return None


# ============================================================
# TIMELINE BUILDING
# ============================================================

def build_relationship_timeline(entity1, entity2, client, articles_path="data/sydialogue_ar_publications.json", min_articles_per_period=2):
    """
    Build timeline of relationship between two entities.
    
    Analyzes sentiment evolution across all time periods where both
    entities are mentioned together.
    
    Args:
        entity1 (str): First entity ID
        entity2 (str): Second entity ID
        client: Groq API client
        articles_path (str): Path to articles JSON file
        min_articles_per_period (int): Minimum articles needed to analyze a period
    
    Returns:
        dict: Timeline data with entity info, periods, trend, and article count
    """
    articles = load_articles(articles_path)
    pair_articles = find_articles_with_entity_pairs(articles)
    
    # Try both orderings of the entity pair
    pair_key = f"{entity1}|{entity2}"
    if pair_key not in pair_articles:
        pair_key = f"{entity2}|{entity1}"
    
    if pair_key not in pair_articles:
        return {"error": f"No articles found discussing both entities"}
    
    periods_data = pair_articles[pair_key]
    
    # Analyze each time period
    timeline = []
    all_articles = []
    
    for period in sorted(periods_data.keys()):
        if period == "unknown":
            continue
            
        period_arts = periods_data[period]
        if len(period_arts) < min_articles_per_period:
            continue
        
        logger.info(f"  Analyzing {period}: {len(period_arts)} articles")
        
        analysis = analyze_relationship_period(entity1, entity2, period_arts, period, client)
        
        if analysis:
            timeline.append({
                "period": period,
                "article_count": len(period_arts),
                **analysis
            })
            all_articles.extend(period_arts)
    
    # Calculate overall trend across time periods
    if len(timeline) >= 2:
        first_half = timeline[:len(timeline)//2]
        second_half = timeline[len(timeline)//2:]
        
        # Helper function to score relationship sentiment
        def sentiment_score(relationship_type):
            """Convert relationship type to numeric score."""
            if relationship_type in ["alliance", "support", "cooperation"]:
                return 1
            elif relationship_type in ["conflict", "opposition"]:
                return -1
            elif relationship_type == "tension":
                return -0.5
            return 0
        
        first_avg = sum(sentiment_score(t.get("relationship_type", "neutral")) for t in first_half) / len(first_half)
        second_avg = sum(sentiment_score(t.get("relationship_type", "neutral")) for t in second_half) / len(second_half)
        
        if second_avg > first_avg + 0.3:
            trend = "improving"
        elif second_avg < first_avg - 0.3:
            trend = "deteriorating"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    # Compile final result
    e1_info = ENTITIES.get(entity1, {})
    e2_info = ENTITIES.get(entity2, {})
    
    return {
        "entity1": {
            "id": entity1,
            "name_en": e1_info.get("name_en", entity1),
            "name_ar": e1_info.get("name_ar", entity1),
            "type": e1_info.get("type", "unknown")
        },
        "entity2": {
            "id": entity2,
            "name_en": e2_info.get("name_en", entity2),
            "name_ar": e2_info.get("name_ar", entity2),
            "type": e2_info.get("type", "unknown")
        },
        "trend": trend,
        "periods_analyzed": len(timeline),
        "total_articles": len(all_articles),
        "timeline": timeline
    }


def build_relationship_map(client, articles_path="data/sydialogue_ar_publications.json", min_articles=5, max_pairs=20):
    """
    Build comprehensive relationship map with timelines.
    
    Identifies top entity pairs and analyzes their relationship evolution
    across all time periods. Results include nodes (entities), edges (relationships),
    and temporal trends.
    
    Args:
        client: Groq API client
        articles_path (str): Path to articles JSON file
        min_articles (int): Minimum articles required for pair analysis
        max_pairs (int): Maximum number of pairs to analyze
    
    Returns:
        dict: Nodes (entities), relationships (with timelines), and statistics
    """
    logger.info("="*60)
    logger.info("BUILDING RELATIONSHIP MAP WITH TIMELINES")
    logger.info("="*60)
    
    articles = load_articles(articles_path)
    logger.info(f"Loaded {len(articles)} articles")
    
    pair_articles = find_articles_with_entity_pairs(articles)
    logger.info(f"Found {len(pair_articles)} entity pairs")
    
    # Count total articles per pair
    pair_totals = {}
    for pair_key, periods in pair_articles.items():
        total = sum(len(arts) for arts in periods.values())
        if total >= min_articles:
            pair_totals[pair_key] = total
    
    logger.info(f"Pairs with {min_articles}+ articles: {len(pair_totals)}")
    
    # Sort by article count and take top pairs
    top_pairs = sorted(pair_totals.items(), key=lambda x: -x[1])[:max_pairs]
    
    relationships = []
    nodes = set()
    
    for pair_key, total_count in top_pairs:
        entity1, entity2 = pair_key.split("|")
        logger.info(f"Analyzing: {entity1} <-> {entity2} ({total_count} articles)")
        
        timeline_data = build_relationship_timeline(entity1, entity2, client, articles_path)
        
        if timeline_data and not timeline_data.get("error"):
            nodes.add(entity1)
            nodes.add(entity2)
            
            # Get most recent relationship type
            recent_type = "neutral"
            if timeline_data.get("timeline"):
                recent_type = timeline_data["timeline"][-1].get("relationship_type", "neutral")
            
            relationships.append({
                "source": entity1,
                "target": entity2,
                "source_info": timeline_data["entity1"],
                "target_info": timeline_data["entity2"],
                "current_relationship": recent_type,
                "trend": timeline_data.get("trend", "stable"),
                "total_articles": timeline_data.get("total_articles", 0),
                "periods_analyzed": timeline_data.get("periods_analyzed", 0),
                "timeline": timeline_data.get("timeline", [])
            })
    
    # Build nodes list
    node_list = []
    for node_id in nodes:
        info = ENTITIES.get(node_id, {})
        node_list.append({
            "id": node_id,
            "name_en": info.get("name_en", node_id),
            "name_ar": info.get("name_ar", node_id),
            "type": info.get("type", "unknown")
        })
    
    return {
        "nodes": node_list,
        "relationships": relationships,
        "stats": {
            "total_articles": len(articles),
            "entity_pairs_found": len(pair_articles),
            "relationships_analyzed": len(relationships)
        }
    }


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def get_entities_list():
    """
    Return list of all tracked entities with metadata.
    
    Returns:
        list: Entity objects with name, type, aliases, and active period
    """
    return [
        {
            "id": entity_id,
            "name_en": info.get("name_en", entity_id),
            "name_ar": info.get("name_ar", entity_id),
            "type": info.get("type", "unknown"),
            "aliases": info.get("aliases", []),
            "active_period": info.get("active_period", {})
        }
        for entity_id, info in ENTITIES.items()
    ]


# ============================================================
# MAIN / TEST
# ============================================================

if __name__ == "__main__":
    # Test single relationship timeline analysis
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    result = build_relationship_timeline("هتش", "تركيا", client)
    logger.info(json.dumps(result, ensure_ascii=False, indent=2))