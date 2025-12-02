import { useEffect, useState } from 'react';
import { isDesktop } from '../lib/platform';

export type SystemTheme = 'light' | 'dark';

export function useSystemTheme() {
  const [theme, setTheme] = useState<SystemTheme>('light');

  useEffect(() => {
    // Check if we're in a desktop environment
    if (!isDesktop()) {
      // Fallback to browser's prefers-color-scheme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    // Desktop-specific theme detection
    const initTheme = async () => {
      try {
        const { invoke, listen } = await import('../hooks/useTauri').then(m => m.default());

        // Get initial theme from Tauri
        const initialTheme = await invoke<SystemTheme>('get_system_theme');
        setTheme(initialTheme);

        // Listen for theme changes
        const unlisten = await listen<SystemTheme>('theme-changed', (event) => {
          setTheme(event.payload);
        });

        return unlisten;
      } catch (error) {
        console.error('Failed to initialize system theme:', error);
        // Fallback to browser detection
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    let cleanup: (() => void) | undefined;
    initTheme().then(unlisten => {
      cleanup = unlisten;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return theme;
}

export default useSystemTheme;
