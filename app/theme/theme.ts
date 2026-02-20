'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7b9669',
      light: '#9db08a',
      dark: '#5e7450',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6c8480',
      light: '#8fa19d',
      dark: '#546963',
      contrastText: '#ffffff',
    },
    background: {
      default: '#e6e6e6',
      paper: '#ffffff',
    },
    text: {
      primary: '#404e3b',
      secondary: '#5e7450',
    },
    success: {
      main: '#7b9669',
      light: '#bac8b1',
    },
    info: {
      main: '#6c8480',
    },
    warning: {
      main: '#d4a574',
      light: '#e8c9a8',
    },
    error: {
      main: '#c17171',
      light: '#d99999',
    },
  },
  typography: {
    fontFamily: 'var(--font-montserrat), system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      color: '#404e3b',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '0.015em',
      color: '#404e3b',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      color: '#404e3b',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#404e3b',
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
      color: '#404e3b',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#404e3b',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#404e3b',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#5e7450',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '1rem',
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-2px)',
            transition: 'transform 0.2s ease-in-out',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(64, 78, 59, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#7b9669',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&:before': {
            display: 'none',
          },
          marginBottom: 8,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
        },
      },
    },
  },
});

export default theme;
