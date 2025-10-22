export const colorPalette = {
  brand: {
    25: '#f5f7ff',
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#1e1b4b',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5f5',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    100: '#dcfce7',
    500: '#16a34a',
    600: '#15803d',
  },
  warning: {
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
  },
  destructive: {
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
  },
} as const;

export const radiusScale = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.625rem',
  lg: '0.875rem',
  xl: '1.25rem',
  full: '9999px',
} as const;

export const spacingScale = {
  none: '0px',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

export const typographyScale = {
  fontFamilies: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  },
  lineHeights: {
    tight: '1.2',
    snug: '1.35',
    normal: '1.5',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
} as const;

export const shadowScale = {
  focus: '0 0 0 3px rgba(99, 102, 241, 0.35)',
  sm: '0 4px 12px rgba(15, 23, 42, 0.08)',
  md: '0 12px 32px rgba(15, 23, 42, 0.14)',
} as const;

export const themeTokens = {
  colors: colorPalette,
  radii: radiusScale,
  spacing: spacingScale,
  typography: typographyScale,
  shadows: shadowScale,
} as const;

export type ThemeTokens = typeof themeTokens;
