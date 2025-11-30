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

  const runAnalysis = async () => {
    if (!targets.trim()) {
      setError('Please enter at least one target');
      return;
    }

    setLoading(true);
    setError('');

    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await fetch('https://Hussssa-syria-sentiment.hf.space/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: targetList })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      console.log("=== RAW DATA ===", data);
      console.log("=== SENTIMENT STRING ===", data.sentiment_analysis);
      
      try {
        const parsed = JSON.parse(data.sentiment_analysis);
        console.log("=== PARSED OK ===", parsed);
      } catch (e) {
        console.error("=== PARSE FAILED ===", e);
      }
      
      setResult(data);
    } catch (err) {
      console.error("=== FETCH ERROR ===", err);
      setError('Failed to connect to server. Is the API running?');
    }

    setLoading(false);
  };

  // Parse sentiment JSON safely
  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      return JSON.parse(sentimentStr);
    } catch (e) {
      console.error("parseSentiment failed:", e);
      return null;
    }
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score > 0.2) return '#4caf50';
    if (score < -0.2) return '#f44336';
    return '#ff9800';
  };

  // Build chart data from result
  const getChartData = () => {
    if (!result?.sentiment_analysis) return null;

    const sentiment = parseSentiment(result.sentiment_analysis);
    if (!sentiment?.targets) return null;

    const targetNames = Object.keys(sentiment.targets);
    const scores = targetNames.map(t => sentiment.targets[t].score);
    const colors = scores.map(s => getScoreColor(s));

    return {
      labels: targetNames,
      datasets: [{
        label: 'Sentiment Score',
        data: scores,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1
      }]
    };
  };

  const sentiment = result ? parseSentiment(result.sentiment_analysis) : null;

  return (
    <div className="App">
      <h1>Syria Sentiment Analyzer</h1>

      <div className="input-section">
        <label>Enter targets (comma separated):</label>
        <input
          type="text"
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          placeholder="Assad regime, opposition, civilians, Russia"
        />
        <button onClick={runAnalysis} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {sentiment && (
        <div className="results">
          
          {/* Chart */}
          {getChartData() && (
            <div className="chart-container">
              <Bar
                data={getChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Sentiment by Target'
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
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Details for each target */}
          <div className="targets-section">
            <h2>Analysis Details</h2>
            
            {Object.entries(sentiment.targets).map(([target, data]) => (
              <div key={target} className="target-card">
                <div className="target-header">
                  <h3>{target}</h3>
                  <span 
                    className="score-badge"
                    style={{ background: getScoreColor(data.score) }}
                  >
                    {data.sentiment} ({data.score})
                  </span>
                </div>

                <div className="reasoning">
                  <strong>Reasoning:</strong> {data.reasoning}
                </div>

                {data.evidence && data.evidence.length > 0 && (
                  <div className="evidence-section">
                    <strong>Evidence:</strong>
                    {data.evidence.map((ev, i) => (
                      <div key={i} className="evidence-item">
                        <blockquote>"{ev.quote}"</blockquote>
                        <div className="evidence-source">
                          — {ev.source} ({ev.date})
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
    </div>
  );
}

export default App;