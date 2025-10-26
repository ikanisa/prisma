import type { ReactNode } from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChartContainer, type ChartConfig } from '../chart';
import { generateChartVariables } from '../chart-config';

const { useThemeMock } = vi.hoisted(() => ({
  useThemeMock: vi.fn(() => ({ resolvedTheme: undefined, theme: undefined })),
}));

vi.mock('next-themes', () => ({
  useTheme: useThemeMock,
}));

vi.mock('recharts', () => ({
  __esModule: true,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => null,
  Legend: () => null,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useThemeMock.mockReturnValue({ resolvedTheme: undefined, theme: undefined });
});

describe('generateChartVariables', () => {
  it('creates fallback variables for static colors', () => {
    const config: ChartConfig = {
      revenue: {
        label: 'Revenue',
        color: '#123456',
      },
    };

    const result = generateChartVariables(config);

    expect(result.hasVariables).toBe(true);
    expect(result.base['--color-revenue']).toBe('#123456');
    expect(result.themes.light['--color-revenue']).toBeUndefined();
  });

  it('creates per-theme overrides when provided', () => {
    const config: ChartConfig = {
      coverage: {
        label: 'Coverage',
        theme: {
          light: '#2563eb',
          dark: '#60a5fa',
        },
      },
    };

    const result = generateChartVariables(config);

    expect(result.base['--color-coverage']).toBe('#2563eb');
    expect(result.themes.dark['--color-coverage']).toBe('#60a5fa');
  });

  it('uses the first available theme color as a fallback', () => {
    const config: ChartConfig = {
      incidents: {
        label: 'Incidents',
        theme: {
          dark: '#f97316',
        },
      },
    };

    const result = generateChartVariables(config);

    expect(result.base['--color-incidents']).toBe('#f97316');
    expect(result.themes.dark['--color-incidents']).toBe('#f97316');
  });
});

describe('ChartContainer', () => {
  it('applies light theme colors by default', () => {
    const config: ChartConfig = {
      velocity: {
        label: 'Velocity',
        color: '#1d4ed8',
      },
    };

    const { getByTestId } = render(
      <ChartContainer config={config} data-testid="chart">
        <div />
      </ChartContainer>,
    );

    const chart = getByTestId('chart');
    expect(chart.style.getPropertyValue('--color-velocity')).toBe('#1d4ed8');
  });

  it('respects explicit theme overrides', () => {
    const config: ChartConfig = {
      uptime: {
        label: 'Uptime',
        theme: {
          light: '#10b981',
          dark: '#34d399',
        },
      },
    };

    const { getByTestId } = render(
      <ChartContainer config={config} data-testid="chart" theme="dark">
        <div />
      </ChartContainer>,
    );

    const chart = getByTestId('chart');
    expect(chart.style.getPropertyValue('--color-uptime')).toBe('#34d399');
  });

  it('uses the resolved theme when no override is provided', () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', theme: 'dark' });

    const config: ChartConfig = {
      uptime: {
        label: 'Uptime',
        theme: {
          light: '#10b981',
          dark: '#34d399',
        },
      },
    };

    const { getByTestId } = render(
      <ChartContainer config={config} data-testid="chart">
        <div />
      </ChartContainer>,
    );

    const chart = getByTestId('chart');
    expect(chart.style.getPropertyValue('--color-uptime')).toBe('#34d399');
  });

  it('merges chart variables with custom styles', () => {
    const config: ChartConfig = {
      margin: {
        label: 'Margin',
        color: '#facc15',
      },
    };

    const { getByTestId } = render(
      <ChartContainer
        config={config}
        data-testid="chart"
        style={{ backgroundColor: 'rgb(17, 24, 39)' }}
      >
        <div />
      </ChartContainer>,
    );

    const chart = getByTestId('chart');
    expect(chart.style.getPropertyValue('--color-margin')).toBe('#facc15');
    expect(chart.style.backgroundColor).toBe('rgb(17, 24, 39)');
  });
});
