/**
 * Color System - Minimalist Palette
 * Single primary color with semantic variants
 */

export const colors = {
  // Primary - Purple accent (only brand color)
  primary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // DEFAULT
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    DEFAULT: '#8b5cf6',
    hover: '#7c3aed',
    muted: 'rgba(139, 92, 246, 0.1)',
  },

  // Neutrals - Grayscale for everything else
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
    1000: '#000000',
  },

  // Semantic colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Surfaces (light/dark mode aware)
  surface: {
    light: {
      base: '#ffffff',
      elevated: '#fafafa',
      overlay: 'rgba(0, 0, 0, 0.02)',
      border: '#e5e5e5',
    },
    dark: {
      base: '#0a0a0a',
      elevated: '#171717',
      overlay: 'rgba(255, 255, 255, 0.05)',
      border: '#262626',
    },
  },
} as const;

export type Colors = typeof colors;
