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

function App() {
  const [targets, setTargets] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * EXPLANATION: Main analysis function
   * - Validates user input (needs at least one target)
   * - Sends request to backend API
   * - Handles response and error states
   */
  const runAnalysis = async () => {
    // Input validation
    if (!targets.trim()) {
      setError('Please enter at least one target entity to analyze');
      return;
    }

    setLoading(true);
    setError('');

    // Split comma-separated targets and clean them
    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      // API call to backend
      const response = await fetch('https://syrsent.onrender.com/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      console.log("Analysis completed:", data);
      
      setResult(data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError('Failed to connect to server. Please check if the API is running and try again.');
    }

    setLoading(false);
  };

  /**
   * EXPLANATION: Parse sentiment JSON safely
   * The backend returns sentiment analysis as a JSON string
   * We need to parse it carefully and handle any parsing errors
   */
  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      return JSON.parse(sentimentStr);
    } catch (e) {
      console.error("JSON parsing failed:", e);
      return null;
    }
  };

  /**
   * EXPLANATION: Get color based on sentiment score
   * Positive (>0.2) = green, Negative (<-0.2) = red, Neutral = amber
   */
  const getScoreColor = (score) => {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  };

  /**
   * EXPLANATION: Build chart data from results
   * Creates a Chart.js compatible data structure for the bar chart
   * Uses CSS variables for consistent colors
   */
  const getChartData = () => {
    if (!result?.sentiment_analysis) return null;

    const sentiment = parseSentiment(result.sentiment_analysis);
    if (!sentiment?.targets) return null;

    const targetNames = Object.keys(sentiment.targets);
    const scores = targetNames.map(t => sentiment.targets[t].score);
    
    // Map scores to color classes
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
        borderRadius: 6,
        hoverBackgroundColor: colors.map(c => c + 'dd'), // Add transparency on hover
      }]
    };
  };

  /**
   * EXPLANATION: Chart configuration options
   * Customizes how the Chart.js bar chart looks
   */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      title: {
        display: true,
        text: 'Sentiment Analysis Overview',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: 20
      },
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
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
        title: {
          display: true,
          text: 'Sentiment Score (-1 to +1)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Parse sentiment once for the entire component
  const sentiment = result ? parseSentiment(result.sentiment_analysis) : null;

  return (
    <div className="App">
      {/* HEADER SECTION */}
      <header className="app-header">
        <h1>Syria Sentiment Analyzer</h1>
        <p className="app-subtitle">
          Analyzing sentiment in the new Syria's political discourse
        </p>
      </header>

      {/* INPUT SECTION */}
      <section className="input-section">
        <label className="input-label">
          Enter target entities (comma-separated):
        </label>
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder="e.g., Assad regime, Syrian opposition, Russia, Turkey"
            onKeyPress={(e) => {
              // Allow Enter key to trigger analysis
              if (e.key === 'Enter' && !loading) {
                runAnalysis();
              }
            }}
          />
          <button 
            className="btn btn-primary" 
            onClick={runAnalysis} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              'Run Analysis'
            )}
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          💡 Tip: Try entities like "Assad regime", "Syrian opposition", "civilians", "Russia", "Turkey", "Kurds"
        </p>
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="error">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* RESULTS SECTION */}
      {sentiment && (
        <div className="results">
          
          {/* CHART VISUALIZATION */}
          {getChartData() && (
            <div className="chart-container">
              <div className="chart-header">
                <h2 className="chart-title">Sentiment Distribution</h2>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                  Visual representation of sentiment scores across all analyzed entities
                </p>
              </div>
              <Bar
                data={getChartData()}
                options={chartOptions}
              />
            </div>
          )}

          {/* DETAILED ANALYSIS CARDS */}
          <section className="targets-section">
            <h2 className="section-title">Detailed Analysis</h2>
            
            {Object.entries(sentiment.targets).map(([target, data]) => (
              <article key={target} className="target-card">
                {/* TARGET HEADER WITH NAME AND SCORE */}
                <div className="target-header">
                  <h3 className="target-name">{target}</h3>
                  <span 
                    className={`score-badge ${getScoreColor(data.score)}`}
                  >
                    {data.sentiment} 
                    <span style={{ 
                      opacity: 0.9, 
                      marginLeft: '0.5rem',
                      fontWeight: 'normal' 
                    }}>
                      ({data.score.toFixed(3)})
                    </span>
                  </span>
                </div>

                {/* REASONING EXPLANATION */}
                <div className="reasoning">
                  <strong>Analysis Reasoning</strong>
                  <p>{data.reasoning}</p>
                </div>

                {/* EVIDENCE QUOTES */}
                {data.evidence && data.evidence.length > 0 && (
                  <div className="evidence-section">
                    <strong>Supporting Evidence ({data.evidence.length} {data.evidence.length === 1 ? 'quote' : 'quotes'})</strong>
                    {data.evidence.map((ev, i) => (
                      <div key={i} className="evidence-item">
                        <blockquote>"{ev.quote}"</blockquote>
                        <div className="evidence-source">
                          <strong>{ev.source}</strong> — {ev.date}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        </div>
      )}

      {/* EMPTY STATE - Show when no results yet */}
      {!sentiment && !loading && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: '#666' 
        }}>
          <p style={{ fontSize: '1.1rem' }}>
            Enter target entities above and click "Run Analysis" to begin
          </p>
        </div>
      )}
    </div>
  );
}

export default App;