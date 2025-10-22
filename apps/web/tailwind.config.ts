import type { Config } from 'tailwindcss';
import { designTokens } from '@prisma-glow/ui';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: designTokens.colors.brand,
        neutral: designTokens.colors.neutral,
        accent: designTokens.colors.accent,
        success: designTokens.colors.semantic.success,
        warning: designTokens.colors.semantic.warning,
        danger: designTokens.colors.semantic.danger,
      },
      backgroundImage: {
        'gradient-glow': 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(14,165,233,0.9))',
        'gradient-subtle': 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))'
      },
      boxShadow: {
        glass: designTokens.shadows.glass,
        focus: designTokens.shadows.focus,
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans,
        mono: designTokens.typography.fontFamily.mono,
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
export default config;
