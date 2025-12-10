# Quick Reference Guide - SyrSent

## 🚀 Getting Started (2 minutes)

### Start Backend
```bash
cd syrsenthf
export GROQ_API_KEY=your_key_here
python app.py
```
API runs at: `http://localhost:7860`

### Start Frontend
```bash
cd webapp
npm install  # First time only
npm start
```
UI runs at: `http://localhost:3000`

### First Analysis
1. Go to http://localhost:3000
2. Enter targets: `الأسد, روسيا, أمريكا`
3. Click "Analyze All Articles"
4. Wait 2-5 minutes for results

## 📁 File Structure Quick Guide

```
syrsenthf/          ← Backend (Python Flask API)
  app.py            ← Start here: python app.py
  analysis/
    sentiment.py    ← Sentiment analysis logic
    relationships.py ← Relationship analysis
    retriever.py    ← Semantic search
    indexer.py      ← Vector indexing

webapp/             ← Frontend (React)
  src/
    App.js          ← Main UI (sentiment analysis)
    relationshipmap.js ← Relationships tab
    searchpage.js   ← Search tab
    App.css         ← All styling

src/                ← Legacy/Reference only
  README_DEPRECATED.md ← Why it exists
  [scraper, analysis] ← Don't use these
```

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/api/analyze` | POST | Sentiment analysis |
| `/api/relationships` | GET | Relationship mapping |
| `/api/relationships/entities` | GET | List entities |
| `/api/search` | GET | Semantic search |
| `/api/articles` | GET | List articles |
| `/api/debug` | GET | System info |

## 💾 Environment Variables

```bash
# Required
GROQ_API_KEY=sk-...

# Optional
PORT=7860
FLASK_ENV=development
```

## 🛠️ Common Commands

### Backend Development
```bash
cd syrsenthf
python app.py                    # Run server
python -m pytest analysis/       # Run tests
curl http://localhost:7860/      # Health check
```

### Frontend Development
```bash
cd webapp
npm start                        # Dev server
npm test                        # Run tests
npm run build                   # Production build
```

### Clear Cache
```bash
# Backend
rm -rf syrsenthf/data/relationships_cache.json

# Frontend
# Browser console: localStorage.clear()
```

### Add New Analysis Target

Edit `syrsenthf/analysis/sentiment.py`:
```python
TARGET_ALIASES = {
    "new_target": ["الهدف_العربي", "alias1", "alias2"],
    # ...
}
```

## 📊 Data Formats

### API Request: POST /api/analyze
```json
{
  "targets": ["الأسد", "روسيا", "أمريكا"]
}
```

### API Response (simplified)
```json
{
  "sentiment_analysis": {
    "targets": {
      "الأسد": {
        "overall_sentiment": "negative",
        "overall_score": -0.75,
        "timeline": [
          {
            "period": "2024-01",
            "sentiment": "negative",
            "score": -0.8,
            "evidence": [
              {
                "quote": "...",
                "article": "Article Title",
                "sentiment": "negative"
              }
            ]
          }
        ]
      }
    }
  }
}
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Python version
python --version  # Need 3.10+

# Check dependencies
pip install -r syrsenthf/requirements.txt

# Check API key
echo $GROQ_API_KEY
```

### Frontend Shows Error
```bash
# Check .env file exists
cat webapp/.env

# Check API is running
curl http://localhost:7860

# Clear browser cache
localStorage.clear()
```

### No Results After Analysis
```bash
# Check backend logs for errors
curl http://localhost:7860/api/debug

# Check Groq API is working
# Try different targets

# Check data files
ls -la syrsenthf/data/
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `/README.md` | Project overview & setup |
| `/syrsenthf/README.md` | Backend API reference |
| `/webapp/README.md` | Frontend development guide |
| `/src/README_DEPRECATED.md` | Legacy code explanation |
| `/REFACTORING_SUMMARY.md` | What changed |

## 🚀 Deployment

### Local Testing
```bash
# Terminal 1: Backend
cd syrsenthf && python app.py

# Terminal 2: Frontend
cd webapp && npm start

# Open http://localhost:3000
```

### Production (Docker)
```bash
cd syrsenthf
docker build -t syrsent .
docker run -e GROQ_API_KEY=your_key -p 7860:7860 syrsent
```

### Hugging Face Spaces
Just push to repo - GitHub Actions deploys automatically

## 💡 Tips

### Speed Up Analysis
- Use fewer targets (1-3 instead of 10)
- Specify fewer periods in backend (edit sentiment.py)
- Results cache locally - refresh page to see cached results

### Better Results
- Use both Arabic and English names
- Include common aliases
- Use official entity names when possible

### Debug Issues
- Open browser console (F12)
- Check Network tab for API calls
- Look for 4xx/5xx errors
- Check terminal for backend logs

## 🔗 External Links

- [Groq API Docs](https://console.groq.com)
- [Syrian Dialogue Center](https://sydialogue.org/)
- [React Docs](https://react.dev)
- [Flask Docs](https://flask.palletsprojects.com)

## 📝 Notes

- **First run**: Takes 2-5 minutes for sentiment analysis (LLM processing)
- **Caching**: Results cached in localStorage on browser
- **Relationships**: Takes 3-10 minutes first time, then cached
- **Data**: Auto-synced from HuggingFace on startup
- **API Key**: Required from [Groq](https://console.groq.com)

## 🤝 Contributing

1. Make changes in syrsenthf/ or webapp/
2. Test locally before committing
3. Update relevant README if adding features
4. Don't use code from src/ - it's deprecated

## ❓ Questions?

1. Check the relevant README (root, syrsenthf, or webapp)
2. Look at REFACTORING_SUMMARY.md for architecture
3. Review API examples in syrsenthf/README.md
4. Check browser console and backend logs

---

**Last Updated**: December 10, 2025
**Status**: Production Ready ✅
