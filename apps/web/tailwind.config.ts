import type { Config } from 'tailwindcss';
import { themeTokens } from '@prisma-glow/ui';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ...themeTokens.colors.brand,
          DEFAULT: themeTokens.colors.brand[500],
          foreground: '#ffffff',
        },
        neutral: {
          ...themeTokens.colors.neutral,
          DEFAULT: themeTokens.colors.neutral[900],
        },
        success: {
          ...themeTokens.colors.success,
          DEFAULT: themeTokens.colors.success[500],
          foreground: '#052e16',
        },
        warning: {
          ...themeTokens.colors.warning,
          DEFAULT: themeTokens.colors.warning[500],
          foreground: '#78350f',
        },
        destructive: {
          ...themeTokens.colors.destructive,
          DEFAULT: themeTokens.colors.destructive[500],
          foreground: '#7f1d1d',
        },
        background: themeTokens.colors.neutral[50],
        foreground: themeTokens.colors.neutral[900],
        card: {
          DEFAULT: '#ffffff',
          foreground: themeTokens.colors.neutral[900],
        },
        border: themeTokens.colors.neutral[200],
        input: themeTokens.colors.neutral[200],
        muted: {
          DEFAULT: themeTokens.colors.neutral[100],
          foreground: themeTokens.colors.neutral[500],
        },
      },
      backgroundImage: {
        'gradient-glow': 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(14,165,233,0.9))',
        'gradient-subtle': 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
      },
      boxShadow: {
        focus: themeTokens.shadows.focus,
        sm: themeTokens.shadows.sm,
        md: themeTokens.shadows.md,
        glass: '0 12px 48px rgba(15, 23, 42, 0.35)',
      },
      fontFamily: {
        sans: Array.from(themeTokens.typography.fontFamilies.sans),
        display: Array.from(themeTokens.typography.fontFamilies.display),
        mono: Array.from(themeTokens.typography.fontFamilies.mono),
      },
      borderRadius: themeTokens.radii,
      spacing: themeTokens.spacing,
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
export default config;
