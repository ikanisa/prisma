export type ColorScale = Record<string, string>;

export interface DesignTokens {
  colors: {
    brand: ColorScale;
    neutral: ColorScale;
    accent: ColorScale;
    semantic: {
      success: ColorScale;
      warning: ColorScale;
      danger: ColorScale;
    };
  };
  radii: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  spacing: {
    gutter: string;
    section: string;
  };
  shadows: {
    glass: string;
    focus: string;
  };
  typography: {
    fontFamily: {
      sans: string[];
      mono: string[];
    };
  };
}

export const designTokens: DesignTokens = {
  colors: {
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
      900: '#312e81',
    },
    neutral: {
      25: '#f8fafc',
      50: '#f1f5f9',
      100: '#e2e8f0',
      200: '#cbd5f5',
      300: '#94a3b8',
      400: '#64748b',
      500: '#475569',
      600: '#334155',
      700: '#1e293b',
      800: '#0f172a',
      900: '#020617',
    },
    accent: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    semantic: {
      success: {
        50: '#ecfdf3',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
      },
      warning: {
        50: '#fffbeb',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
      },
      danger: {
        50: '#fef2f2',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
      },
    },
  },
  radii: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.75rem',
    full: '9999px',
  },
  spacing: {
    gutter: '1.5rem',
    section: '2.5rem',
  },
  shadows: {
    glass: '0 12px 48px rgba(15, 23, 42, 0.35)',
    focus: '0 0 0 3px rgba(99, 102, 241, 0.45)',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  },
};

export type { DesignTokens as PrismaDesignTokens };
