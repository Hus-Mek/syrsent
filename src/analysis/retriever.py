"""
Retrieve relevant chunks from ChromaDB
"""

import chromadb
from chromadb.utils import embedding_functions

EMBEDDING_MODEL = "all-MiniLM-L6-v2"


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


def search(query, targets, n_results=10):
    """Search for relevant chunks about targets."""
    collection = get_collection()
    
    # Combine query with targets for better search
    search_query = f"{query} {' '.join(targets)}"
    
    results = collection.query(
        query_texts=[search_query],
        n_results=n_results
    )
    
    # Format results with metadata
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        metadata = results["metadatas"][0][i]
        chunks.append({
            "text": doc,
            "title": metadata["title"],
            "date": metadata["date"],
            "url": metadata["url"]
        })
    
    return chunks