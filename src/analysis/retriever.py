"""
Retrieve relevant chunks from ChromaDB
======================================

IMPORTANT: Uses multilingual model to support Arabic text.
Must match the model used in indexer.py!
"""

import chromadb
from chromadb.utils import embedding_functions

# ============================================================
# MULTILINGUAL MODEL - supports Arabic
# ============================================================
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Alias mappings for common targets
# When user searches for one term, we also search related terms
TARGET_ALIASES = {
    # Assad / Regime
    "assad": ["الأسد", "بشار", "النظام", "نظام الأسد", "البعث", "regime", "النظام السوري"],
    "الأسد": ["assad", "بشار", "النظام", "نظام الأسد", "البعث", "regime", "النظام السوري"],
    "النظام": ["الأسد", "بشار", "نظام الأسد", "assad", "regime", "النظام السوري"],
    
    # HTS / Hay'at Tahrir al-Sham
    "hts": ["هتش", "هيئة تحرير الشام", "تحرير الشام", "الهيئة", "الجولاني", "جبهة النصرة"],
    "هتش": ["hts", "هيئة تحرير الشام", "تحرير الشام", "الهيئة", "الجولاني", "جبهة النصرة"],
    "الجولاني": ["هتش", "hts", "هيئة تحرير الشام", "تحرير الشام", "الهيئة", "أحمد الشرع"],
    "الشرع": ["الجولاني", "هتش", "hts", "هيئة تحرير الشام", "أحمد الشرع"],
    
    # Opposition
    "opposition": ["المعارضة", "الثوار", "الفصائل", "الجيش الحر", "المعارضة السورية"],
    "المعارضة": ["opposition", "الثوار", "الفصائل", "الجيش الحر", "المعارضة السورية"],
    
    # Russia
    "russia": ["روسيا", "الروس", "موسكو", "بوتين", "الجانب الروسي"],
    "روسيا": ["russia", "الروس", "موسكو", "بوتين", "الجانب الروسي"],
    
    # USA / West
    "usa": ["أمريكا", "الولايات المتحدة", "واشنطن", "أمريكي", "الأمريكان"],
    "أمريكا": ["usa", "الولايات المتحدة", "واشنطن", "أمريكي", "الأمريكان"],
    "west": ["الغرب", "الغربي", "الدول الغربية", "أوروبا"],
    "الغرب": ["west", "الغربي", "الدول الغربية", "أوروبا"],
    
    # Iran
    "iran": ["إيران", "طهران", "الإيراني", "الحرس الثوري", "حزب الله"],
    "إيران": ["iran", "طهران", "الإيراني", "الحرس الثوري", "حزب الله"],
    
    # Turkey
    "turkey": ["تركيا", "أنقرة", "التركي", "أردوغان"],
    "تركيا": ["turkey", "أنقرة", "التركي", "أردوغان"],
    
    # Israel
    "israel": ["إسرائيل", "الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني"],
    "إسرائيل": ["israel", "الاحتلال", "الإسرائيلي", "تل أبيب", "الصهيوني"],
    
    # Civilians
    "civilians": ["المدنيين", "الشعب السوري", "المواطنين", "السوريين"],
    "المدنيين": ["civilians", "الشعب السوري", "المواطنين", "السوريين"],
}


def get_collection(db_path="data/chroma_db"):
    """Get the ChromaDB collection."""
    client = chromadb.PersistentClient(path=db_path)
    
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    return client.get_collection(
        name="syria_articles",
        embedding_function=embed_fn
    )


def expand_targets(targets):
    """
    Expand targets to include aliases.
    
    Example: ["هتش"] -> ["هتش", "هيئة تحرير الشام", "الجولاني", ...]
    """
    expanded = set()
    
    for target in targets:
        target_lower = target.lower().strip()
        expanded.add(target)
        
        # Check if this target has aliases
        if target_lower in TARGET_ALIASES:
            expanded.update(TARGET_ALIASES[target_lower])
        
        # Also check the original (non-lowered) for Arabic
        if target in TARGET_ALIASES:
            expanded.update(TARGET_ALIASES[target])
    
    return list(expanded)


def search(query, targets, n_results=100):
    """
    Search for relevant chunks about targets.
    
    Args:
        query: Base search query
        targets: List of target entities to search for
        n_results: Number of chunks to retrieve
    
    Returns:
        List of chunk dictionaries with text and metadata
    """
    collection = get_collection()
    
    # Expand targets to include aliases
    expanded_targets = expand_targets(targets)
    
    print(f"Original targets: {targets}")
    print(f"Expanded targets: {expanded_targets}")
    
    # Build search query with expanded targets
    search_query = f"{query} {' '.join(expanded_targets)}"
    
    print(f"Search query: {search_query[:100]}...")
    
    results = collection.query(
        query_texts=[search_query],
        n_results=n_results
    )
    
    # Format results with metadata
    chunks = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            metadata = results["metadatas"][0][i]
            chunks.append({
                "text": doc,
                "title": metadata.get("title", "Unknown"),
                "date": metadata.get("date", "Unknown"),
                "url": metadata.get("url", "")
            })
    
    print(f"Found {len(chunks)} chunks")
    return chunks


if __name__ == "__main__":
    # Test search
    print("Testing search...")
    
    results = search("sentiment", ["هتش"])
    print(f"\nFound {len(results)} chunks for 'هتش'")
    
    if results:
        print(f"\nFirst chunk preview:")
        print(f"  Title: {results[0]['title']}")
        print(f"  Text: {results[0]['text'][:200]}...")