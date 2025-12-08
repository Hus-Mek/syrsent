import React, { useState } from 'react';
import './App.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = 'https://hussssa-syrsenthf.hf.space';

function App() {
  // Tab state
  const [activeTab, setActiveTab] = useState('sentiment');
  
  // Sentiment state
  const [targets, setTargets] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  
  // Relationship state  
  const [relationshipData, setRelationshipData] = useState(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  
  // Shared error state
  const [error, setError] = useState('');

  /**
   * SENTIMENT ANALYSIS
   */
  const runSentimentAnalysis = async () => {
    if (!targets.trim()) {
      setError('Please enter at least one target entity');
      return;
    }

    setSentimentLoading(true);
    setError('');

    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      console.log("Sentiment API response:", data);
      setSentimentResult(data);
    } catch (err) {
      console.error("Sentiment analysis error:", err);
      setError('Failed to analyze sentiment. Please try again.');
    }

    setSentimentLoading(false);
  };

  /**
   * RELATIONSHIP MAP
   * Uses GET method with query parameters
   */
  const buildRelationshipMap = async () => {
    setRelationshipLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/relationships?min_articles=5&max_pairs=15`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to build map: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Relationship API response:", data);
      setRelationshipData(data);
    } catch (err) {
      console.error("Relationship map error:", err);
      setError(`Failed to build relationship map: ${err.message}`);
    }

    setRelationshipLoading(false);
  };

  // Parse sentiment JSON safely
  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      return JSON.parse(sentimentStr);
    } catch (e) {
      console.error("JSON parsing failed:", e);
      return null;
    }
  };

  // Get color class based on score
  const getScoreColorClass = (score) => {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  };

  // Get hex color for charts
  const getScoreHexColor = (score) => {
    if (score > 0.2) return '#10b981';
    if (score < -0.2) return '#ef4444';
    return '#f59e0b';
  };

  // Build chart data
  const getSentimentChartData = () => {
    if (!sentimentResult?.sentiment_analysis) return null;

    const sentiment = parseSentiment(sentimentResult.sentiment_analysis);
    if (!sentiment?.targets) return null;

    const targetNames = Object.keys(sentiment.targets);
    const scores = targetNames.map(t => sentiment.targets[t].score);
    const colors = scores.map(s => getScoreHexColor(s));

    return {
      labels: targetNames,
      datasets: [{
        label: 'Sentiment Score',
        data: scores,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    };
  };

  const sentiment = sentimentResult ? parseSentiment(sentimentResult.sentiment_analysis) : null;

  return (
    <div className="App">
      {/* Header with Syrian Dialogue Center theme */}
      <header className="app-header">
        <h1>Syria Analysis Platform</h1>
        <p className="subtitle">Syrian Dialogue Center - Sentiment Analysis Tool</p>
      </header>

      {/* Tab Navigation */}
      <div className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveTab('sentiment')}
        >
          📊 Sentiment Analysis
        </button>
        <button 
          className={`tab-btn ${activeTab === 'relationships' ? 'active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          🕸️ Relationship Map
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ========== SENTIMENT TAB ========== */}
      {activeTab === 'sentiment' && (
        <div className="tab-content">
          <div className="input-section">
            <label>Target Entities (comma-separated):</label>
            <div className="input-group">
              <input
                type="text"
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                placeholder="Assad regime, Russia, Turkey, HTS, Kurdish forces..."
                onKeyPress={(e) => e.key === 'Enter' && !sentimentLoading && runSentimentAnalysis()}
              />
              <button 
                onClick={runSentimentAnalysis} 
                disabled={sentimentLoading}
                className="btn-primary"
              >
                {sentimentLoading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  'Run Analysis'
                )}
              </button>
            </div>
            <p className="hint">💡 Try: "Assad regime, Russia, Turkey" or "HTS, Syrian opposition"</p>
          </div>

          {/* Results */}
          {sentiment && (
            <div className="results">
              {/* Chart */}
              {getSentimentChartData() && (
                <div className="chart-section">
                  <h2>Sentiment Distribution</h2>
                  <div className="chart-wrapper">
                    <Bar
                      data={getSentimentChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            callbacks: {
                              label: (context) => {
                                const score = context.parsed.y;
                                const sentiment = score > 0.2 ? 'Positive' : 
                                                score < -0.2 ? 'Negative' : 'Neutral';
                                return `${sentiment}: ${score.toFixed(3)}`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            min: -1,
                            max: 1,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                          },
                          x: { grid: { display: false } }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Target Cards */}
              <div className="targets-section">
                <h2>Analysis Details</h2>
                {Object.entries(sentiment.targets).map(([target, data]) => (
                  <div key={target} className="target-card">
                    <div className="target-header">
                      <h3>{target}</h3>
                      <span className={`score-badge ${getScoreColorClass(data.score)}`}>
                        {data.sentiment} ({data.score.toFixed(2)})
                      </span>
                    </div>

                    <div className="reasoning">
                      <strong>Analysis:</strong>
                      <p>{data.reasoning}</p>
                    </div>

                    {data.evidence && data.evidence.length > 0 && (
                      <div className="evidence-section">
                        <strong>Evidence ({data.evidence.length} quotes):</strong>
                        {data.evidence.map((ev, i) => (
                          <div key={i} className="evidence-item">
                            <blockquote>"{ev.quote}"</blockquote>
                            <div className="evidence-meta">
                              <span>{ev.source}</span>
                              <span>{ev.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!sentiment && !sentimentLoading && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>Ready to Analyze</h3>
              <p>Enter target entities above to begin sentiment analysis</p>
            </div>
          )}
        </div>
      )}

      {/* ========== RELATIONSHIP TAB ========== */}
      {activeTab === 'relationships' && (
        <div className="tab-content">
          <div className="info-box">
            <div className="info-icon">ℹ️</div>
            <div>
              <h3>Relationship Mapping</h3>
              <p>Visualize how Syrian political entities interact and how relationships evolve over time.</p>
            </div>
          </div>

          <button 
            onClick={buildRelationshipMap} 
            disabled={relationshipLoading}
            className="btn-primary"
          >
            {relationshipLoading ? (
              <>
                <span className="spinner"></span>
                Building Map...
              </>
            ) : (
              'Build Relationship Map'
            )}
          </button>

          {/* Relationship Results */}
          {relationshipData && relationshipData.relationships && (
            <div className="relationships-section">
              <h2>Entity Relationships</h2>
              <p className="section-info">
                Showing {relationshipData.relationships.length} relationship pairs 
                {relationshipData.total_articles && ` from ${relationshipData.total_articles} articles`}
              </p>
              
              <div className="relationships-grid">
                {relationshipData.relationships.map((rel, idx) => (
                  <div key={idx} className="relationship-card">
                    <div className="rel-header">
                      <div className="rel-entities">
                        {/* Display Arabic entity names directly */}
                        <span className="entity-name">{rel.entity1 || 'Unknown'}</span>
                        <span className="rel-connector">
                          {rel.direction === 'mutual' ? '↔' : 
                           rel.direction === 'e1_to_e2' ? '→' : '←'}
                        </span>
                        <span className="entity-name">{rel.entity2 || 'Unknown'}</span>
                      </div>
                      <span className={`rel-type-badge ${rel.relationship_type || 'neutral'}`}>
                        {rel.relationship_type || 'neutral'}
                      </span>
                    </div>

                    <div className="rel-meta">
                      <span className="rel-stat">
                        Strength: {rel.strength ? (rel.strength * 100).toFixed(0) : '0'}%
                      </span>
                      <span className="rel-stat">
                        Evolution: {rel.evolution || 'stable'}
                      </span>
                      <span className="rel-stat">
                        Articles: {rel.article_count || rel.articles?.length || 0}
                      </span>
                    </div>

                    {rel.description && (
                      <p className="rel-description">{rel.description}</p>
                    )}

                    {rel.key_themes && rel.key_themes.length > 0 && (
                      <div className="rel-themes">
                        {rel.key_themes.map((theme, i) => (
                          <span key={i} className="theme-tag">{theme}</span>
                        ))}
                      </div>
                    )}

                    {rel.evidence && rel.evidence.length > 0 && (
                      <details className="rel-evidence">
                        <summary>View Evidence ({rel.evidence.length} quotes)</summary>
                        <div className="evidence-list">
                          {rel.evidence.slice(0, 3).map((ev, i) => (
                            <div key={i} className="evidence-item-small">
                              <div className="quote-text">"{ev.quote || ev.text || 'No quote'}"</div>
                              <div className="quote-meta">{ev.date || ev.published || 'No date'}</div>
                            </div>
                          ))}
                          {rel.evidence.length > 3 && (
                            <p className="more-evidence">+ {rel.evidence.length - 3} more quotes</p>
                          )}
                        </div>
                      </details>
                    )}

                    {rel.timeline && rel.timeline.length > 0 && (
                      <details className="rel-timeline">
                        <summary>View Timeline ({rel.timeline.length} periods)</summary>
                        <div className="timeline-list">
                          {rel.timeline.map((period, i) => (
                            <div key={i} className="timeline-period">
                              <div className="period-header">
                                <strong>{period.period || `Period ${i + 1}`}</strong>
                                <span className={`period-type ${period.relationship_type || 'neutral'}`}>
                                  {period.relationship_type || 'neutral'}
                                </span>
                              </div>
                              {period.description && (
                                <p className="period-desc">{period.description}</p>
                              )}
                              {period.article_count && (
                                <p className="period-meta">{period.article_count} articles</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Show articles list if available */}
                    {rel.articles && rel.articles.length > 0 && (
                      <details className="rel-articles">
                        <summary>View Articles ({rel.articles.length})</summary>
                        <div className="articles-list">
                          {rel.articles.slice(0, 5).map((article, i) => (
                            <div key={i} className="article-item">
                              <div className="article-title">{article.title || 'Untitled'}</div>
                              <div className="article-date">{article.date || 'No date'}</div>
                            </div>
                          ))}
                          {rel.articles.length > 5 && (
                            <p className="more-articles">+ {rel.articles.length - 5} more articles</p>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!relationshipData && !relationshipLoading && (
            <div className="empty-state">
              <div className="empty-icon">🕸️</div>
              <h3>No Map Generated Yet</h3>
              <p>Click "Build Relationship Map" to analyze entity relationships from all Syrian Dialogue Center articles</p>
              <p className="note">Analyzes top 15 entity pairs with 5+ articles each</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;