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

// Register chart.js components once
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

// Dark theme text/grid colors
const CHART_TEXT_COLOR = '#9aa0a6';
const CHART_GRID_COLOR = 'rgba(255, 255, 255, 0.06)';

export const getScoreColor = (score) => {
  if (score > 0.2) return '#10b981';
  if (score < -0.2) return '#ef4444';
  return '#f59e0b';
};

export const getSentimentLineOptions = (title) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: title,
      font: { size: 14, weight: '600' },
      color: CHART_TEXT_COLOR,
    },
  },
  scales: {
    y: {
      min: -1,
      max: 1,
      ticks: {
        callback: (v) => v.toFixed(1),
        font: { size: 11 },
        color: CHART_TEXT_COLOR,
      },
      grid: { color: CHART_GRID_COLOR },
    },
    x: {
      ticks: { font: { size: 11 }, color: CHART_TEXT_COLOR },
      grid: { display: false },
    },
  },
});

export const getBarOptions = (title) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: true, text: title, color: CHART_TEXT_COLOR },
    legend: { labels: { color: CHART_TEXT_COLOR } },
  },
  scales: {
    y: {
      ticks: { color: CHART_TEXT_COLOR },
      grid: { color: CHART_GRID_COLOR },
    },
    x: {
      ticks: { color: CHART_TEXT_COLOR },
      grid: { display: false },
    },
  },
});

// Relationship type colors
export const RELATIONSHIP_COLORS = {
  alliance: '#4caf50',
  support: '#8bc34a',
  cooperation: '#00bcd4',
  negotiation: '#2196f3',
  neutral: '#9e9e9e',
  tension: '#ff9800',
  opposition: '#ff5722',
  conflict: '#f44336',
};

// Entity type colors
export const ENTITY_COLORS = {
  former_government: '#5c1a1a',
  current_government: '#1a5c1a',
  ruling_faction: '#1a3d5c',
  opposition: '#5c3d1a',
  armed_faction: '#3d1a5c',
  terrorist: '#1a1a1a',
  foreign_power: '#3d3d5c',
  militia: '#5c1a3d',
  unknown: '#616161',
};

export const relationshipToScore = (type) => {
  const scores = {
    alliance: 1,
    support: 0.7,
    cooperation: 0.5,
    negotiation: 0.2,
    neutral: 0,
    tension: -0.3,
    opposition: -0.6,
    conflict: -1,
  };
  return scores[type] || 0;
};
