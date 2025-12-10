import React, { useState, useEffect } from 'react';
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
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import RelationshipMap from './RelationshipMap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = 'https://hussssa-syrsenthf.hf.space';

function App() {
  const [activeTab, setActiveTab] = useState('sentiment');
  const [targets, setTargets] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Persistent relationships with localStorage cache (NEVER EXPIRES)
  const [relationships, setRelationships] = useState(() => {
    const cached = localStorage.getItem('relationships_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Load cached data regardless of age (permanent until manually refreshed)
        if (parsed.data) {
          const ageMinutes = Math.round((Date.now() - parsed.timestamp) / 1000 / 60);
          const ageDays = Math.floor(ageMinutes / 60 / 24);
          console.log(`📦 Loaded relationships from cache (age: ${ageDays} days, ${ageMinutes % (60 * 24)} minutes)`);
          return parsed.data;
        }
      } catch (e) {
        console.error('Failed to parse cached relationships:', e);
      }
    }
    return null;
  });
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  
  // Auto-load relationships on first visit to Relationships tab (if no cache exists)
  useEffect(() => {
    // Only auto-load if:
    // 1. We're on the relationships tab
    // 2. No cached data exists
    // 3. Not currently loading
    if (activeTab === 'relationships' && !relationships && !relationshipsLoading) {
      console.log('🔄 First visit detected - auto-loading relationships from API...');
      loadRelationships();
    }
  }, [activeTab, relationships, relationshipsLoading]);

  const runAnalysis = async () => {
    if (!targets.trim()) {
      setError('Please enter at least one target');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const targetList = targets.split(',').map(t => t.trim()).filter(t => t);
      
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError(err.message || 'Analysis failed');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadRelationships = async () => {
  console.log('🔄 Starting to load relationships...');
  setRelationshipsLoading(true);
  setError('');
  
  try {
    const response = await fetch(`${API_BASE}/api/relationships?min_articles=5&max_pairs=15`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Parse JSON directly
    const data = await response.json();
    console.log('✅ Received data with', data.relationships?.length, 'relationships');
    
    setRelationships(data);
    
    // Try to cache (might fail if too large)
    try {
      localStorage.setItem('relationships_cache', JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
      console.log('💾 Cached successfully');
    } catch (e) {
      console.warn('Cache failed (too large):', e);
      // Continue anyway - caching is optional
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    setError('Failed to load: ' + err.message);
  } finally {
    setRelationshipsLoading(false);
  }
};
  
  const clearRelationshipsCache = () => {
    localStorage.removeItem('relationships_cache');
    setRelationships(null);
    console.log('🗑️ Cleared relationships cache');
  };

  // Parse sentiment analysis JSON
  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      const parsed = typeof sentimentStr === 'string' ? JSON.parse(sentimentStr) : sentimentStr;
      if (parsed.error) {
        setError(parsed.error);
        return null;
      }
      
      // Debug: Log the structure
      console.log('📊 Parsed sentiment data:', parsed);
      if (parsed.targets) {
        Object.keys(parsed.targets).forEach(target => {
          const targetData = parsed.targets[target];
          console.log(`🎯 Target "${target}" evidence count:`, targetData.evidence?.length || 0);
          if (targetData.evidence && targetData.evidence[0]) {
            console.log('📝 First evidence item:', targetData.evidence[0]);
          }
        });
      }
      
      return parsed;
    } catch (e) {
      console.error("Parse failed:", e);
      return null;
    }
  };

  // Color based on score
  const getScoreColor = (score) => {
    if (score > 0.2) return '#10b981';
    if (score < -0.2) return '#ef4444';
    return '#f59e0b';
  };

  // Chart configuration
  const getChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title,
        font: { size: 14, weight: '600' },
        color: '#1a5490'
      }
    },
    scales: {
      y: {
        min: -1,
        max: 1,
        ticks: {
          callback: (value) => value.toFixed(1),
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(26, 84, 144, 0.1)'
        }
      },
      x: {
        ticks: {
          font: { size: 11 }
        },
        grid: {
          display: false
        }
      }
    }
  });

  // Render evidence with period
  const renderEvidence = (evidence) => {
    if (!evidence || evidence.length === 0) {
      return <p className="no-evidence">No evidence quotes available</p>;
    }

    console.log('🔍 Rendering evidence:', evidence[0]); // Debug first item

    return evidence.map((ev, i) => {
      const sentimentClass = ev.sentiment === 'positive' ? 'evidence-positive' : 
                            ev.sentiment === 'negative' ? 'evidence-negative' : '';
      
      return (
        <div key={i} className={`evidence-item ${sentimentClass}`}>
          <blockquote>"{typeof ev === 'string' ? ev : ev.quote}"</blockquote>
          <div className="evidence-meta">
            {ev.source && <span className="evidence-source">📄 {ev.source}</span>}
            {ev.date && <span className="evidence-date">📅 {ev.date}</span>}
            {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="evidence-url">🔗 Link</a>}
            {ev.period && <span className="evidence-period">📊 {ev.period}</span>}
            {ev.sentiment && <span className={`sentiment-tag ${ev.sentiment}`}>{ev.sentiment}</span>}
          </div>
        </div>
      );
    });
  };

  // Render timeline details
  const renderTimelineDetails = (timeline) => {
    if (!timeline || timeline.length === 0) {
      return <p className="no-data">No timeline data available</p>;
    }

    return (
      <div className="timeline-cards">
        {timeline.map((period, i) => (
          <div key={i} className="period-card">
            <div className="period-header">
              <h4>{period.period}</h4>
              <span className={`sentiment-badge ${period.sentiment}`}>
                {period.sentiment}
              </span>
            </div>
            
            <div className="period-stats">
              <div className="stat">
                <span className="stat-label">Score</span>
                <span className="stat-value" style={{ color: getScoreColor(period.score) }}>
                  {period.score?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Articles</span>
                <span className="stat-value">{period.article_count}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Mentions</span>
                <span className="stat-value">{period.mention_count}</span>
              </div>
            </div>

            {period.themes && period.themes.length > 0 && (
              <div className="themes">
                <strong>Themes:</strong>
                <div className="theme-tags">
                  {period.themes.map((theme, j) => (
                    <span key={j} className="theme-tag">{theme}</span>
                  ))}
                </div>
              </div>
            )}

            {period.reasoning && (
              <p className="reasoning">{period.reasoning}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const sentiment = result?.sentiment_analysis ? parseSentiment(result.sentiment_analysis) : null;

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🇸🇾 Syria Sentiment Analysis</h1>
          <p>Comprehensive political sentiment tracking & relationship mapping</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'sentiment' ? 'active' : ''}`}
            onClick={() => setActiveTab('sentiment')}
          >
            📊 Sentiment Analysis
          </button>
          <button 
            className={`tab ${activeTab === 'relationships' ? 'active' : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            🔗 Relationship Map
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* Sentiment Analysis Tab */}
        {activeTab === 'sentiment' && (
          <div className="sentiment-tab">
            <div className="input-section">
              <div className="input-group">
                <label htmlFor="targets">Target Entities (comma-separated)</label>
                <input
                  id="targets"
                  type="text"
                  value={targets}
                  onChange={(e) => setTargets(e.target.value)}
                  placeholder="e.g., assad, هتش, russia, turkey"
                  disabled={loading}
                />
              </div>
              <button 
                onClick={runAnalysis} 
                disabled={loading || !targets.trim()}
                className="analyze-btn"
              >
                {loading ? '⏳ Analyzing...' : '🚀 Analyze Sentiment'}
              </button>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {sentiment && sentiment.targets && (
              <div className="results-container">
                {Object.entries(sentiment.targets).map(([target, data]) => (
                  <div key={target} className="target-result">
                    <div className="target-header">
                      <h2>{target}</h2>
                      <div className="overall-stats">
                        <div className="stat-box">
                          <span className="stat-label">Overall Score</span>
                          <span 
                            className="stat-value large" 
                            style={{ color: getScoreColor(data.overall_score) }}
                          >
                            {data.overall_score?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">Sentiment</span>
                          <span className={`sentiment-badge ${data.overall_sentiment}`}>
                            {data.overall_sentiment}
                          </span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">Trend</span>
                          <span className="trend-badge">{data.trend}</span>
                        </div>
                      </div>
                    </div>

                    <div className="data-summary">
                      <span>📄 {data.total_articles} articles</span>
                      <span>💬 {data.total_mentions} mentions</span>
                      <span>📅 {data.periods_analyzed} periods</span>
                    </div>

                    {/* Timeline Chart */}
                    {data.timeline && data.timeline.length > 0 && (
                      <div className="chart-container">
                        <div style={{ height: '300px' }}>
                          <Line
                            data={{
                              labels: data.timeline.map(t => t.period),
                              datasets: [{
                                label: 'Sentiment Score',
                                data: data.timeline.map(t => t.score),
                                borderColor: '#1a5490',
                                backgroundColor: 'rgba(26, 84, 144, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6
                              }]
                            }}
                            options={getChartOptions('Sentiment Timeline')}
                          />
                        </div>
                      </div>
                    )}

                    {/* Key Themes */}
                    {data.key_themes && data.key_themes.length > 0 && (
                      <div className="themes-section">
                        <h4>🏷️ Key Themes</h4>
                        <div className="theme-tags">
                          {data.key_themes.map((theme, i) => (
                            <span key={i} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Period breakdown */}
                    <div className="timeline-section">
                      <h4>📅 Period Analysis</h4>
                      {renderTimelineDetails(data.timeline)}
                    </div>

                    {/* Evidence */}
                    <div className="evidence-section">
                      <h4>📝 Evidence Quotes</h4>
                      {renderEvidence(data.evidence)}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Relationship Map Tab */}
        {activeTab === 'relationships' && (
          <div className="relationships-tab">
            <div className="relationships-header">
              <div className="relationships-controls">
                {relationships && (
                  <div className="cache-info">
                    <span className="cache-badge">📦 Cached (Never Expires - Refresh Manually)</span>
                    <button onClick={clearRelationshipsCache} className="refresh-btn">
                      🗑️ Clear Cache
                    </button>
                    <button onClick={loadRelationships} className="reload-btn">
                      🔄 Refresh Data
                    </button>
                  </div>
                )}
                {relationshipsLoading && (
                  <p className="loading-text">⏳ Loading relationships for the first time...</p>
                )}
              </div>
            </div>

            {relationshipsLoading && (
              <div className="loading-message">
                <div className="spinner"></div>
                <p>Loading relationship map... This may take a moment.</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {relationships && <RelationshipMap data={relationships} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;