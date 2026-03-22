"""
Retrieve relevant chunks from ChromaDB
======================================

COMPREHENSIVE SEARCH: Gets ALL chunks containing target keywords,
then ranks by relevance with most important first.

Uses multilingual embedding model for Arabic and English text.
Model: paraphrase-multilingual-MiniLM-L12-v2
"""

import chromadb
from chromadb.utils import embedding_functions
import re
import logging

# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ============================================================
# MULTILINGUAL MODEL - supports Arabic
# ============================================================
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Alias mappings for common targets
TARGET_ALIASES = {
    # Assad / Regime
    "assad": ["الأسد", "بشار", "النظام", "نظام الأسد", "البعث"],
    "الأسد": ["assad", "بشار", "النظام", "نظام الأسد", "البعث"],
    "النظام": ["الأسد", "بشار", "نظام الأسد", "assad", "البعث"],
    
    # HTS
    "hts": ["هتش", "هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع"],
    "هتش": ["hts", "هيئة تحرير الشام", "تحرير الشام", "الجولاني", "الشرع"],
    "الجولاني": ["هتش", "hts", "هيئة تحرير الشام", "الشرع", "أحمد الشرع"],
    "الشرع": ["الجولاني", "هتش", "hts", "هيئة تحرير الشام", "أحمد الشرع"],
    
    # Opposition
    "opposition": ["المعارضة", "الثوار", "الفصائل", "الجيش الحر"],
    "المعارضة": ["opposition", "الثوار", "الفصائل", "الجيش الحر"],
    
    # Russia
    "russia": ["روسيا", "الروس", "موسكو", "بوتين", "الروسي"],
    "روسيا": ["russia", "الروس", "موسكو", "بوتين", "الروسي"],
    
    # USA
    "usa": ["أمريكا", "الولايات المتحدة", "واشنطن", "الأمريكي", "أمريكي"],
    "أمريكا": ["usa", "الولايات المتحدة", "واشنطن", "الأمريكي"],
    
    # Iran
    "iran": ["إيران", "طهران", "الإيراني", "إيراني", "الحرس الثوري"],
    "إيران": ["iran", "طهران", "الإيراني", "إيراني"],
    
    # Turkey
    "turkey": ["تركيا", "أنقرة", "أردوغان", "التركي", "تركي"],
    "تركيا": ["turkey", "أنقرة", "أردوغان", "التركي"],
    
    # Israel
    "israel": ["إسرائيل", "الاحتلال", "الإسرائيلي", "تل أبيب"],
    "إسرائيل": ["israel", "الاحتلال", "الإسرائيلي", "تل أبيب"],
}


# ============================================================
# COLLECTION ACCESS
# ============================================================

def get_collection(db_path="data/chroma_db"):
    """
    Get the ChromaDB collection with multilingual embeddings.
    
    Args:
        db_path (str): Path to ChromaDB storage directory
    
    Returns:
        Collection: ChromaDB collection with embedding function
    """
    client = chromadb.PersistentClient(path=db_path)
    
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    return client.get_collection(
        name="syria_articles",
        embedding_function=embed_fn
    )


# ============================================================
# SEARCH UTILITIES
# ============================================================

def expand_targets(targets):
    """
    Expand target terms to include all aliases.
    
    Args:
        targets (list): Target entity names
    
    Returns:
        list: All search terms including aliases
    """
    expanded = set()
    
    for target in targets:
        target_lower = target.lower().strip()
        expanded.add(target)
        
        if target_lower in TARGET_ALIASES:
            expanded.update(TARGET_ALIASES[target_lower])
        if target in TARGET_ALIASES:
            expanded.update(TARGET_ALIASES[target])
    
    return list(expanded)


def count_keyword_matches(text, keywords):
    """
    Count how many times keywords appear in text.
    
    Args:
        text (str): Text to search
        keywords (list): Keywords to count
    
    Returns:
        int: Total keyword occurrences
    """
    text_lower = text.lower()
    count = 0
    for keyword in keywords:
        count += len(re.findall(re.escape(keyword.lower()), text_lower))
    return count


# ============================================================
# SEMANTIC SEARCH
# ============================================================

