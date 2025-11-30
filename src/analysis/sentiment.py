"""
Sentiment analysis using Groq + Qwen
====================================

Uses Qwen for better Arabic understanding with robust JSON cleaning.
"""

import os
import json
import re
from groq import Groq
from analysis.retriever import search


def clean_json_response(text):
    """
    Clean Qwen response to extract valid JSON.
    
    Handles:
    - <think>...</think> tags (sometimes doubled)
    - ```json blocks
    - Control characters
    - Truncated responses
    - Different JSON structures from Qwen
    """
    
    print(f"Raw text length: {len(text)}")
    
    # Remove ALL <think> tags and their content (Qwen sometimes nests them)
    while "<think>" in text:
        text = re.sub(r'<think>[\s\S]*?</think>', '', text)
        # Also remove unclosed <think> tags
        text = re.sub(r'<think>[\s\S]*$', '', text)
    
    # Remove any remaining <think> or </think> tags
    text = text.replace('<think>', '').replace('</think>', '')
    
    # Remove markdown code blocks
    if "```" in text:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if match:
            text = match.group(1)
    
    text = text.strip()
    
    # Find JSON object
    start = text.find("{")
    if start == -1:
        print("No JSON object found in response")
        return None
    
    # Find matching closing brace
    depth = 0
    end = len(text)
    for i, char in enumerate(text[start:], start):
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    
    text = text[start:end]
    
    # Clean control characters (keep Arabic)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    
    # Try to parse
    try:
        parsed = json.loads(text)
        return parsed
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Attempted to parse: {text[:300]}...")
        
        # Try fixing truncated JSON
        try:
            fixed = text.rstrip()
            open_braces = fixed.count("{") - fixed.count("}")
            open_brackets = fixed.count("[") - fixed.count("]")
            open_quotes = fixed.count('"') % 2
            
            if open_quotes:
                fixed += '"'
            fixed += "]" * open_brackets
            fixed += "}" * open_braces
            
            return json.loads(fixed)
        except Exception as e2:
            print(f"Fix attempt failed: {e2}")
            pass
        
        return None


def convert_qwen_format(parsed):
    """
    Convert Qwen's array format to our expected object format.
    
    Qwen returns: {"targets": [{"name": "X", "polarity": -1, ...}]}
    We need:      {"targets": {"X": {"sentiment": "negative", "score": -1, ...}}}
    """
    if not parsed:
        return None
    
    # If already in correct format, return as-is
    if "targets" in parsed and isinstance(parsed["targets"], dict):
        return parsed
    
    # Convert array format to object format
    if "targets" in parsed and isinstance(parsed["targets"], list):
        new_targets = {}
        for item in parsed["targets"]:
            name = item.get("name") or item.get("target") or "Unknown"
            
            # Map polarity to sentiment
            polarity = item.get("polarity", 0)
            if isinstance(polarity, (int, float)):
                sentiment = "negative" if polarity < -0.2 else "positive" if polarity > 0.2 else "neutral"
            else:
                sentiment = item.get("sentiment", "neutral")
            
            new_targets[name] = {
                "sentiment": sentiment,
                "score": item.get("polarity", item.get("score", 0)),
                "reasoning": item.get("explanation", item.get("reasoning", "")),
                "evidence": item.get("evidence", [])
            }
        
        return {"targets": new_targets}
    
    # If it's just a dict of targets without wrapper
    if isinstance(parsed, dict) and "targets" not in parsed:
        # Check if it looks like targets
        first_val = next(iter(parsed.values()), None)
        if isinstance(first_val, dict) and any(k in first_val for k in ["sentiment", "score", "polarity"]):
            return {"targets": parsed}
    
    return parsed


