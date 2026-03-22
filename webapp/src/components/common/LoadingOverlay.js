import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingOverlay({ message, submessage }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
      <CircularProgress size={48} sx={{ mb: 2 }} />
      {message && <Typography variant="body1" color="text.secondary">{message}</Typography>}
      {submessage && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{submessage}</Typography>}
    </Box>
  );
}
