import React from 'react';
import { Box, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { SOURCE_CONFIG } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

import '../../utils/chartConfig';

const CHART_TEXT_COLOR = '#9aa0a6';
const CHART_GRID_COLOR = 'rgba(255,255,255,0.06)';

export default function ComparisonChart({ targetData, height = 350 }) {
  const { t } = useLanguage();

  if (!targetData || !targetData.sources) return null;

  const allPeriods = new Set();
  Object.values(targetData.sources).forEach(sourceData => {
    if (sourceData.timeline) sourceData.timeline.forEach(item => allPeriods.add(item.period));
  });
  const sortedPeriods = [...allPeriods].sort();
  if (sortedPeriods.length === 0) return <Typography color="text.secondary">{t('noTimeline')}</Typography>;

  const datasets = Object.entries(targetData.sources).map(([sourceId, sourceData]) => {
    const config = SOURCE_CONFIG[sourceId];
    if (!config || !sourceData.timeline) return null;
    const periodMap = {};
    sourceData.timeline.forEach(item => { periodMap[item.period] = item.score; });
    return {
      label: config.label,
      data: sortedPeriods.map(p => periodMap[p] ?? null),
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: t('sentimentOverTime'), font: { size: 14 }, color: CHART_TEXT_COLOR },
      legend: { position: 'top', labels: { color: CHART_TEXT_COLOR } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const score = ctx.parsed.y;
            if (score === null) return `${ctx.dataset.label}: ${t('noData')}`;
            const label = score > 0.2 ? t('positive') : score < -0.2 ? t('negative') : t('neutral');
            return `${ctx.dataset.label}: ${score.toFixed(2)} (${label})`;
          },
        },
      },
    },
    scales: {
      y: {
        min: -1.2, max: 1.2,
        title: { display: true, text: t('score'), color: CHART_TEXT_COLOR },
        ticks: { color: CHART_TEXT_COLOR },
        grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(255,255,255,0.2)' : CHART_GRID_COLOR },
      },
      x: {
        title: { display: true, text: t('periods'), color: CHART_TEXT_COLOR },
        ticks: { color: CHART_TEXT_COLOR },
        grid: { display: false },
      },
    },
  };

  return (
    <Box sx={{ height }}>
      <Line data={{ labels: sortedPeriods, datasets }} options={options} />
    </Box>
  );
}
