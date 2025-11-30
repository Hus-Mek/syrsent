"""
Index Arabic articles into ChromaDB for RAG
============================================

CRITICAL: This uses the MULTILINGUAL embedding model.
The retriever.py MUST use the same model!

Model: paraphrase-multilingual-MiniLM-L12-v2
"""

import json
import os
import chromadb
from chromadb.utils import embedding_functions

# ============================================================
# MULTILINGUAL MODEL - supports Arabic, English, 50+ languages
# ============================================================
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

with open("data/sydialogue_ar_publications.json", "r", encoding="utf-8") as f:
    print(f.read()[:200])

def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """Load scraped articles."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def chunk_text(text, chunk_size=1000, overlap=200):
    """
    Split text into overlapping chunks.
    
    Smaller chunks (400 words) work better for Arabic semantic search.
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


def index_articles(articles, db_path="data/chroma_db"):
    """Index all articles into ChromaDB with multilingual embeddings."""
    
    print(f"Using embedding model: {EMBEDDING_MODEL}")
    print(f"This model supports Arabic and 50+ other languages")
    
    # Initialize ChromaDB
    client = chromadb.PersistentClient(path=db_path)
    
    # Delete existing collection if exists
    try:
        client.delete_collection("syria_articles")
        print("Deleted existing collection")
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
    
    print(f"Processing {len(articles)} articles...")
    
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
            print(f"  Processed {i + 1}/{len(articles)} articles...")
    
    # Add in batches to avoid memory issues
    batch_size = 500
    total_chunks = len(all_chunks)
    
    print(f"\nIndexing {total_chunks} chunks in batches of {batch_size}...")
    
    for start in range(0, total_chunks, batch_size):
        end = min(start + batch_size, total_chunks)
        
        collection.add(
            documents=all_chunks[start:end],
            metadatas=all_metadatas[start:end],
            ids=all_ids[start:end]
        )
        
        print(f"  Indexed chunks {start}-{end} of {total_chunks}")
    
    print(f"\n✓ Successfully indexed {total_chunks} chunks from {len(articles)} articles")
    print(f"✓ ChromaDB saved to: {db_path}")
    print(f"✓ Embedding model: {EMBEDDING_MODEL}")
    
    return collection


def verify_index(db_path="data/chroma_db"):
    """Verify the index works with Arabic queries."""
    
    print("\n=== VERIFICATION ===")
    
    client = chromadb.PersistentClient(path=db_path)
    
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    collection = client.get_collection(
        name="syria_articles",
        embedding_function=embed_fn
    )
    
    print(f"Collection has {collection.count()} chunks")
    
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
        
        print(f"\nQuery: '{query}'")
        if results["documents"][0]:
            print(f"  Found {len(results['documents'][0])} results")
            print(f"  First result preview: {results['documents'][0][0][:100]}...")
        else:
            print(f"  NO RESULTS - this is a problem!")


if __name__ == "__main__":
    # Load articles
    json_path = "data/sydialogue_ar_publications.json"
    
    if not os.path.exists(json_path):
        print(f"ERROR: {json_path} not found!")
        print("Make sure to run this from the project root directory")
        exit(1)
    
    articles = load_articles(json_path)
    print(f"Loaded {len(articles)} articles")
    
    # Index articles
    index_articles(articles)
    
    # Verify it works
    verify_index()
    
    print("\n" + "="*50)
    print("DONE! Now upload data/chroma_db to HuggingFace")
    print("="*50)