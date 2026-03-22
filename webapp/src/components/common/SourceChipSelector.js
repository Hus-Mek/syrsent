import React from 'react';
import { Chip, Stack } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';
import { SOURCE_CONFIG } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SourceChipSelector({ selected, onChange }) {
  const { language } = useLanguage();

  const toggle = (id) => {
    if (selected.includes(id)) {
      if (selected.length > 1) onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {Object.values(SOURCE_CONFIG).map(src => (
        <Chip
          key={src.id}
          icon={<CircleIcon sx={{ fontSize: 10, color: `${src.color} !important` }} />}
          label={language === 'ar' ? src.label_ar : src.label}
          variant={selected.includes(src.id) ? 'filled' : 'outlined'}
          onClick={() => toggle(src.id)}
          sx={{
            borderColor: src.color,
            '&.MuiChip-filled': { bgcolor: src.color, color: '#fff' },
          }}
        />
      ))}
    </Stack>
  );
}
