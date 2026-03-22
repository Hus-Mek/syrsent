"""
Index Arabic articles into ChromaDB for RAG
============================================

CRITICAL: This uses the MULTILINGUAL embedding model.
The retriever.py MUST use the same model!

Model: paraphrase-multilingual-MiniLM-L12-v2
Supports: Arabic, English, and 50+ other languages
"""

import json
import os
import logging
import chromadb
from chromadb.utils import embedding_functions

# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ============================================================
# MULTILINGUAL MODEL - supports Arabic, English, 50+ languages
# ============================================================

EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


# ============================================================
# DATA LOADING
# ============================================================

def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """
    Load scraped articles from JSON file.
    
    Args:
        filepath (str): Path to articles JSON file
    
    Returns:
        list: Article objects with title, content, date, url, etc.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# TEXT CHUNKING
# ============================================================

def chunk_text(text, chunk_size=400, overlap=100):
    """
    Split text into overlapping chunks for better semantic search.
    
    Smaller chunks (400 words) with overlap work better for Arabic
    semantic search, ensuring context is preserved across boundaries.
    
    Args:
        text (str): Text to chunk
        chunk_size (int): Words per chunk
        overlap (int): Overlapping words between chunks
    
    Returns:
        list: Text chunks (strings)
    """
    if not text:
        return []
    
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk and len(chunk) > 50:  # Skip tiny chunks
            chunks.append(chunk)
    
    return chunks


# ============================================================
# INDEXING
# ============================================================

def index_articles(articles, db_path="data/chroma_db"):
    """
    Index all articles into ChromaDB with multilingual embeddings.
    
    Creates vector embeddings for all article chunks and stores them
    in ChromaDB for semantic search. Deletes existing collection if present.
    
    Args:
        articles (list): Article objects to index
        db_path (str): Path to ChromaDB storage directory
    
    Returns:
        Collection: The created ChromaDB collection
    """
    logger.info(f"Using embedding model: {EMBEDDING_MODEL}")
    logger.info(f"This model supports Arabic and 50+ other languages")
    
    # Initialize ChromaDB
    client = chromadb.PersistentClient(path=db_path)
    
    # Delete existing collection if exists
    try:
        client.delete_collection("syria_articles")
        logger.info("Deleted existing collection")
    except:
        pass
    
    # Create embedding function - MULTILINGUAL
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    # Create collection
    collection = client.create_collection(
        name="syria_articles",
        embedding_function=embed_fn,
        metadata={"embedding_model": EMBEDDING_MODEL}
    )
    
    # Prepare data for batch insertion
    all_chunks = []
    all_metadatas = []
    all_ids = []
    
    logger.info(f"Processing {len(articles)} articles...")
    
    for i, article in enumerate(articles):
        content = article.get("content", "")
        if not content or len(content) < 100:
            continue
        
        title = article.get("title", "Unknown")
        chunks = chunk_text(content)
        
        for j, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                "title": title,
                "url": article.get("url", ""),
                "date": article.get("date", "Unknown"),
                "language": article.get("language", "ar"),
                "article_index": i,
                "chunk_index": j
            })
            all_ids.append(f"article_{i}_chunk_{j}")
        
        if (i + 1) % 50 == 0:
            logger.info(f"  Processed {i + 1}/{len(articles)} articles...")
    
    # Add in batches to avoid memory issues
    batch_size = 500
    total_chunks = len(all_chunks)
    
    logger.info(f"Indexing {total_chunks} chunks in batches of {batch_size}...")
    
    for start in range(0, total_chunks, batch_size):
        end = min(start + batch_size, total_chunks)
        
        collection.add(
            documents=all_chunks[start:end],
            metadatas=all_metadatas[start:end],
            ids=all_ids[start:end]
        )
        
        logger.info(f"  Indexed chunks {start}-{end} of {total_chunks}")
    
    logger.info(f"✓ Successfully indexed {total_chunks} chunks from {len(articles)} articles")
    logger.info(f"✓ ChromaDB saved to: {db_path}")
    logger.info(f"✓ Embedding model: {EMBEDDING_MODEL}")
    
    return collection


# ============================================================
# VERIFICATION
# ============================================================

def verify_index(db_path="data/chroma_db"):
    """
    Verify the index works correctly with Arabic queries.
    
    Tests semantic search with common Arabic entity names to ensure
    the multilingual embeddings are working properly.
    
    Args:
        db_path (str): Path to ChromaDB storage directory
    """
    logger.info("="*50)
    logger.info("VERIFICATION")
    logger.info("="*50)
    
    client = chromadb.PersistentClient(path=db_path)
    
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    collection = client.get_collection(
        name="syria_articles",
        embedding_function=embed_fn
    )
    
    logger.info(f"Collection has {collection.count()} chunks")
    
    # Test Arabic search
    test_queries = [
        "هتش",
        "هيئة تحرير الشام",
        "الأسد",
        "روسيا",
    ]
    
    for query in test_queries:
        results = collection.query(
            query_texts=[query],
            n_results=3
        )
        
        logger.info(f"Query: '{query}'")
        if results["documents"][0]:
            logger.info(f"  Found {len(results['documents'][0])} results")
            logger.debug(f"  First result preview: {results['documents'][0][0][:100]}...")
        else:
            logger.error(f"  NO RESULTS - this is a problem!")


# ============================================================
# MAIN / TEST
# ============================================================

if __name__ == "__main__":
    # Load articles
    json_path = "data/sydialogue_ar_publications.json"
    
    if not os.path.exists(json_path):
        logger.error(f"ERROR: {json_path} not found!")
        logger.error("Make sure to run this from the project root directory")
        exit(1)
    
    articles = load_articles(json_path)
    logger.info(f"Loaded {len(articles)} articles")
    
    # Index articles
    index_articles(articles)
    
    # Verify it works
    verify_index()
    
    logger.info("="*50)
    logger.info("DONE! Now upload data/chroma_db to HuggingFace")
    logger.info("="*50)