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
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
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

  const runAnalysis = async () => {
    if (!targets.trim()) {
      setError('Please enter at least one target');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      console.log("=== RAW DATA ===", data);
      
      setResult(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Failed to connect to API. Is the server running?');
    }

    setLoading(false);
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
    if (score > 0.2) return '#4caf50';
    if (score < -0.2) return '#f44336';
    return '#ff9800';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  // Build timeline chart data
  const getTimelineData = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    return {
      labels: timeline.map(t => t.period),
      datasets: [
        {
          label: 'Sentiment Score',
          data: timeline.map(t => t.score),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: timeline.map(t => getScoreColor(t.score)),
        }
      ]
    };
  };

  // Timeline chart options
  const timelineOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Sentiment Over Time',
        font: { size: 16 }
      },
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        min: -1,
        max: 1,
        title: {
          display: true,
          text: 'Sentiment Score'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time Period'
        }
      }
    }
  };

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
    if (!timeline || timeline.length === 0) return null;

    return (
      <div className="timeline-details">
        <h4>Period Breakdown</h4>
        <div className="period-grid">
          {timeline.map((period, i) => (
            <div key={i} className="period-card" style={{ borderLeftColor: getScoreColor(period.score) }}>
              <div className="period-header">
                <strong>{period.period}</strong>
                <span className="period-score" style={{ color: getScoreColor(period.score) }}>
                  {period.score > 0 ? '+' : ''}{period.score}
                </span>
              </div>
              <div className="period-stats">
                <span>{period.article_count} articles</span>
                <span>{period.mention_count} mentions</span>
              </div>
              {period.themes && period.themes.length > 0 && (
                <div className="period-themes">
                  {period.themes.slice(0, 3).map((theme, j) => (
                    <span key={j} className="theme-tag">{theme}</span>
                  ))}
                </div>
              )}
              {period.reasoning && (
                <p className="period-reasoning">{period.reasoning}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sentiment = result?.sentiment_analysis ? parseSentiment(result.sentiment_analysis) : null;

  return (
    <div className="App">
      <h1>🇸🇾 Syria Sentiment Analyzer</h1>
      <p className="subtitle">Comprehensive analysis of Syrian Dialogue Center articles</p>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveTab('sentiment')}
        >
          📊 Sentiment Timeline
        </button>
        <button 
          className={`tab-button ${activeTab === 'relationships' ? 'active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          🕸️ Relationship Map
        </button>
      </div>

      {/* Sentiment Analysis Tab */}
      {activeTab === 'sentiment' && (
        <>
          <div className="input-section">
            <label>Enter targets (comma separated):</label>
            <input
              type="text"
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
              placeholder="الأسد, روسيا, أمريكا, هتش"
            />
            <button onClick={runAnalysis} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze All Articles'}
            </button>
            <p className="hint">
              Examples: الأسد, النظام, روسيا, أمريكا, إيران, تركيا, هتش, الجولاني, قسد
            </p>
          </div>

          {error && <p className="error">{error}</p>}

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Scanning ALL articles...</p>
              <p className="loading-sub">Analyzing sentiment across all time periods</p>
            </div>
          )}

      {sentiment && sentiment.targets && (
        <div className="results">
          
          {Object.entries(sentiment.targets).map(([target, data]) => (
            <div key={target} className="target-section">
              
              {/* Header */}
              <div className="target-header-main">
                <h2>{target}</h2>
                <div className="overall-stats">
                  <span 
                    className="overall-score"
                    style={{ background: getScoreColor(data.overall_score || data.score || 0) }}
                  >
                    {data.overall_sentiment || data.sentiment} ({data.overall_score || data.score})
                  </span>
                  {data.trend && (
                    <span className="trend-badge">
                      {getTrendIcon(data.trend)} {data.trend}
                    </span>
                  )}
                  <span className="stats-badge">
                    📄 {data.total_articles || data.article_count} articles
                  </span>
                  {data.total_mentions && (
                    <span className="stats-badge">
                      🔍 {data.total_mentions} mentions
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline Chart */}
              {data.timeline && data.timeline.length > 1 && (
                <div className="chart-container">
                  <Line 
                    data={getTimelineData(data.timeline)} 
                    options={timelineOptions}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="reasoning-section">
                <h4>📊 Analysis Summary</h4>
                <p>{data.reasoning}</p>
              </div>

              {/* Key themes */}
              {data.key_themes && data.key_themes.length > 0 && (
                <div className="themes-section">
                  <h4>🏷️ Key Themes</h4>
                  <div className="themes-list">
                    {data.key_themes.map((theme, i) => (
                      <span key={i} className="theme-tag">{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Period breakdown */}
              {renderTimelineDetails(data.timeline)}

              {/* Evidence */}
              <div className="evidence-section">
                <h4>📝 Evidence Quotes</h4>
                {renderEvidence(data.evidence)}
              </div>

            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Relationship Map Tab */}
      {activeTab === 'relationships' && (
        <RelationshipMap apiBase={API_BASE} />
      )}
    </div>
  );
}

export default App;