def analyze_sentiment(targets, client, n_chunks=100):
    """
    Analyze sentiment toward targets using RAG.
    """
    
    print("=== ANALYZE_SENTIMENT CALLED ===")
    print(f"Targets: {targets}")
    
    # Get relevant chunks
    chunks = search("sentiment opinion view stance", targets, n_results=n_chunks)
    
    print(f"Found {len(chunks)} chunks")
    
    if not chunks:
        return json.dumps({
            "error": "No relevant content found",
            "targets": {}
        }, ensure_ascii=False)
    
    # Build context with source info
    context_parts = []
    for chunk in chunks:
        context_parts.append(
            f"[Source: {chunk['title']} | Date: {chunk['date']}]\n{chunk['text']}"
        )
    
    context = "\n\n---\n\n".join(context_parts)
    targets_str = ", ".join(targets)
    
    # Detailed prompt for Qwen
    prompt = f"""Analyze the sentiment toward these targets: {targets_str}

You are analyzing Arabic articles from the Syrian Dialogue Center (مركز الحوار السوري).

For each target, provide:
1. Overall sentiment (positive/negative/neutral)
2. Score from -1 to 1
3. EXACT QUOTES from the Arabic text as evidence (copy word-for-word)
4. The source article and date for each quote
5. Consider related terms:
   - Assad = الأسد = النظام = نظام الأسد = البعث = regime
   - Opposition = المعارضة = الثوار = الفصائل
   - Russia = روسيا = الروس = موسكو
   - USA = أمريكا = الولايات المتحدة = واشنطن = الغرب
   - Iran = إيران = طهران = الحرس الثوري
   - Turkey = تركيا = أنقرة
   - Israel = إسرائيل = الاحتلال
   - Civilians = المدنيين = الشعب السوري

Respond with ONLY a JSON object (no other text, no markdown):
{{
    "targets": {{
        "target_name": {{
            "sentiment": "positive" or "negative" or "neutral",
            "score": -1 to 1,
            "evidence": [
                {{
                    "quote": "exact Arabic quote from text",
                    "source": "article title",
                    "date": "publication date"
                }}
            ],
            "reasoning": "explanation of the sentiment"
        }}
    }}
}}

IMPORTANT:
- Extract multiple pieces of evidence (3-5 quotes per target)
- Quotes must be EXACT text from the articles
- Do NOT repeat the same phrase multiple times
- Keep each quote under 100 words
- Output valid JSON only

Context:
{context}"""

    try:
        response = client.chat.completions.create(
            model="qwen/qwen3-32b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=4000
        )
        
        result_text = response.choices[0].message.content
        print(f"Raw response length: {len(result_text)}")
        
        # Clean and parse
        parsed = clean_json_response(result_text)
        
        if parsed:
            # Convert Qwen's format to our expected format
            parsed = convert_qwen_format(parsed)
            
            if not parsed or "targets" not in parsed:
                return json.dumps({
                    "error": "Invalid response structure",
                    "targets": {}
                }, ensure_ascii=False)
            
            # Ensure each target has required fields
            for target, data in parsed.get("targets", {}).items():
                if "score" not in data:
                    data["score"] = 0
                if "sentiment" not in data:
                    score = data.get("score", 0)
                    data["sentiment"] = "negative" if score < -0.2 else "positive" if score > 0.2 else "neutral"
                if "reasoning" not in data:
                    data["reasoning"] = ""
                if "evidence" not in data:
                    data["evidence"] = []
                    
                # Convert string evidence to object format
                fixed_evidence = []
                for ev in data.get("evidence", []):
                    if isinstance(ev, str):
                        fixed_evidence.append({
                            "quote": ev,
                            "source": "Unknown",
                            "date": "Unknown"
                        })
                    elif isinstance(ev, dict):
                        fixed_evidence.append({
                            "quote": ev.get("quote", str(ev)),
                            "source": ev.get("source", "Unknown"),
                            "date": ev.get("date", "Unknown")
                        })
                data["evidence"] = fixed_evidence
            
            return json.dumps(parsed, ensure_ascii=False, indent=2)
        else:
            return json.dumps({
                "error": "Failed to parse LLM response",
                "raw_preview": result_text[:500],
                "targets": {}
            }, ensure_ascii=False)
            
    except Exception as e:
        print(f"LLM Error: {e}")
        import traceback
        traceback.print_exc()
        return json.dumps({
            "error": str(e),
            "targets": {}
        }, ensure_ascii=False)


def load_articles(filepath="data/sydialogue_ar_publications.json"):
    """Load scraped articles from JSON."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    result = analyze_sentiment(["Assad", "Russia"], client)
    print("\n=== RESULT ===")
    print(result)