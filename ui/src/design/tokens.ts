/**
 * Design Tokens - Minimalist Design System
 * Phase 4-5: Complete UI/UX Redesign
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

  // Simplified Color Palette (ONE primary color)
  colors: {
    primary: {
      DEFAULT: 'hsl(258, 90%, 66%)',  // Purple #8b5cf6
      hover: 'hsl(258, 83%, 57%)',    // Darker purple
      muted: 'hsla(258, 90%, 66%, 0.1)',
      foreground: 'hsl(0, 0%, 100%)',
    },
    neutral: {
      50: 'hsl(0, 0%, 98%)',
      100: 'hsl(0, 0%, 96%)',
      200: 'hsl(0, 0%, 90%)',
      300: 'hsl(0, 0%, 83%)',
      400: 'hsl(0, 0%, 64%)',
      500: 'hsl(0, 0%, 45%)',
      600: 'hsl(0, 0%, 32%)',
      700: 'hsl(0, 0%, 25%)',
      800: 'hsl(0, 0%, 15%)',
      900: 'hsl(0, 0%, 9%)',
      950: 'hsl(0, 0%, 4%)',
    },
    semantic: {
      success: 'hsl(142, 76%, 36%)',
      warning: 'hsl(38, 92%, 50%)',
      error: 'hsl(0, 84%, 60%)',
      info: 'hsl(199, 89%, 48%)',
    },
  },

  // Typography Scale (4 sizes only)
  typography: {
    display: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', // 28-40px
      lineHeight: 1.2,
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    heading: {
      fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)', // 20-24px
      lineHeight: 1.3,
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', // 14-16px
      lineHeight: 1.6,
      fontWeight: 400,
      letterSpacing: '0',
    },
    caption: {
      fontSize: 'clamp(0.75rem, 1.2vw, 0.875rem)', // 12-14px
      lineHeight: 1.5,
      fontWeight: 400,
      letterSpacing: '0.01em',
    },
  },

  // Fluid Container Sizes
  containers: {
    sm: 'min(90%, 640px)',
    md: 'min(90%, 768px)',
    lg: 'min(90%, 1024px)',
    xl: 'min(90%, 1280px)',
    full: '100%',
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

  // Shadows (minimal, subtle)
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-Index Scale
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modal: 40,
    popover: 50,
    toast: 60,
  },
} as const;

export type DesignTokens = typeof designTokens;
