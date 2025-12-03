"""
Relationship Mapper
===================

Extracts and maps relationships between entities (factions, countries, actors)
from Syrian Dialogue Center articles.

Uses DeepSeek R1 for reasoning about complex relationships.

Output: Network graph data + relationship timeline
"""

import json
import re
from collections import defaultdict
from groq import Groq
import os

# ============================================================
# ENTITY DEFINITIONS
# ============================================================

# Core entities we're tracking
ENTITIES = {
    # Syrian Government
    "النظام": {"name_en": "Assad Regime", "type": "government", "aliases": ["الأسد", "بشار", "نظام الأسد", "النظام السوري"]},
    
    # Opposition / Rebel Groups
    "هتش": {"name_en": "HTS", "type": "rebel", "aliases": ["هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع", "أحمد الشرع"]},
    "المعارضة": {"name_en": "Opposition", "type": "rebel", "aliases": ["الثوار", "الفصائل", "الجيش الحر", "فصائل المعارضة"]},
    "قسد": {"name_en": "SDF", "type": "rebel", "aliases": ["قوات سوريا الديمقراطية", "الأكراد", "الكرد", "الإدارة الذاتية", "pyd", "ypg"]},
    "داعش": {"name_en": "ISIS", "type": "terrorist", "aliases": ["الدولة الإسلامية", "تنظيم الدولة", "داعش"]},
    
    # Foreign Powers
    "روسيا": {"name_en": "Russia", "type": "foreign_power", "aliases": ["الروس", "موسكو", "بوتين", "الروسي"]},
    "أمريكا": {"name_en": "USA", "type": "foreign_power", "aliases": ["الولايات المتحدة", "واشنطن", "الأمريكي", "الإدارة الأمريكية"]},
    "إيران": {"name_en": "Iran", "type": "foreign_power", "aliases": ["طهران", "الإيراني", "الحرس الثوري", "حزب الله"]},
    "تركيا": {"name_en": "Turkey", "type": "foreign_power", "aliases": ["أنقرة", "أردوغان", "التركي"]},
    "إسرائيل": {"name_en": "Israel", "type": "foreign_power", "aliases": ["الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني"]},
    
    # Regional
    "حزب الله": {"name_en": "Hezbollah", "type": "militia", "aliases": ["حزب الله اللبناني"]},
    "الميليشيات": {"name_en": "Pro-Iran Militias", "type": "militia", "aliases": ["الميليشيات الإيرانية", "الميليشيات الشيعية"]},
}

# Relationship types
RELATIONSHIP_TYPES = [
    "alliance",      # تحالف - working together
    "conflict",      # صراع - actively fighting
    "tension",       # توتر - strained relations
    "negotiation",   # تفاوض - in talks
    "support",       # دعم - one supports another
    "opposition",    # معارضة - one opposes another
    "neutral",       # حياد - no clear relationship
]


def get_all_aliases():
    """Get flat list of all entity aliases for text matching."""
    all_terms = []
    for entity_id, info in ENTITIES.items():
        all_terms.append(entity_id)
        all_terms.extend(info.get("aliases", []))
    return all_terms


def find_entities_in_text(text):
    """Find which entities are mentioned in text."""
    if not text:
        return set()
    
    text_lower = text.lower()
    found = set()
    
    for entity_id, info in ENTITIES.items():
        # Check main name
        if entity_id in text:
            found.add(entity_id)
            continue
        
        # Check aliases
        for alias in info.get("aliases", []):
            if alias.lower() in text_lower or alias in text:
                found.add(entity_id)
                break
    
    return found


