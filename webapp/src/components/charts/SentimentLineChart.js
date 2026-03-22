import React from 'react';
import { Box } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getSentimentLineOptions } from '../../utils/chartConfig';
import { useLanguage } from '../../contexts/LanguageContext';

// Import chartConfig to ensure registration
import '../../utils/chartConfig';

export default function SentimentLineChart({ timeline, title, height = 300, sourceColor = '#1a5490' }) {
  const { t } = useLanguage();

  if (!timeline || timeline.length === 0) return null;

  const data = {
    labels: timeline.map(item => item.period),
    datasets: [{
      label: t('score'),
      data: timeline.map(item => item.score),
      borderColor: sourceColor,
      backgroundColor: sourceColor + '1a',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  return (
    <Box sx={{ height }}>
      <Line data={data} options={getSentimentLineOptions(title || t('sentimentTimeline'))} />
    </Box>
  );
}
