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
    setResult(null);

    const targetList = targets.split(',').map(t => t.trim()).filter(t => t);

    try {
      const response = await fetch('https://hussssa-syrsenthf.hf.space/api/analyze', {
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
      console.error("=== FETCH ERROR ===", err);
      setError('Failed to connect to server. Is the API running?');
    }

    setLoading(false);
  };

  // Parse sentiment JSON safely
  const parseSentiment = (sentimentStr) => {
    if (!sentimentStr) return null;
    try {
      const parsed = JSON.parse(sentimentStr);
      // Check for error response
      if (parsed.error) {
        console.error("API returned error:", parsed.error);
        setError(parsed.error);
        return null;
      }
      return parsed;
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

  // Get evidence display - handles both string and object formats
  const renderEvidence = (evidence) => {
    if (!evidence || evidence.length === 0) {
      return <p className="no-evidence">No evidence quotes found</p>;
    }

    return evidence.map((ev, i) => {
      // Handle string format: "quote text"
      if (typeof ev === 'string') {
        return (
          <div key={i} className="evidence-item">
            <blockquote>"{ev}"</blockquote>
          </div>
        );
      }
      
      // Handle object format: {quote, source, date}
      return (
        <div key={i} className="evidence-item">
          <blockquote>"{ev.quote}"</blockquote>
          {(ev.source || ev.date) && (
            <div className="evidence-source">
              — {ev.source || 'Unknown source'} {ev.date && ev.date !== 'Unknown' ? `(${ev.date})` : ''}
            </div>
          )}
        </div>
      );
    });
  };

  const sentiment = result ? parseSentiment(result.sentiment_analysis) : null;

  return (
    <div className="App">
      <h1>Syria Sentiment Analyzer</h1>
      <p className="subtitle">Analyzing Arabic articles from Syrian Dialogue Center</p>

      <div className="input-section">
        <label>Enter targets (comma separated):</label>
        <input
          type="text"
          value={targets}
          onChange={(e) => setTargets(e.target.value)}
          placeholder="الأسد, روسيا, أمريكا, المعارضة"
        />
        <button onClick={runAnalysis} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
        <p className="hint">
          Try: Assad, الأسد, Russia, روسيا, Iran, إيران, Turkey, تركيا
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="loading">
          <p>Analyzing articles... This may take a moment.</p>
        </div>
      )}

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
                  <strong>Reasoning:</strong> {data.reasoning || 'No reasoning provided'}
                </div>

                <div className="evidence-section">
                  <strong>Evidence:</strong>
                  {renderEvidence(data.evidence)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;