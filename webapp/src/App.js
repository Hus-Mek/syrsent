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
    setSentimentResult(null); // Clear previous results

    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      console.log("Sentiment response:", data);
      setSentimentResult(data);
    } catch (err) {
      console.error("Sentiment analysis error:", err);
      setError('Failed to analyze sentiment. Please try again.');
    }

    setSentimentLoading(false);
  };

  /**
   * RELATIONSHIP MAP
   * Backend uses GET method with query parameters
   */
  const buildRelationshipMap = async () => {
    setRelationshipLoading(true);
    setError('');
    setRelationshipData(null); // Clear previous results

    try {
      // GET request with query parameters (not POST!)
      const response = await fetch(`${API_BASE}/api/relationships?min_articles=5&max_pairs=15`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to build map: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Relationship data:", data);
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
      // Handle if it's already an object
      if (typeof sentimentStr === 'object') {
        return sentimentStr;
      }
      // Parse if it's a string
      return JSON.parse(sentimentStr);
    } catch (e) {
      console.error("JSON parsing failed:", e);
      return null;
    }
  };

  // Get color class based on score
  const getScoreColorClass = (score) => {
    if (score === null || score === undefined) return 'neutral';
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  };

  // Get hex color for charts
  const getScoreHexColor = (score) => {
    if (score === null || score === undefined) return '#6b7280';
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
    const scores = targetNames.map(t => {
      const score = sentiment.targets[t].score;
      return score !== null && score !== undefined ? score : 0;
    });
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
          {sentiment && sentiment.targets && (
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
                {Object.entries(sentiment.targets).map(([target, data]) => {
                  // SAFE DATA EXTRACTION with fallbacks
                  const targetData = {
                    sentiment: data.sentiment || data.label || 'Unknown',
                    score: (data.score !== null && data.score !== undefined) ? data.score : null,
                    reasoning: data.reasoning || data.analysis || data.explanation || 'No analysis provided',
                    evidence: data.evidence || data.quotes || data.examples || []
                  };

                  return (
                    <div key={target} className="target-card">
                      <div className="target-header">
                        <h3>{target}</h3>
                        {targetData.score !== null ? (
                          <span className={`score-badge ${getScoreColorClass(targetData.score)}`}>
                            {targetData.sentiment} ({targetData.score.toFixed(2)})
                          </span>
                        ) : (
                          <span className={`score-badge ${getScoreColorClass(null)}`}>
                            {targetData.sentiment}
                          </span>
                        )}
                      </div>

                      <div className="reasoning">
                        <strong>Analysis:</strong>
                        <p>{targetData.reasoning}</p>
                      </div>

                      {targetData.evidence && targetData.evidence.length > 0 && (
                        <div className="evidence-section">
                          <strong>Evidence ({targetData.evidence.length} {targetData.evidence.length === 1 ? 'quote' : 'quotes'}):</strong>
                          {targetData.evidence.map((ev, i) => {
                            // SAFE EVIDENCE EXTRACTION with fallbacks
                            const quote = ev.quote || ev.text || ev.content || 'No quote available';
                            const source = ev.source || ev.title || ev.article || 'Unknown source';
                            const date = ev.date || ev.published || ev.timestamp || 'No date';

                            return (
                              <div key={i} className="evidence-item">
                                <blockquote>"{quote}"</blockquote>
                                <div className="evidence-meta">
                                  <span className="source">{source}</span>
                                  <span className="date">{date}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <p><strong>Note:</strong> This feature distinguishes between Assad Regime (pre-Dec 2024) and the new Syrian government.</p>
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
                Showing {relationshipData.relationships.length} relationship pairs from {relationshipData.total_articles || 0} articles
              </p>
              
              <div className="relationships-grid">
                {relationshipData.relationships.map((rel, idx) => {
                  // SAFE RELATIONSHIP DATA EXTRACTION
                  const safeRel = {
                    entity1: rel.entity1 || 'Unknown',
                    entity1_en: rel.entity1_en || rel.entity1 || 'Unknown',
                    entity2: rel.entity2 || 'Unknown',
                    entity2_en: rel.entity2_en || rel.entity2 || 'Unknown',
                    relationship_type: rel.relationship_type || 'neutral',
                    direction: rel.direction || 'mutual',
                    strength: rel.strength ?? 0,
                    evolution: rel.evolution || 'stable',
                    article_count: rel.article_count || rel.articles?.length || 0,
                    description: rel.description || 'No description available',
                    key_themes: rel.key_themes || rel.themes || [],
                    evidence: rel.evidence || rel.quotes || [],
                    timeline: rel.timeline || rel.periods || []
                  };

                  return (
                    <div key={idx} className="relationship-card">
                      <div className="rel-header">
                        <div className="rel-entities">
                          <span className="entity-name">{safeRel.entity1_en}</span>
                          <span className="rel-connector">
                            {safeRel.direction === 'mutual' ? '↔' : 
                             safeRel.direction === 'e1_to_e2' ? '→' : '←'}
                          </span>
                          <span className="entity-name">{safeRel.entity2_en}</span>
                        </div>
                        <span className={`rel-type-badge ${safeRel.relationship_type}`}>
                          {safeRel.relationship_type}
                        </span>
                      </div>

                      <div className="rel-meta">
                        <span className="rel-stat">
                          Strength: {(safeRel.strength * 100).toFixed(0)}%
                        </span>
                        <span className="rel-stat">
                          Evolution: {safeRel.evolution}
                        </span>
                        <span className="rel-stat">
                          Articles: {safeRel.article_count}
                        </span>
                      </div>

                      {safeRel.description && (
                        <p className="rel-description">{safeRel.description}</p>
                      )}

                      {safeRel.key_themes && safeRel.key_themes.length > 0 && (
                        <div className="rel-themes">
                          {safeRel.key_themes.map((theme, i) => (
                            <span key={i} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      )}

                      {safeRel.evidence && safeRel.evidence.length > 0 && (
                        <details className="rel-evidence">
                          <summary>View Evidence ({safeRel.evidence.length} quotes)</summary>
                          <div className="evidence-list">
                            {safeRel.evidence.slice(0, 3).map((ev, i) => {
                              const quote = ev.quote || ev.text || 'No quote';
                              const date = ev.date || ev.published || 'No date';
                              
                              return (
                                <div key={i} className="evidence-item-small">
                                  <div className="quote-text">"{quote}"</div>
                                  <div className="quote-meta">{date}</div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}

                      {safeRel.timeline && safeRel.timeline.length > 0 && (
                        <details className="rel-timeline">
                          <summary>View Timeline ({safeRel.timeline.length} periods)</summary>
                          <div className="timeline-list">
                            {safeRel.timeline.map((period, i) => {
                              const safePeriod = {
                                period: period.period || period.name || `Period ${i + 1}`,
                                relationship_type: period.relationship_type || period.type || 'neutral',
                                description: period.description || 'No description'
                              };

                              return (
                                <div key={i} className="timeline-period">
                                  <div className="period-header">
                                    <strong>{safePeriod.period}</strong>
                                    <span className={`period-type ${safePeriod.relationship_type}`}>
                                      {safePeriod.relationship_type}
                                    </span>
                                  </div>
                                  {safePeriod.description && (
                                    <p className="period-desc">{safePeriod.description}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
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