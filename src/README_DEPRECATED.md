# ⚠️ Legacy Code - Deprecated

This folder contains older/deprecated implementations that have been replaced by the production code in `syrsenthf/`.

## ℹ️ Use syrsenthf/ instead

The `syrsenthf/` folder contains the current production-ready code with:
- Modern API server (app.py)
- Optimized analysis modules
- Smart caching
- Hugging Face Spaces deployment

## What's Here

### sydialouge.py
- **Status**: Deprecated - Web scraper
- **Replaced by**: Cached data from Hugging Face
- **Use case**: Reference only, if you need to understand web scraping

### analysis/
- **Status**: Deprecated - Old analysis code
- **Replaced by**: `syrsenthf/analysis/`
- **Modules**:
  - sentiment.py - Old sentiment analysis (use syrsenthf version)
  - retriever.py - Old search (use syrsenthf version)
  - indexer.py - Old indexing (use syrsenthf version)

### api/
- **Status**: Deprecated - Old Flask server
- **Replaced by**: `syrsenthf/app.py`
- **Note**: syrsenthf/app.py is the current API

### scraper/
- **Status**: Deprecated - Web scraping utilities
- **Replaced by**: HuggingFace Hub data sync
- **Use case**: Reference for understanding how data was collected

## 🔄 Migration Guide

If you were using code from this folder:

### Old: `src/api/server.py`
```python
# Old way - deprecated
from src.analysis.sentiment import analyze_sentiment
```

### New: `syrsenthf/app.py`
```python
# New way - production ready
from analysis.sentiment import analyze_sentiment
```

### Old: Local scraping
```python
# Old - scraped websites directly
from src.scraper.sydialouge_ar import scrape_articles
```

### New: Data from HuggingFace
```python
# New - uses cached, pre-processed data
# Data is auto-synced from HuggingFace repo
articles = load_articles()  # In syrsenthf/analysis/sentiment.py
```

## ✅ What You Should Do

1. **For Development**: Use `syrsenthf/` as your working directory
2. **For API**: Run `cd syrsenthf && python app.py`
3. **For Frontend**: Use webapp with `REACT_APP_API_BASE=http://localhost:7860`
4. **For Analysis**: Import from `syrsenthf/analysis/`

## 📌 Keeping in Sync

If changes are made to production code:
1. They should be in `syrsenthf/` first
2. Equivalent updates should be mirrored to `src/` only if needed for reference
3. Never use `src/` code in production - it may be stale

## 🗑️ Cleanup (Optional)

To fully migrate, you could:
```bash
# Keep src/ as reference only
# Don't run code from src/

# Or delete it if not needed:
# rm -rf src/
```

## Questions?

See the root README.md for current architecture and setup instructions.
