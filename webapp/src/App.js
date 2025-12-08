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
import { Bar, Line } from 'react-chartjs-2';

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
  // Shared state
  const [activeTab, setActiveTab] = useState('sentiment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Sentiment tab state
  const [targets, setTargets] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  
  // Relationship tab state
  const [relationshipData, setRelationshipData] = useState(null);

  /**
   * SENTIMENT ANALYSIS TAB
   */
  const runSentimentAnalysis = async () => {
    if (!targets.trim()) {
      setError('Please enter at least one target entity');
      return;
    }

    setLoading(true);
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
      setSentimentResult(data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError('Failed to connect to server. Please try again.');
    }

    setLoading(false);
  };

  /**
   * RELATIONSHIP MAP TAB
   */
  const buildRelationshipMap = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to build map');
      
      const data = await response.json();
      setRelationshipData(data);
    } catch (err) {
      console.error("Relationship map error:", err);
      setError('Failed to build relationship map. Please try again.');
    }

    setLoading(false);
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

  // Get color based on sentiment score
  const getScoreColor = (score) => {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  };

  // Get relationship color
  const getRelationshipColor = (type) => {
    const colors = {
      alliance: '#10b981',
      support: '#3b82f6',
      neutral: '#6b7280',
      tension: '#f59e0b',
      conflict: '#ef4444',
      opposition: '#dc2626'
    };
    return colors[type] || '#6b7280';
  };

  // Build chart data for sentiment
  const getSentimentChartData = () => {
    if (!sentimentResult?.sentiment_analysis) return null;

    const sentiment = parseSentiment(sentimentResult.sentiment_analysis);
    if (!sentiment?.targets) return null;

    const targetNames = Object.keys(sentiment.targets);
    const scores = targetNames.map(t => sentiment.targets[t].score);
    
    const colors = scores.map(score => {
      const colorClass = getScoreColor(score);
      if (colorClass === 'positive') return '#10b981';
      if (colorClass === 'negative') return '#ef4444';
      return '#f59e0b';
    });

    return {
      labels: targetNames,
      datasets: [{
        label: 'Sentiment Score',
        data: scores,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8
      }]
    };
  };

  const sentiment = sentimentResult ? parseSentiment(sentimentResult.sentiment_analysis) : null;

  return (
    <div className="App">
      {/* Modern Header with New Syrian Flag Colors */}
      <header className="app-header-modern">
        <div className="header-content">
          <h1>🇸🇾 Syria Analysis Platform</h1>
          <p className="subtitle">Comprehensive sentiment and relationship tracking</p>
          <div className="header-badge">New Syrian Government | December 2024</div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveTab('sentiment')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">Sentiment Analysis</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'relationships' ? 'active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          <span className="tab-icon">🕸️</span>
          <span className="tab-label">Relationship Map</span>
        </button>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="error-modern">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ========== SENTIMENT ANALYSIS TAB ========== */}
      {activeTab === 'sentiment' && (
        <div className="tab-content sentiment-tab">
          <div className="section-card">
            <h2 className="section-title">Target Entities</h2>
            <p className="section-desc">Enter Syrian political entities to analyze sentiment</p>
            
            <div className="input-group-modern">
              <input
                type="text"
                className="input-modern"
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                placeholder="Assad regime, Syrian opposition, Russia, Turkey, HTS, Kurds..."
                onKeyPress={(e) => e.key === 'Enter' && !loading && runSentimentAnalysis()}
              />
              <button 
                className="btn-modern btn-primary" 
                onClick={runSentimentAnalysis} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-modern"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span>▶</span> Run Analysis
                  </>
                )}
              </button>
            </div>

            <div className="input-hints">
              <span className="hint-badge">💡 Try: "Assad regime"</span>
              <span className="hint-badge">💡 Try: "Russia, Turkey"</span>
              <span className="hint-badge">💡 Try: "HTS, Syrian opposition"</span>
            </div>
          </div>

          {/* Sentiment Results */}
          {sentiment && (
            <div className="results-modern">
              {/* Chart */}
              {getSentimentChartData() && (
                <div className="section-card chart-card">
                  <h2 className="section-title">Sentiment Distribution</h2>
                  <div className="chart-wrapper">
                    <Bar
                      data={getSentimentChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            padding: 16,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
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
                          x: {
                            grid: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Detailed Cards */}
              <div className="targets-grid">
                {Object.entries(sentiment.targets).map(([target, data]) => (
                  <div key={target} className="target-card-modern">
                    <div className="card-header-modern">
                      <h3 className="target-name-modern">{target}</h3>
                      <span className={`badge-modern badge-${getScoreColor(data.score)}`}>
                        {data.sentiment}
                        <span className="badge-score">{data.score.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="card-section">
                      <h4 className="section-label">Analysis</h4>
                      <p className="reasoning-text">{data.reasoning}</p>
                    </div>

                    {data.evidence && data.evidence.length > 0 && (
                      <div className="card-section">
                        <h4 className="section-label">
                          Evidence ({data.evidence.length} {data.evidence.length === 1 ? 'quote' : 'quotes'})
                        </h4>
                        <div className="evidence-list">
                          {data.evidence.map((ev, i) => (
                            <div key={i} className="evidence-card">
                              <blockquote className="evidence-quote">"{ev.quote}"</blockquote>
                              <div className="evidence-meta">
                                <span className="evidence-source">{ev.source}</span>
                                <span className="evidence-date">{ev.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!sentiment && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>Ready to Analyze</h3>
              <p>Enter target entities above and click "Run Analysis" to begin</p>
            </div>
          )}
        </div>
      )}

      {/* ========== RELATIONSHIP MAP TAB ========== */}
      {activeTab === 'relationships' && (
        <div className="tab-content relationships-tab">
          <div className="section-card">
            <h2 className="section-title">Entity Relationship Network</h2>
            <p className="section-desc">
              Visualize how Syrian political entities interact and how relationships evolve over time
            </p>
            <div className="info-badge">
              <span className="badge-icon">ℹ️</span>
              Distinguishes between Assad Regime (pre-Dec 2024) and New Syrian Government
            </div>
            
            <button 
              className="btn-modern btn-primary" 
              onClick={buildRelationshipMap} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-modern"></span>
                  Building Map...
                </>
              ) : (
                <>
                  <span>🗺️</span> Build Relationship Map
                </>
              )}
            </button>
          </div>

          {/* Relationship Results */}
          {relationshipData && (
            <div className="results-modern">
              <div className="section-card">
                <h3 className="section-title">Relationship Network</h3>
                <div className="relationships-grid">
                  {relationshipData.relationships && relationshipData.relationships.map((rel, idx) => (
                    <div key={idx} className="relationship-card-modern">
                      <div className="rel-header">
                        <div className="rel-entities">
                          <span className="entity">{rel.entity1_en || rel.entity1}</span>
                          <span className="rel-arrow" style={{ 
                            color: getRelationshipColor(rel.relationship_type) 
                          }}>
                            {rel.direction === 'mutual' ? '↔' : 
                             rel.direction === 'e1_to_e2' ? '→' : '←'}
                          </span>
                          <span className="entity">{rel.entity2_en || rel.entity2}</span>
                        </div>
                        <span 
                          className="rel-type-badge"
                          style={{ 
                            backgroundColor: getRelationshipColor(rel.relationship_type) 
                          }}
                        >
                          {rel.relationship_type}
                        </span>
                      </div>

                      <div className="rel-meta">
                        <span className="rel-strength">
                          Strength: {(rel.strength * 100).toFixed(0)}%
                        </span>
                        <span className="rel-evolution">{rel.evolution}</span>
                      </div>

                      <p className="rel-description">{rel.description}</p>

                      {rel.key_themes && rel.key_themes.length > 0 && (
                        <div className="rel-themes">
                          {rel.key_themes.map((theme, i) => (
                            <span key={i} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      )}

                      {rel.evidence && rel.evidence.length > 0 && (
                        <details className="rel-evidence">
                          <summary>View Evidence ({rel.evidence.length})</summary>
                          <div className="evidence-list">
                            {rel.evidence.map((ev, i) => (
                              <div key={i} className="evidence-item-small">
                                <div className="quote-ar">"{ev.quote}"</div>
                                <div className="date-small">{ev.date}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!relationshipData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🕸️</div>
              <h3>No Map Generated Yet</h3>
              <p>Click "Build Relationship Map" to analyze entity relationships from all articles</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;