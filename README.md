# 🇸🇾 Syria Sentiment Analyzer (SyrSent)

A comprehensive sentiment analysis platform that tracks narratives and relationships throughout the Syrian conflict and post-conflict period. Uses LLM-powered analysis with semantic search on Syrian Dialogue Center articles.

**Live Demo:** [SyrSentHF on Hugging Face Spaces](https://huggingface.co/spaces/Hussssa/SyrSentHF)

## Overview

SyrSent provides three core capabilities:

### 1. **Sentiment Timeline Analysis** 📊
- Analyzes sentiment toward specified targets (individuals, groups, countries) across all articles
- Tracks sentiment evolution over time with detailed period-by-period breakdowns
- Provides key themes, reasoning, and evidence quotes with article sources
- Displays visual timeline charts showing sentiment trends

### 2. **Relationship Mapping** 🔗
- Identifies and analyzes relationships between Syrian political entities
- Distinguishes between Assad Regime (pre-Dec 2024) and New Syrian Government (post-Dec 2024)
- Tracks relationship evolution (alliance, support, cooperation, neutral, tension, opposition, conflict)
- Provides evidence with key events and source articles for each period

### 3. **Smart Search** 🔍
- Semantic search across 1000+ articles from Syrian Dialogue Center
- Finds relevant content based on meaning, not just keywords
- Cross-references with sentiment and relationship data

## Architecture

```
syrsent/
├── syrsenthf/                 # Production Flask API + Analysis
│   ├── app.py                 # Main API server (7860)
│   ├── analysis/
│   │   ├── sentiment.py       # LLM-powered sentiment analysis
│   │   ├── relationships.py   # Relationship extraction & analysis
│   │   ├── indexer.py         # Vector indexing (ChromaDB)
│   │   └── retriever.py       # Semantic search
│   ├── data/
│   │   ├── sydialogue_ar_publications.json
│   │   ├── chroma_db/         # Vector embeddings
│   │   └── relationships_cache.json
│   └── Dockerfile             # For Hugging Face deployment
│
├── webapp/                    # React frontend (port 3000)
│   ├── public/
│   ├── src/
│   │   ├── App.js            # Main sentiment analysis UI
│   │   ├── relationshipmap.js # Relationship visualization
│   │   ├── searchpage.js      # Semantic search interface
│   │   └── App.css           # Styling (polished evidence display)
│   └── package.json
│
└── src/                      # Legacy code (use syrsenthf for production)
    ├── scraper/              # Web scraping utilities
    └── analysis/             # Deprecated - use syrsenthf/analysis
```

## Setup

### Backend (API)

```bash
cd syrsenthf

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GROQ_API_KEY=your_groq_api_key

# Run the server
python app.py
# API will be available at http://localhost:7860
```

**API Endpoints:**
- `GET /` - Health check
- `POST /api/analyze` - Sentiment analysis
- `GET /api/articles` - List articles
- `GET /api/relationships` - Build relationship map
- `GET /api/relationships/entities` - List tracked entities
- `GET /api/search` - Semantic search

### Frontend (React)

```bash
cd webapp

# Install dependencies
npm install

# Start development server
npm start
# App will be available at http://localhost:3000
```

**Environment Setup:**
Create `.env` in webapp/ directory:
```
REACT_APP_API_BASE=http://localhost:7860
```

## Features

### Sentiment Analysis
- **Complete Coverage**: Scans ALL articles for target mentions (no sampling)
- **Semantic Understanding**: LLM analyzes context, relationships, and framing
- **Timeline Visualization**: Charts showing sentiment evolution across periods
- **Evidence Quotes**: Direct quotes with article source attribution
- **Trend Detection**: Identifies improving/declining/stable sentiment trends
- **Period Breakdown**: Detailed cards showing themes, reasoning, and key quotes per period

### Relationship Analysis
- **Entity Tracking**: Monitors Assad Regime vs New Syrian Government separately
- **Relationship Types**: Alliance, Support, Cooperation, Negotiation, Neutral, Tension, Opposition, Conflict
- **Timeline Charts**: Visual evolution of relationships over time
- **Period Analysis**: Key events, interpretations, and source articles
- **Evidence Integration**: Quotes with context explaining the relationship

### Search
- **Semantic Search**: Find relevant articles by meaning
- **Mention Detection**: See which articles mention your targets
- **Advanced Filtering**: Filter by time period, sentiment, themes

## Data Sources

Articles sourced from **Syrian Dialogue Center** (https://sydialogue.org/):
- 1000+ articles in Arabic
- Covers 2011-present
- Pre-indexed with embeddings for fast semantic search
- Cached locally with smart update detection

## Technologies

**Backend:**
- Python 3.10+
- Flask + CORS
- Groq API (LLM inference)
- ChromaDB (Vector database)
- Sentence Transformers (Embeddings)
- Hugging Face Hub (Data sync)

**Frontend:**
- React 18
- Chart.js (Visualizations)
- CSS3 (Polished UI)
- Fetch API

**Deployment:**
- Docker (Hugging Face Spaces)
- Smart caching (only re-downloads on repo changes)

## Key Design Decisions

1. **No Sampling**: Analyzes ALL articles, not a subset. Ensures complete coverage.
2. **LLM-Powered**: Uses Groq's Qwen model for semantic understanding, not keyword matching.
3. **Smart Caching**: Backend tracks repo commits and only re-downloads data when changes detected.
4. **Polished UX**: Evidence displays with article names, period context, and sentiment colors.
5. **Separated Eras**: Relationship analysis distinguishes pre-Dec 2024 (Assad) from post-Dec 2024 (New Government).

## Performance Notes

- First analysis: 2-5 minutes (LLM analyzes all periods)
- Subsequent analyses: Cached in localStorage (instant)
- Relationship building: 3-10 minutes (first time only, then cached)
- Search: <1 second (vector database)

## Development

### Adding New Targets

Edit `TARGET_ALIASES` in `syrsenthf/analysis/sentiment.py`:
```python
TARGET_ALIASES = {
    "target_en": ["الهدف_العربي", "alias1", "alias2"],
    "الهدف_العربي": ["target_en", "alias1"],
}
```

### Updating Data

Data is automatically synced from Hugging Face. To manually update:
```bash
cd syrsenthf
rm -rf data/  # Clear cached data
python app.py  # Will re-download
```

### Running Tests

```bash
# Backend
cd syrsenthf
python -m pytest analysis/

# Frontend
cd webapp
npm test
```

## Troubleshooting

**API not responding:**
- Check GROQ_API_KEY is set: `echo $GROQ_API_KEY`
- Check Flask is running: `curl http://localhost:7860`

**Frontend can't reach API:**
- Verify API_BASE in App.js matches your backend URL
- Check CORS is enabled (already configured in app.py)

**Relationships not displaying:**
- Ensure relationships_cache.json exists in syrsenthf/data/
- Run `/api/relationships?rebuild=true` to force rebuild

**Search not working:**
- Verify ChromaDB files exist in syrsenthf/data/chroma_db/
- Check embeddings are indexed: `python -c "from analysis.retriever import search; print(search('test', ['Assad']))"`

## Project Status

✅ **Production Ready**
- Core sentiment analysis working
- Relationship mapping implemented
- Search functionality complete
- React frontend polished
- Docker deployment on Hugging Face Spaces

🔄 **In Development**
- Extended entity types
- Multi-language support
- Custom timeline visualizations

📋 **Future Features**
- Comparative analysis (target A vs target B)
- Network graph visualization
- Export reports (PDF)
- User annotations and feedback loop

## Contributing

To contribute:
1. Test changes locally (both backend and frontend)
2. Use syrsenthf as the source of truth for production code
3. Keep src/ synchronized or mark as deprecated
4. Update documentation for new features



## Contact

For questions or issues, create an issue on GitHub.