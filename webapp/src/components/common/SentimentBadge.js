import React from 'react';
import { Chip } from '@mui/material';
import { SENTIMENT_COLORS } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SentimentBadge({ sentiment, size = 'small' }) {
  const { t } = useLanguage();
  const color = SENTIMENT_COLORS[sentiment] || '#9e9e9e';
  const label = t(sentiment) || sentiment;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: color + '22',
        color: color,
        fontWeight: 600,
        borderColor: color,
        border: '1px solid',
      }}
    />
  );
}