def parse_date_to_period(date_str):
    """Parse Arabic date to YYYY-MM."""
    if not date_str:
        return "unknown"
    
    ar_months = {
        'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04',
        'مايو': '05', 'يونيو': '06', 'يوليو': '07', 'أغسطس': '08',
        'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12',
        'كانون الثاني': '01', 'شباط': '02', 'آذار': '03', 'نيسان': '04',
        'أيار': '05', 'حزيران': '06', 'تموز': '07', 'آب': '08',
        'أيلول': '09', 'تشرين الأول': '10', 'تشرين الثاني': '11', 'كانون الأول': '12',
    }
    
    year_match = re.search(r'(20\d{2})', date_str)
    if not year_match:
        return "unknown"
    year = year_match.group(1)
    
    month = "01"
    for ar_month, num in ar_months.items():
        if ar_month in date_str:
            month = num
            break
    
    return f"{year}-{month}"


def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """Load all articles."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def find_articles_with_entity_pairs(articles):
    """
    Find all articles that mention at least 2 entities.
    These are candidates for relationship extraction.
    """
    pair_articles = defaultdict(list)
    
    for article in articles:
        content = article.get("content", "")
        title = article.get("title", "")
        full_text = f"{title}\n{content}"
        
        entities = find_entities_in_text(full_text)
        
        if len(entities) >= 2:
            # Create pairs
            entity_list = sorted(list(entities))
            for i, e1 in enumerate(entity_list):
                for e2 in entity_list[i+1:]:
                    pair_key = f"{e1}|{e2}"
                    pair_articles[pair_key].append({
                        "title": title,
                        "content": content[:3000],  # Truncate
                        "date": article.get("date", ""),
                        "period": parse_date_to_period(article.get("date", "")),
                        "url": article.get("url", "")
                    })
    
    return pair_articles


def analyze_relationship(entity1, entity2, articles, client, max_articles=10):
    """
    Analyze relationship between two entities using LLM.
    Uses DeepSeek R1 for reasoning.
    """
    if not articles:
        return None
    
    # Get entity info
    e1_info = ENTITIES.get(entity1, {"name_en": entity1})
    e2_info = ENTITIES.get(entity2, {"name_en": entity2})
    
    # Build context from articles (most recent first)
    sorted_articles = sorted(articles, key=lambda x: x.get("period", ""), reverse=True)[:max_articles]
    
    context_parts = []
    for art in sorted_articles:
        context_parts.append(f"[{art['date']}] {art['title']}\n{art['content'][:1000]}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    prompt = f"""Analyze the relationship between these two entities based on the Arabic articles:

ENTITY 1: {entity1} ({e1_info.get('name_en', entity1)}) - {e1_info.get('type', 'unknown')}
ENTITY 2: {entity2} ({e2_info.get('name_en', entity2)}) - {e2_info.get('type', 'unknown')}

Based on the articles, determine:
1. What is the nature of their relationship?
2. Is there evidence of alliance, conflict, tension, support, or opposition?
3. Has the relationship changed over time?
4. What are the key themes in their interaction?

ARTICLES:
{context}

Respond with JSON only:
{{
    "entity1": "{entity1}",
    "entity1_en": "{e1_info.get('name_en', entity1)}",
    "entity2": "{entity2}",
    "entity2_en": "{e2_info.get('name_en', entity2)}",
    "relationship_type": "alliance|conflict|tension|support|opposition|negotiation|neutral",
    "strength": 0.0 to 1.0,
    "direction": "mutual|e1_to_e2|e2_to_e1",
    "description": "brief description of relationship",
    "key_themes": ["theme1", "theme2"],
    "evidence": [
        {{"quote": "Arabic quote", "date": "date"}}
    ],
    "evolution": "stable|improving|deteriorating|fluctuating"
}}

