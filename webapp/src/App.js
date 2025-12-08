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
      setSentimentResult(data);
    } catch (err) {
      console.error("Sentiment analysis error:", err);
      setError('Failed to analyze sentiment. Please try again.');
    }

    setSentimentLoading(false);
  };

  /**
   * RELATIONSHIP MAP
   * Note: Backend needs to implement POST /api/relationships endpoint
   */
  const buildRelationshipMap = async () => {
    setRelationshipLoading(true);
    setError('');

    try {
      // Check if endpoint exists
      const response = await fetch(`${API_BASE}/api/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Relationship mapping not yet implemented on backend');
      }
      
      const data = await response.json();
      setRelationshipData(data);
    } catch (err) {
      console.error("Relationship map error:", err);
      setError('Relationship mapping feature coming soon. Backend endpoint needs to be implemented.');
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
                      {/* FIX: Check if score exists before calling toFixed */}
                      {data.score !== undefined && data.score !== null ? (
                        <span className={`score-badge ${getScoreColorClass(data.score)}`}>
                          {data.sentiment} ({data.score.toFixed(2)})
                        </span>
                      ) : (
                        <span className="score-badge neutral">
                          {data.sentiment || 'Unknown'} (N/A)
                        </span>
                      )}
                    </div>

                    <div className="reasoning">
                      <strong>Analysis:</strong>
                      <p>{data.reasoning || 'No reasoning provided'}</p>
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
          {relationshipData && (
            <div className="relationships-section">
              <h2>Entity Relationships</h2>
              {/* Display relationship data here */}
              <p>Relationship visualization will appear here once backend is ready.</p>
            </div>
          )}

          {/* Empty State */}
          {!relationshipData && !relationshipLoading && (
            <div className="empty-state">
              <div className="empty-icon">🕸️</div>
              <h3>No Map Generated Yet</h3>
              <p>Click "Build Relationship Map" to analyze entity relationships</p>
              <p className="note">Note: Backend endpoint needs to support POST /api/relationships</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;