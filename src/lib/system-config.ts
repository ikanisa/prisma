import { useMemo } from 'react';
import { parse } from 'yaml';
import rawSystemConfig from '../../config/system.yaml?raw';

export interface SystemConfig {
  meta?: {
    name?: string;
    version?: string;
  };
  ui?: {
    shell?: {
      assistant_dock?: boolean;
      assistant_position?: string;
      entry_points?: Array<{ page: string; chips?: string[] }>;
    };
    empty_states?: Record<string, string>;
  };
  repositories?: {
    folders?: string[];
    pbc_subfolders?: string[];
  };
}

const parsedConfig = parse(rawSystemConfig) as SystemConfig;

const PAGE_MATCHERS: Array<{ match: (pathname: string) => boolean; page: string }> = [
  { match: (pathname) => pathname === '/' || pathname.startsWith('/dashboard'), page: 'Dashboard' },
  { match: (pathname) => pathname.startsWith('/clients') || pathname.startsWith('/onboarding'), page: 'Onboarding' },
  { match: (pathname) => pathname.startsWith('/documents'), page: 'Documents' },
  { match: (pathname) => pathname.startsWith('/accounting'), page: 'Accounting Close' },
  { match: (pathname) => pathname.startsWith('/audit'), page: 'Audit' },
  { match: (pathname) => pathname.startsWith('/tax'), page: 'Tax' },
];

export function getAssistantChips(pathname: string): string[] {
  const entryPoints = parsedConfig.ui?.shell?.entry_points ?? [];
  const matchedPage = PAGE_MATCHERS.find(({ match }) => match(pathname))?.page;
  if (matchedPage) {
    const entry = entryPoints.find((item) => item.page.toLowerCase() === matchedPage.toLowerCase());
    if (entry?.chips?.length) {
      return entry.chips;
    }
  }
  const fallback = entryPoints[0]?.chips;
  return Array.isArray(fallback) && fallback.length ? fallback : [];
}

export function useAssistantChips(pathname: string): string[] {
  return useMemo(() => getAssistantChips(pathname), [pathname]);
}

export const systemConfig = parsedConfig;
