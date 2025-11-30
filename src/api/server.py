import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Add src to Python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP_DIR = os.path.join(ROOT_DIR, "webapp")
sys.path.insert(0, ROOT_DIR)

from analysis.sentiment import analyze_sentiment
from analysis.indexer import load_articles, index_articles
from groq import Groq

app = Flask(__name__, static_folder=WEBAPP_DIR, static_url_path="")
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ======== FRONTEND ROUTES ========
@app.route("/")
def index():
    return send_from_directory(WEBAPP_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(WEBAPP_DIR, path)

# ======== API ROUTES ========
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
