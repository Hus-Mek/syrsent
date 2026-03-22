import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ label, value, subtitle, color, sx = {} }) {
  return (
    <Card sx={{ minWidth: 140, ...sx }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color={color || 'text.primary'} sx={{ lineHeight: 1.2 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        )}
      </CardContent>
    </Card>
  );
}
