/**
 * Design Tokens - Minimalist Design System
 * Single source of truth for all visual design decisions
 */

export const designTokens = {
  // Spacing Scale (4px grid system)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },

  // Typography - Fluid responsive scale
  typography: {
    display: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      lineHeight: '1.2',
      fontWeight: '600',
      letterSpacing: '-0.02em',
    },
    heading: {
      fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)',
      lineHeight: '1.3',
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    body: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
      lineHeight: '1.6',
      fontWeight: '400',
      letterSpacing: '0',
    },
    small: {
      fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
      lineHeight: '1.5',
      fontWeight: '400',
      letterSpacing: '0',
    },
  },

  // Border Radius
  radius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },

  // Shadows - Subtle elevation
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  // Animation durations
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },

  // Breakpoints
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

export type DesignTokens = typeof designTokens;
