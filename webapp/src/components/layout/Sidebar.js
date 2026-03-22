import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Box, useMediaQuery, useTheme, Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  CompareArrows as CompareArrowsIcon,
  Explore as ExploreIcon,
  AccountTree as AccountTreeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 64;

const navItems = [
  { path: '/', labelKey: 'dashboard', icon: <DashboardIcon /> },
  { path: '/sentiment', labelKey: 'sentimentAnalysis', icon: <BarChartIcon /> },
  { path: '/comparison', labelKey: 'sourceComparison', icon: <CompareArrowsIcon /> },
  { path: '/coverage', labelKey: 'coverageExplorer', icon: <ExploreIcon /> },
  { path: '/relationships', labelKey: 'relationshipMap', icon: <AccountTreeIcon /> },
];

export { DRAWER_WIDTH, DRAWER_COLLAPSED };

export default function Sidebar({ open, onToggle, mobileOpen, onMobileClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { t, direction } = useLanguage();

  const isRTL = direction === 'rtl';
  const currentWidth = open ? DRAWER_WIDTH : DRAWER_COLLAPSED;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const collapseIcon = () => {
    if (open) {
      return isRTL ? <ChevronRightIcon /> : <ChevronLeftIcon />;
    }
    return isRTL ? <ChevronLeftIcon /> : <ChevronRightIcon />;
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#141820',
        overflowX: 'hidden',
      }}
    >
      {/* Spacer for the AppBar */}
      <Box sx={{ height: 64 }} />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                minHeight: 48,
                borderRadius: 1.5,
                mb: 0.5,
                px: open ? 2 : 1.5,
                justifyContent: open ? 'initial' : 'center',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'white' : 'text.secondary',
                '& .MuiListItemIcon-root': {
                  color: active ? 'white' : 'text.secondary',
                },
                '&:hover': {
                  bgcolor: active ? 'primary.dark' : 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 0,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    noWrap: true,
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Collapse toggle button pushed to the bottom */}
      <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center', py: 1.5 }}>
        <IconButton
          onClick={onToggle}
          sx={{
            color: 'text.secondary',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          {collapseIcon()}
        </IconButton>
      </Box>
    </Box>
  );

  // Mobile: temporary drawer that overlays content
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            bgcolor: '#141820',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop: permanent drawer that shifts content
  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width: currentWidth,
        flexShrink: 0,
        transition: 'width 0.3s',
        '& .MuiDrawer-paper': {
          width: currentWidth,
          transition: 'width 0.3s',
          bgcolor: '#141820',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
