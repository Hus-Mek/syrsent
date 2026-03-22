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
import SourceComparison from './components/comparison/SourceComparison';
import CoverageExplorer from './components/coverage/CoverageExplorer';
import { API_BASE, SOURCE_CONFIG } from './constants';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

function App() {
  const [activeTab, setActiveTab] = useState('sentiment');
  const [targets, setTargets] = useState('');
  const [selectedSources, setSelectedSources] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Source stats from API
  const [sourceStats, setSourceStats] = useState(null);

  // Relationships state
  const [relationships, setRelationships] = useState(() => {
    const cached = localStorage.getItem('relationships_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.data) return parsed.data;
      } catch (e) {}
    }
    return null;
  });
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);

  // Load source stats on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/sources`)
      .then(r => r.json())
      .then(data => setSourceStats(data))
      .catch(() => {});
  }, []);

  // Auto-load relationships
  useEffect(() => {
    if (activeTab === 'relationships' && !relationships && !relationshipsLoading) {
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
      const targetList = targets.split(',').map(t => t.trim()).filter(Boolean);
      const body = { targets: targetList };
      if (selectedSources) body.sources = selectedSources;

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const loadRelationships = async () => {
    setRelationshipsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/relationships?min_articles=5&max_pairs=15`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setRelationships(data);

      try {
        localStorage.setItem('relationships_cache', JSON.stringify({
          data: data,
          timestamp: Date.now()
        }));
      } catch (e) {}
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const clearRelationshipsCache = () => {
    localStorage.removeItem('relationships_cache');
    setRelationships(null);
  };

  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      const parsed = typeof sentimentStr === 'string' ? JSON.parse(sentimentStr) : sentimentStr;
      if (parsed.error) { setError(parsed.error); return null; }
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const getScoreColor = (score) => {
    if (score > 0.2) return '#10b981';
    if (score < -0.2) return '#ef4444';
    return '#f59e0b';
  };

  const getChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, font: { size: 14, weight: '600' }, color: '#1a5490' }
    },
    scales: {
      y: {
        min: -1, max: 1,
        ticks: { callback: (v) => v.toFixed(1), font: { size: 11 } },
        grid: { color: 'rgba(26, 84, 144, 0.1)' }
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
    }
  });

  const renderEvidence = (evidence) => {
    if (!evidence || evidence.length === 0) return <p className="no-evidence">No evidence quotes available</p>;
    return evidence.map((ev, i) => {
      const sentimentClass = ev.sentiment === 'positive' ? 'evidence-positive' :
                            ev.sentiment === 'negative' ? 'evidence-negative' : '';
      return (
        <div key={i} className={`evidence-item ${sentimentClass}`}>
          <blockquote dir="auto">"{typeof ev === 'string' ? ev : ev.quote}"</blockquote>
          <div className="evidence-meta">
            {ev.period && <span className="evidence-period">{ev.period}</span>}
            {ev.sentiment && <span className={`sentiment-tag ${ev.sentiment}`}>{ev.sentiment}</span>}
          </div>
        </div>
      );
    });
  };

  const renderTimelineDetails = (timeline) => {
    if (!timeline || timeline.length === 0) return <p className="no-data">No timeline data available</p>;
    return (
      <div className="timeline-cards">
        {timeline.map((period, i) => (
          <div key={i} className="period-card">
            <div className="period-header">
              <h4>{period.period}</h4>
              <span className={`sentiment-badge ${period.sentiment}`}>{period.sentiment}</span>
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
            {period.reasoning && <p className="reasoning">{period.reasoning}</p>}
          </div>
        ))}
      </div>
    );
  };

  const sentiment = result?.sentiment_analysis ? parseSentiment(result.sentiment_analysis) : null;

  const tabs = [
    { id: 'sentiment', label: 'Sentiment Analysis', icon: null },
    { id: 'comparison', label: 'Source Comparison', icon: null },
    { id: 'coverage', label: 'Coverage Explorer', icon: null },
    { id: 'relationships', label: 'Relationship Map', icon: null },
  ];

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-top">
            <h1>SyrSent</h1>
            <span className="header-subtitle">Syria Sentiment Analysis Platform</span>
          </div>
          <p className="header-desc">Multi-source political sentiment tracking, source comparison, and relationship mapping</p>
          {sourceStats && (
            <div className="header-stats">
              {sourceStats.sources && sourceStats.sources.map(src => (
                <span key={src.id} className="header-source-badge" style={{ background: 'rgba(255,255,255,0.15)', borderLeft: `3px solid ${src.color}` }}>
                  {src.name}: {src.article_count} articles
                </span>
              ))}
              <span className="header-total">{sourceStats.total_articles} total articles</span>
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
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
                  dir="auto"
                />
              </div>
              <div className="input-group">
                <label>Filter by Source (optional)</label>
                <div className="source-filter-row">
                  <button
                    className={`source-filter-btn ${!selectedSources ? 'active' : ''}`}
                    onClick={() => setSelectedSources(null)}
                  >
                    All Sources
                  </button>
                  {Object.values(SOURCE_CONFIG).map(src => (
                    <button
                      key={src.id}
                      className={`source-filter-btn ${selectedSources && selectedSources.includes(src.id) ? 'active' : ''}`}
                      style={{ '--src-color': src.color }}
                      onClick={() => setSelectedSources([src.id])}
                    >
                      <span className="source-dot" style={{ background: src.color }}></span>
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={runAnalysis}
                disabled={loading || !targets.trim()}
                className="analyze-btn"
              >
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Running sentiment analysis...</p>
                <small>This may take 30-60 seconds</small>
              </div>
            )}

            {sentiment && sentiment.targets && (
              <div className="results-container">
                {Object.entries(sentiment.targets).map(([target, data]) => (
                  <div key={target} className="target-result">
                    <div className="target-header">
                      <h2 dir="auto">{target}</h2>
                      <div className="overall-stats">
                        <div className="stat-box">
                          <span className="stat-label">Overall Score</span>
                          <span className="stat-value large" style={{ color: getScoreColor(data.overall_score) }}>
                            {data.overall_score?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">Sentiment</span>
                          <span className={`sentiment-badge ${data.overall_sentiment}`}>{data.overall_sentiment}</span>
                        </div>
                        <div className="stat-box">
                          <span className="stat-label">Trend</span>
                          <span className="trend-badge">{data.trend}</span>
                        </div>
                      </div>
                    </div>

                    <div className="data-summary">
                      <span>{data.total_articles} articles</span>
                      <span>{data.total_mentions} mentions</span>
                      <span>{data.periods_analyzed} periods</span>
                    </div>

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

                    {data.key_themes && data.key_themes.length > 0 && (
                      <div className="themes-section">
                        <h4>Key Themes</h4>
                        <div className="theme-tags">
                          {data.key_themes.map((theme, i) => (
                            <span key={i} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="timeline-section">
                      <h4>Period Analysis</h4>
                      {renderTimelineDetails(data.timeline)}
                    </div>

                    <div className="evidence-section">
                      <h4>Evidence Quotes</h4>
                      {renderEvidence(data.evidence)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Source Comparison Tab */}
        {activeTab === 'comparison' && (
          <SourceComparison apiBase={API_BASE} />
        )}

        {/* Coverage Explorer Tab */}
        {activeTab === 'coverage' && (
          <CoverageExplorer apiBase={API_BASE} />
        )}

        {/* Relationship Map Tab */}
        {activeTab === 'relationships' && (
          <div className="relationships-tab">
            <div className="relationships-header">
              <div className="relationships-controls">
                {relationships && (
                  <div className="cache-info">
                    <span className="cache-badge">Cached</span>
                    <button onClick={clearRelationshipsCache} className="refresh-btn">Clear Cache</button>
                    <button onClick={loadRelationships} className="reload-btn">Refresh Data</button>
                  </div>
                )}
                {relationshipsLoading && <p className="loading-text">Loading relationships...</p>}
              </div>
            </div>

            {relationshipsLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading relationship map... This may take a moment.</p>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {relationships && <RelationshipMap data={relationships} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
