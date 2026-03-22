// API Configuration
export const API_BASE = process.env.REACT_APP_API_BASE || 'https://hussssa-syrsenthf.hf.space';

// Source configuration with colors and labels
export const SOURCE_CONFIG = {
  sydialogue: {
    id: 'sydialogue',
    label: 'Syrian Dialogue',
    label_ar: 'مركز الحوار السوري',
    color: '#1a5490',
    colorLight: '#e8f4f8',
    chartBorder: 'rgb(26, 84, 144)',
    chartBg: 'rgba(26, 84, 144, 0.1)',
  },
  harmoon: {
    id: 'harmoon',
    label: 'Harmoon Center',
    label_ar: 'مركز حرمون',
    color: '#8b5cf6',
    colorLight: '#f3f0ff',
    chartBorder: 'rgb(139, 92, 246)',
    chartBg: 'rgba(139, 92, 246, 0.1)',
  },
  aljazeera: {
    id: 'aljazeera',
    label: 'Al Jazeera',
    label_ar: 'الجزيرة',
    color: '#d4a843',
    colorLight: '#fef9ed',
    chartBorder: 'rgb(212, 168, 67)',
    chartBg: 'rgba(212, 168, 67, 0.1)',
  },
};

// Sentiment colors
export const SENTIMENT_COLORS = {
  positive: '#4caf50',
  neutral: '#9e9e9e',
  negative: '#f44336',
  mixed: '#ff9800',
};

// Trend icons
export const TREND_DISPLAY = {
  improving: { icon: '\u2191', label: 'Improving' },
  declining: { icon: '\u2193', label: 'Declining' },
  stable: { icon: '\u2192', label: 'Stable' },
  insufficient_data: { icon: '?', label: 'Insufficient Data' },
};