JSON:"""

    try:
        response = client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=2000
        )
        
        result = response.choices[0].message.content
        
        # Extract JSON (DeepSeek includes <think> reasoning)
        # Find JSON after the thinking
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            return json.loads(json_match.group())
        
    except Exception as e:
        print(f"Error analyzing {entity1}-{entity2}: {e}")
    
    return None


def build_relationship_map(client, articles_path="data/sydialogue_ar_publications.json", min_articles=3):
    """
    Build complete relationship map from all articles.
    
    Returns network graph data and relationship details.
    """
    print("\n" + "="*60)
    print("BUILDING RELATIONSHIP MAP")
    print("="*60)
    
    # Load articles
    articles = load_articles(articles_path)
    print(f"Loaded {len(articles)} articles")
    
    # Find entity pairs
    pair_articles = find_articles_with_entity_pairs(articles)
    print(f"Found {len(pair_articles)} entity pairs")
    
    # Filter to pairs with enough articles
    significant_pairs = {k: v for k, v in pair_articles.items() if len(v) >= min_articles}
    print(f"Pairs with {min_articles}+ articles: {len(significant_pairs)}")
    
    # Analyze each pair
    relationships = []
    nodes = set()
    
    for pair_key, pair_arts in sorted(significant_pairs.items(), key=lambda x: -len(x[1])):
        entity1, entity2 = pair_key.split("|")
        print(f"\nAnalyzing: {entity1} <-> {entity2} ({len(pair_arts)} articles)")
        
        analysis = analyze_relationship(entity1, entity2, pair_arts, client)
        
        if analysis:
            nodes.add(entity1)
            nodes.add(entity2)
            
            relationships.append({
                "source": entity1,
                "target": entity2,
                "source_en": analysis.get("entity1_en", entity1),
                "target_en": analysis.get("entity2_en", entity2),
                "type": analysis.get("relationship_type", "neutral"),
                "strength": analysis.get("strength", 0.5),
                "direction": analysis.get("direction", "mutual"),
                "description": analysis.get("description", ""),
                "themes": analysis.get("key_themes", []),
                "evidence": analysis.get("evidence", []),
                "evolution": analysis.get("evolution", "stable"),
                "article_count": len(pair_arts)
            })
    
    # Build nodes with metadata
    node_list = []
    for node_id in nodes:
        info = ENTITIES.get(node_id, {})
        node_list.append({
            "id": node_id,
            "name_en": info.get("name_en", node_id),
            "type": info.get("type", "unknown")
        })
    
    return {
        "nodes": node_list,
        "edges": relationships,
        "stats": {
            "total_articles": len(articles),
            "entity_pairs_found": len(pair_articles),
            "relationships_analyzed": len(relationships)
        }
    }


def get_relationship_timeline(entity1, entity2, client, articles_path="data/sydialogue_ar_publications.json"):
    """
    Get how relationship between two entities evolved over time.
    """
    articles = load_articles(articles_path)
    pair_articles = find_articles_with_entity_pairs(articles)
    
    pair_key = f"{min(entity1, entity2)}|{max(entity1, entity2)}"
    if pair_key not in pair_articles:
        # Try reverse
        pair_key = f"{max(entity1, entity2)}|{min(entity1, entity2)}"
    
    if pair_key not in pair_articles:
        return {"error": f"No articles found discussing both {entity1} and {entity2}"}
    
    arts = pair_articles[pair_key]
    
    # Group by period
    by_period = defaultdict(list)
    for art in arts:
        by_period[art["period"]].append(art)
    
    # Analyze each period
    timeline = []
    for period in sorted(by_period.keys()):
        period_arts = by_period[period]
        
        analysis = analyze_relationship(entity1, entity2, period_arts, client, max_articles=5)
        
        if analysis:
            timeline.append({
                "period": period,
                "relationship_type": analysis.get("relationship_type"),
                "strength": analysis.get("strength"),
                "description": analysis.get("description"),
                "article_count": len(period_arts)
            })
    
    return {
        "entity1": entity1,
        "entity2": entity2,
        "timeline": timeline
    }


if __name__ == "__main__":
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    # Build full map
    result = build_relationship_map(client, min_articles=5)
    
    print("\n" + "="*60)
    print("RELATIONSHIP MAP RESULTS")
    print("="*60)
    print(json.dumps(result, ensure_ascii=False, indent=2))