"""
API server for sentiment analysis
"""

import os
import sys

# Add src to path so we can import analysis module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask, request, jsonify
from flask_cors import CORS
from analysis.sentiment import analyze_sentiment
from analysis.indexer import load_articles, index_articles
from groq import Groq

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


@app.route("/api/articles", methods=["GET"])
def get_articles():
    """Return list of scraped articles."""
    articles = load_articles()
    # Return without content to keep response small
    return jsonify([{"title": a["title"], "url": a["url"]} for a in articles])

@app.route("/api/index", methods=["POST"])
def reindex():
    """Re-index all articles."""
    articles = load_articles()
    index_articles(articles)
    return jsonify({"status": "ok", "count": len(articles)})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Analyze sentiment toward targets using RAG."""
    print("=== ANALYZE CALLED ===")  # Add this line
    data = request.json
    print(f"Targets: {data.get('targets', [])}")  # Add this line
    targets = data.get("targets", [])
    
    if not targets:
        return jsonify({"error": "No targets provided"}), 400
    
    result = analyze_sentiment(targets, client)
    print(f"Result: {result}")  # Add this line
    
    return jsonify({"sentiment_analysis": result})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)