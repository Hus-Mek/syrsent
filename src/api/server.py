import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add src to Python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from analysis.sentiment import analyze_sentiment
from analysis.indexer import load_articles, index_articles
from groq import Groq

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ======== API ROUTES ========
@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "Syria Sentiment API"})

@app.route("/api/articles", methods=["GET"])
def get_articles():
    articles = load_articles()
    return jsonify([{"title": a["title"], "url": a["url"]} for a in articles])

@app.route("/api/index", methods=["POST"])
def reindex():
    articles = load_articles()
    index_articles(articles)
    return jsonify({"status": "ok", "count": len(articles)})

@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.json
    targets = data.get("targets", [])

    if not targets:
        return jsonify({"error": "No targets provided"}), 400
    
    result = analyze_sentiment(targets, client)
    return jsonify({"sentiment_analysis": result})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)