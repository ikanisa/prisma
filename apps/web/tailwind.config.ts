import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        glow: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          700: '#4338ca',
          900: '#1e1b4b'
        }
      },
      backgroundImage: {
        'gradient-glow': 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(14,165,233,0.9))',
        'gradient-subtle': 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))'
      },
      boxShadow: {
        glass: '0 12px 48px rgba(15, 23, 42, 0.35)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
export default config;
