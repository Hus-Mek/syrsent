import React from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ErrorAlert({ message, onClose }) {
  const { t } = useLanguage();
  if (!message) return null;
  return (
    <Alert severity="error" onClose={onClose} sx={{ mb: 2 }}>
      <AlertTitle>{t('error')}</AlertTitle>
      {message}
    </Alert>
  );
}
