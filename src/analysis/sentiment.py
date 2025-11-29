"""
Sentiment analysis using Groq + Llama
"""

import os
from groq import Groq
import json
from analysis.retriever import search

def analyze_sentiment(targets, client, n_chunks=100):
    """Analyze sentiment toward targets using RAG."""
    
    print("=== ANALYZE_SENTIMENT CALLED ===")
    print(f"Targets: {targets}")
    
    # Get relevant chunks
    chunks = search("sentiment opinion", targets, n_results=n_chunks)
    
    print(f"Found {len(chunks)} chunks")
    
    if not chunks:
        print("No chunks found!")
        return None
    
    # Build context from chunks with source info
    context_parts = []
    for chunk in chunks:
        context_parts.append(
            f"[Source: {chunk['title']} | Date: {chunk['date']}]\n{chunk['text']}"
        )
    
    context = "\n\n---\n\n".join(context_parts)
    targets_str = ", ".join(targets)
    
    prompt = f"""Analyze the sentiment toward these targets: {targets_str}

Based on the following excerpts from articles about Syria. For each target, provide:
1. Overall sentiment (positive/negative/neutral)
2. Score from -1 to 1
3. EXACT QUOTES that support your analysis (copy word-for-word from the text)
4. The source article and date for each quote
5. Consider related terms to the target (eg. assad, regime or usa, west, uk etc)
6. I want to know the center's view on these targets, analyse as much as you can, do as many relations as possible

Respond with ONLY a JSON object:
{{
    "targets": {{
        "target_name": {{
            "sentiment": "positive" or "negative" or "neutral",
            "score": -1 to 1,
            "evidence": [
                {{
                    "quote": "exact quote from text",
                    "source": "article title",
                    "date": "publication date"
                }}
            ],
            "reasoning": "brief explanation"
        }}
    }}
}}

Context:
{context}"""

    response = client.chat.completions.create(
        model="qwen/qwen3-32b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=5000
    )
    
    result = response.choices[0].message.content
    
    # Remove <think>...</think> tags if present (Qwen model)
    if "<think>" in result:
        result = result.split("</think>")[-1]
    
    # Remove markdown code blocks if present
    if "```" in result:
        parts = result.split("```")
        for part in parts:
            if part.strip().startswith("json"):
                result = part.strip()[4:]
                break
            elif part.strip().startswith("{"):
                result = part.strip()
                break
    
    result = result.strip()
    return result

def load_articles(filepath="data/sydialogue_publications.json"):
    """Load scraped articles from JSON."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def analyze_all_articles(articles, targets, client):
    """Analyze sentiment for all articles toward specific targets."""
    results = []
    
    for i, article in enumerate(articles, 1):
        print(f"Analyzing {i}/{len(articles)}: {article['title'][:50]}...")
        
        sentiment = analyze_sentiment(article.get("content", ""), targets, client)
        
        results.append({
            "title": article["title"],
            "url": article["url"],
            "sentiment_analysis": sentiment
        })
    
    return results


def save_results(results, filepath="data/sentiment_results.json"):
    """Save analysis results."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Saved results to {filepath}")

if __name__ == "__main__":
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    targets = ["Assad regime", "opposition", "civilians"]
    
    result = analyze_sentiment(targets, client)
    print(result)