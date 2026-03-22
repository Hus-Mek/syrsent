import React from 'react';
import { Box } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { SOURCE_CONFIG } from '../../constants';
import { getBarOptions } from '../../utils/chartConfig';
import { useLanguage } from '../../contexts/LanguageContext';

import '../../utils/chartConfig';

export default function CoverageBarChart({ coverageData, title, height = 250 }) {
  const { t } = useLanguage();

  if (!coverageData) return null;

  const sourceIds = Object.keys(coverageData);
  const labels = sourceIds.map(id => SOURCE_CONFIG[id]?.label || id);
  const colors = sourceIds.map(id => SOURCE_CONFIG[id]?.color || '#999');

  const data = {
    labels,
    datasets: [
      {
        label: t('articles'),
        data: sourceIds.map(id => coverageData[id]?.article_count || 0),
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 1,
      },
      {
        label: t('mentions'),
        data: sourceIds.map(id => coverageData[id]?.mention_count || 0),
        backgroundColor: colors.map(c => c + '44'),
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box sx={{ height }}>
      <Bar data={data} options={getBarOptions(title || t('coverageBySource'))} />
    </Box>
  );
}
