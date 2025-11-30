"""
Index articles into ChromaDB for RAG
"""

import json
import os
import chromadb
from chromadb.utils import embedding_functions

# Use sentence-transformers for embeddings
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """Load scraped articles."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def chunk_text(text, chunk_size=500, overlap=50):
    """Split text into overlapping chunks."""
    if not text:
        return []
    
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    
    return chunks


def index_articles(articles, db_path="data/chroma_db"):
    """Index all articles into ChromaDB."""
    
    # Initialize ChromaDB
    client = chromadb.PersistentClient(path=db_path)
    
    # Delete existing collection if exists
    try:
        client.delete_collection("syria_articles")
    except:
        pass
    
    # Create embedding function
    embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )
    
    # Create collection
    collection = client.create_collection(
        name="syria_articles",
        embedding_function=embed_fn
    )
    
    # Index each article
    all_chunks = []
    all_metadatas = []
    all_ids = []
    
    for i, article in enumerate(articles):
        content = article.get("content", "")
        if not content:
            continue
        
        chunks = chunk_text(content)
        
        for j, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                "title": article.get("title", "Unknown"),
                "url": article.get("url", ""),
                "date": article.get("date", "Unknown"),
                "article_index": i,
                "chunk_index": j
            })
            all_ids.append(f"article_{i}_chunk_{j}")
    
    # Add to collection
    if all_chunks:
        collection.add(
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=all_ids
        )
    
    print(f"Indexed {len(all_chunks)} chunks from {len(articles)} articles")
    return collection


if __name__ == "__main__":
    articles = load_articles()
    print(f"Loaded {len(articles)} articles")
    
    index_articles(articles)
    print("Indexing complete!")