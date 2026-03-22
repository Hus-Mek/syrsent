import React from 'react';
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
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { SOURCE_CONFIG, SENTIMENT_COLORS, TREND_DISPLAY } from '../../constants';
import SourceSelector from '../common/SourceSelector';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

function ComparisonChart({ targetData }) {
  if (!targetData || !targetData.sources) return null;

  // Collect all periods across all sources
  const allPeriods = new Set();
  Object.values(targetData.sources).forEach((sourceData) => {
    if (sourceData.timeline) {
      sourceData.timeline.forEach((t) => allPeriods.add(t.period));
    }
  });
  const sortedPeriods = [...allPeriods].sort();

  if (sortedPeriods.length === 0) return <p>No timeline data available.</p>;

  // One dataset per source
  const datasets = Object.entries(targetData.sources).map(([sourceId, sourceData]) => {
    const config = SOURCE_CONFIG[sourceId];
    if (!config || !sourceData.timeline) return null;

    const periodMap = {};
    sourceData.timeline.forEach((t) => { periodMap[t.period] = t.score; });

    return {
      label: config.label,
      data: sortedPeriods.map((p) => periodMap[p] ?? null),
      borderColor: config.chartBorder,
      backgroundColor: config.chartBg,
      fill: false,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
      spanGaps: true,
      borderWidth: 2.5,
    };
  }).filter(Boolean);

  const chartData = { labels: sortedPeriods, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Sentiment Score Over Time by Source', font: { size: 14 } },
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const score = ctx.parsed.y;
            if (score === null) return `${ctx.dataset.label}: No data`;
            const label = score > 0.2 ? 'Positive' : score < -0.2 ? 'Negative' : 'Neutral';
            return `${ctx.dataset.label}: ${score.toFixed(2)} (${label})`;
          },
        },
      },
    },
    scales: {
      y: {
        min: -1.2,
        max: 1.2,
        title: { display: true, text: 'Sentiment Score' },
        ticks: {
          callback: (v) => {
            if (v >= 0.7) return 'Positive';
            if (v >= -0.3 && v <= 0.3) return 'Neutral';
            if (v <= -0.7) return 'Negative';
            return '';
          },
        },
        grid: {
          color: (ctx) => ctx.tick.value === 0 ? '#666' : '#eee',
        },
      },
      x: {
        title: { display: true, text: 'Time Period' },
      },
    },
  };

  return (
    <div className="comparison-chart-container" style={{ height: '350px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}


function CoverageStats({ targetData }) {
  if (!targetData || !targetData.sources) return null;

  return (
    <div className="coverage-stats-grid">
      {Object.entries(targetData.sources).map(([sourceId, sourceData]) => {
        const config = SOURCE_CONFIG[sourceId];
        if (!config) return null;

        const trend = TREND_DISPLAY[sourceData.trend] || TREND_DISPLAY.insufficient_data;
        const sentimentColor = SENTIMENT_COLORS[sourceData.overall_sentiment] || '#9e9e9e';

        return (
          <div
            key={sourceId}
            className="source-stat-card"
            style={{ borderTopColor: config.color }}
          >
            <div className="stat-source-header">
              <span className="stat-source-dot" style={{ background: config.color }}></span>
              <span className="stat-source-name">{config.label}</span>
            </div>
            <div className="stat-values">
              <div className="stat-item">
                <span className="stat-number">{sourceData.total_articles}</span>
                <span className="stat-label">Articles</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{sourceData.total_mentions}</span>
                <span className="stat-label">Mentions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number" style={{ color: sentimentColor }}>
                  {sourceData.overall_score?.toFixed(2) || 'N/A'}
                </span>
                <span className="stat-label">Score</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{trend.icon}</span>
                <span className="stat-label">{trend.label}</span>
              </div>
            </div>
            {sourceData.key_themes && sourceData.key_themes.length > 0 && (
              <div className="stat-themes">
                {sourceData.key_themes.slice(0, 4).map((theme, i) => (
                  <span key={i} className="theme-tag" style={{ background: config.colorLight, color: config.color }}>
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function CoverageBarChart({ coverageData }) {
  if (!coverageData) return null;

  const sourceIds = Object.keys(coverageData);
  const labels = sourceIds.map((id) => SOURCE_CONFIG[id]?.label || id);
  const colors = sourceIds.map((id) => SOURCE_CONFIG[id]?.color || '#999');

  const articleCounts = sourceIds.map((id) => coverageData[id]?.article_count || 0);
  const mentionCounts = sourceIds.map((id) => coverageData[id]?.mention_count || 0);

  const barData = {
    labels,
    datasets: [
      {
        label: 'Articles',
        data: articleCounts,
        backgroundColor: colors.map((c) => c + '99'),
        borderColor: colors,
        borderWidth: 1,
      },
      {
        label: 'Mentions',
        data: mentionCounts,
        backgroundColor: colors.map((c) => c + '44'),
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Coverage by Source' },
    },
  };

  return (
    <div style={{ height: '250px' }}>
      <Bar data={barData} options={options} />
    </div>
  );
}


function SourceComparison({ apiBase }) {
  const [targets, setTargets] = React.useState('');
  const [selectedSources, setSelectedSources] = React.useState(
    Object.keys(SOURCE_CONFIG)
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null);

  const handleCompare = async () => {
    const targetList = targets
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (targetList.length === 0) {
      setError('Please enter at least one target entity.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${apiBase}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: targetList,
          sources: selectedSources,
          max_periods: 8,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data.comparison);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="source-comparison">
      <div className="comparison-header">
        <h2>Source Comparison</h2>
        <p>Compare how different news sources cover the same entity or topic</p>
      </div>

      <div className="comparison-controls">
        <div className="input-group">
          <label>Target Entities</label>
          <input
            type="text"
            value={targets}
            onChange={(e) => setTargets(e.target.value)}
            placeholder="e.g. هتش, تركيا, الأسد"
            className="target-input"
            dir="auto"
          />
          <small>Separate multiple targets with commas</small>
        </div>

        <div className="input-group">
          <label>Sources</label>
          <SourceSelector
            selected={selectedSources}
            onChange={setSelectedSources}
          />
        </div>

        <button
          className="compare-btn"
          onClick={handleCompare}
          disabled={loading || !targets.trim()}
        >
          {loading ? 'Analyzing...' : 'Compare Sources'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing sentiment across {selectedSources.length} sources...</p>
          <small>This may take 30-60 seconds per source</small>
        </div>
      )}

      {result && result.targets && (
        <div className="comparison-results">
          {Object.entries(result.targets).map(([target, targetData]) => (
            <div key={target} className="comparison-target-card">
              <h3 className="target-title" dir="auto">{target}</h3>

              {Object.keys(targetData.sources || {}).length === 0 ? (
                <p className="no-data">No data found for this target across selected sources.</p>
              ) : (
                <>
                  <ComparisonChart targetData={targetData} />
                  <CoverageStats targetData={targetData} />
                  {targetData.coverage_comparison && (
                    <CoverageBarChart coverageData={
                      Object.fromEntries(
                        Object.entries(targetData.sources).map(([id, d]) => [
                          id,
                          { article_count: d.total_articles, mention_count: d.total_mentions },
                        ])
                      )
                    } />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { SourceComparison, ComparisonChart, CoverageStats, CoverageBarChart };
export default SourceComparison;
