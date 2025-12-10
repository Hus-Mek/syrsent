# SyrSent Frontend - React Application

A polished React UI for the Syria Sentiment Analyzer. Provides sentiment analysis visualization, relationship mapping, and semantic search across Syrian Dialogue Center articles.

## Features

### 📊 Sentiment Analysis Tab
- **Timeline Charts**: Visualize sentiment evolution over periods
- **Period Breakdown**: Interactive cards showing:
  - Sentiment score and trend
  - Article count and mention count
  - Key themes (up to 3 per period)
  - Period reasoning from LLM analysis
  - Top 2 key quotes with article attribution
- **Evidence Quotes**: Full evidence section with:
  - Direct quotes from source articles
  - Article name (📄 source attribution)
  - Time period indicator
  - Sentiment classification (positive/negative/neutral)
- **Overall Statistics**: Aggregate sentiment across all periods
- **Trend Detection**: Shows improving/declining/stable trends

### 🔗 Relationship Mapping
- **Entity Relationships**: See how different entities relate to each other
- **Relationship Timeline**: Charts showing relationship evolution
- **Period Analysis**: Detailed cards per period with:
  - Relationship type and sentiment color
  - Article count
  - Key events
  - Evidence quotes with interpretations
  - Source articles

### 🔍 Search Tab
- **Semantic Search**: Find articles by meaning, not keywords
- **Mention Tracking**: See which articles mention your targets
- **Advanced Filtering**: Filter by period, sentiment, themes

## Setup

### Installation

```bash
# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_BASE=http://localhost:7860" > .env
```

### Development

```bash
# Start development server
npm start

# Open http://localhost:3000 in your browser
```

### Production Build

```bash
# Build optimized production bundle
npm run build

# The build/ folder can be deployed to any static host
```

## Configuration

Create a `.env` file in the webapp root:

```env
# API Base URL (must point to running syrsenthf API)
REACT_APP_API_BASE=http://localhost:7860

# Optional: Analytics, deployment-specific vars, etc.
```

## File Structure

```
src/
├── App.js                 # Main sentiment analysis interface
├── relationshipmap.js     # Relationship visualization and analysis
├── searchpage.js          # Semantic search interface
├── App.css               # All styling (period cards, evidence, polished UI)
├── index.js              # React entry point
├── index.css             # Global styles
└── setupTests.js         # Test configuration
```

## Key Components

### App.js (Main Component)
- **Input Section**: Text input for comma-separated targets
- **Result Section**: 
  - Charts (Line & Bar)
  - Target statistics
  - Period breakdown cards
  - Evidence quotes section
- **State Management**: Local state for targets, results, loading, errors
- **API Integration**: Calls `/api/analyze` endpoint

### RelationshipMap.js
- **Entity Selection**: Dropdown or list of tracked entities
- **Relationship Grid**: Cards for each entity pair
- **Timeline Chart**: Relationship evolution visualization
- **Period Cards**: Detailed breakdown per period

### SearchPage.js
- **Search Input**: Semantic search query
- **Target Selection**: Filter by entities
- **Results Display**: Ranked articles with relevance scores

## Data Flow

```
User Input (targets)
    ↓
POST /api/analyze
    ↓
Backend (LLM analysis)
    ↓
JSON Response
    ↓
Parse & Display
    ↓
Cache in localStorage
```

## Styling & Theme

All styles are in `App.css`:

**Color Palette:**
- Positive Sentiment: Green (#4caf50)
- Negative Sentiment: Red (#f44336)
- Neutral Sentiment: Orange (#ff9800)
- Primary Blue: #1a237e, #2196f3
- Backgrounds: #f5f7fa, #fafafa

**Component Styles:**
- **Evidence Items**: Blockquotes with colored left border
- **Period Cards**: Grid layout with responsive design
- **Charts**: Chart.js with custom colors
- **Badges**: Sentiment tags with colors
- **Theme Tags**: Display key themes from analysis

## Performance Optimizations

1. **localStorage Caching**: Results cached locally, survives page refresh
2. **Lazy Loading**: Charts only render when visible
3. **Debounced Input**: Prevents excessive API calls
4. **Memoization**: React components optimized to prevent unnecessary re-renders

## Browser Compatibility

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

Requires ES6+ support.

## Common Issues

### API Not Responding
```
Error: Failed to connect to API
```
**Solution:**
1. Ensure backend is running: `cd syrsenthf && python app.py`
2. Check REACT_APP_API_BASE in .env
3. Verify CORS is enabled (should be in app.py)

### Results Not Displaying
```
Error: Parse failed
```
**Solution:**
1. Check browser console for detailed error
2. Verify API response is valid JSON
3. Clear localStorage: `localStorage.clear()`

### Charts Not Rendering
**Solution:**
1. Check Chart.js is properly imported
2. Verify data has required fields (labels, datasets)
3. Inspect browser console for errors

### Relationship Data Missing
**Solution:**
1. Click "Build Relationship Map" button
2. Wait for analysis to complete (3-10 minutes)
3. Data will cache automatically

## Development Tips

### Running Tests
```bash
npm test
```

### Debugging
1. Use React Developer Tools browser extension
2. Open DevTools Console for API logs
3. Check localStorage: `localStorage.getItem('sentiment_analysis')`

### Adding New Features
1. Keep styles in App.css (append, don't rewrite)
2. Use existing color constants
3. Follow component naming: `render<Feature>()`
4. Add loading states for async operations

## Deployment

### To Vercel
```bash
npm install -g vercel
vercel
```

### To GitHub Pages
```bash
# Update package.json
"homepage": "https://yourusername.github.io/syrsent-webapp"

# Build and deploy
npm run build
```

### Docker
See root project for Docker setup (backend is containerized, frontend can be served as static files).

## API Response Format

The app expects this JSON structure from `/api/analyze`:

```json
{
  "sentiment_analysis": {
    "targets": {
      "target_name": {
        "overall_sentiment": "positive",
        "overall_score": 0.75,
        "trend": "improving",
        "total_articles": 42,
        "total_mentions": 156,
        "periods_analyzed": 6,
        "timeline": [
          {
            "period": "2024-01",
            "sentiment": "neutral",
            "score": 0.1,
            "article_count": 5,
            "mention_count": 12,
            "themes": ["theme1", "theme2"],
            "reasoning": "...",
            "evidence": [
              {
                "quote": "...",
                "sentiment": "positive",
                "article": "Article Title"
              }
            ]
          }
        ],
        "evidence": [...],
        "key_themes": ["theme1", "theme2"]
      }
    }
  }
}
```

## Contributing

1. Make UI changes in App.js, relationshipmap.js, or searchpage.js
2. Update styling in App.css
3. Test with `npm start`
4. Ensure no console errors
5. Commit and push

## License

Same as parent project (see root README)

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify backend is running and accessible
3. Create an issue on GitHub with screenshots
4. Include your browser version and OS