def search(query, targets, n_results=100):
    """
    Comprehensive semantic search with keyword filtering and relevance ranking.
    
    Strategy:
    1. Get large number of semantic matches from vector DB
    2. Filter to only chunks containing target keywords
    3. Score by: keyword frequency (50%) + semantic similarity (30%) + recency (20%)
    4. Return most relevant chunks first
    
    Args:
        query (str): Search query text
        targets (list): Target entity names to search for
        n_results (int): Maximum number of results to return
    
    Returns:
        list: Ranked chunks with text, metadata, and relevance scores
    """
    collection = get_collection()
    total_chunks = collection.count()
    
    expanded_targets = expand_targets(targets)
    logger.info(f"Original targets: {targets}")
    logger.info(f"Expanded to {len(expanded_targets)} terms: {expanded_targets[:5]}...")
    logger.debug(f"Total chunks in DB: {total_chunks}")
    
    # Get a large pool of semantic matches
    search_query = f"{query} {' '.join(targets)} {' '.join(expanded_targets[:5])}"
    
    # Request more results to filter from
    fetch_count = min(total_chunks, 500)  # Get up to 500 chunks
    
    results = collection.query(
        query_texts=[search_query],
        n_results=fetch_count,
        include=["documents", "metadatas", "distances"]
    )
    
    if not results["documents"] or not results["documents"][0]:
        logger.warning("No results from semantic search")
        return []
    
    # Score and filter chunks
    scored_chunks = []
    
    for i, doc in enumerate(results["documents"][0]):
        metadata = results["metadatas"][0][i]
        distance = results["distances"][0][i] if results.get("distances") else 1.0
        
        # Count keyword matches
        keyword_count = count_keyword_matches(doc, expanded_targets)
        
        # Skip chunks with no keyword matches (not relevant)
        if keyword_count == 0:
            continue
        
        # Calculate relevance score
        # Higher is better
        semantic_score = 1 / (1 + distance)  # Convert distance to similarity (0-1)
        keyword_score = min(keyword_count / 5, 1.0)  # Normalize (0-1), cap at 5 mentions
        
        # Recency bonus (newer articles score higher)
        date = metadata.get("date", "")
        recency_score = 0.5  # Default
        if "2025" in date:
            recency_score = 1.0
        elif "2024" in date:
            recency_score = 0.8
        elif "2023" in date:
            recency_score = 0.6
        
        # Combined score (weighted)
        total_score = (
            keyword_score * 0.5 +      # 50% keyword relevance
            semantic_score * 0.3 +     # 30% semantic similarity
            recency_score * 0.2        # 20% recency
        )
        
        scored_chunks.append({
            "text": doc,
            "title": metadata.get("title", "Unknown"),
            "date": metadata.get("date", "Unknown"),
            "url": metadata.get("url", ""),
            "score": total_score,
            "keyword_count": keyword_count,
            "semantic_score": semantic_score
        })
    
    # Sort by score (highest first)
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    
    # Ensure diversity: limit chunks per article
    seen_articles = {}
    diverse_chunks = []
    
    for chunk in scored_chunks:
        title = chunk["title"]
        if title not in seen_articles:
            seen_articles[title] = 0
        
        # Allow more chunks from highly relevant articles
        max_per_article = 3 if chunk["keyword_count"] >= 3 else 2
        
        if seen_articles[title] < max_per_article:
            diverse_chunks.append(chunk)
            seen_articles[title] += 1
        
        if len(diverse_chunks) >= n_results:
            break
    
    logger.info(f"Found {len(scored_chunks)} matching chunks from {len(seen_articles)} articles")
    logger.info(f"Returning top {len(diverse_chunks)} diverse chunks")
    
    if diverse_chunks:
        logger.debug(f"Top chunk score: {diverse_chunks[0]['score']:.3f} ({diverse_chunks[0]['keyword_count']} keywords)")
    
    return diverse_chunks


def get_all_mentions(targets, max_chunks=200):
    """
    Get ALL chunks mentioning the targets (exhaustive search).
    
    Use this for comprehensive analysis when you need complete coverage
    rather than just the most relevant results.
    
    Args:
        targets (list): Target entity names
        max_chunks (int): Maximum chunks to return
    
    Returns:
        list: All matching chunks sorted by keyword frequency
    """
    collection = get_collection()
    total_chunks = collection.count()
    
    expanded_targets = expand_targets(targets)
    logger.info(f"Searching for ALL mentions of: {expanded_targets}")
    
    # Get all chunks
    all_results = collection.get(
        include=["documents", "metadatas"]
    )
    
    if not all_results["documents"]:
        return []
    
    # Filter to chunks containing keywords
    matching_chunks = []
    
    for i, doc in enumerate(all_results["documents"]):
        keyword_count = count_keyword_matches(doc, expanded_targets)
        
        if keyword_count > 0:
            metadata = all_results["metadatas"][i]
            matching_chunks.append({
                "text": doc,
                "title": metadata.get("title", "Unknown"),
                "date": metadata.get("date", "Unknown"),
                "url": metadata.get("url", ""),
                "keyword_count": keyword_count
            })
    
    # Sort by keyword count (most mentions first)
    matching_chunks.sort(key=lambda x: x["keyword_count"], reverse=True)
    
    logger.info(f"Found {len(matching_chunks)} chunks mentioning targets out of {total_chunks} total")
    
    return matching_chunks[:max_chunks]


# ============================================================
# MAIN / TEST
# ============================================================

if __name__ == "__main__":
    logger.info("Testing comprehensive search...")
    
    # Test regular search
    results = search("sentiment opinion", ["هتش"])
    logger.info(f"Found {len(results)} chunks for 'هتش'")
    
    if results:
        logger.info("Top 3 results:")
        for i, r in enumerate(results[:3]):
            logger.info(f"  {i+1}. Score: {r['score']:.3f} | Keywords: {r['keyword_count']} | {r['title'][:40]}...")
    
    # Test get_all_mentions
    logger.info("="*50)
    all_mentions = get_all_mentions(["هتش"], max_chunks=10)
    logger.info("All mentions sample:")
    for i, r in enumerate(all_mentions[:5]):
        logger.info(f"  {i+1}. Keywords: {r['keyword_count']} | {r['title'][:40]}...")