import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { isDesktop } from '../lib/platform';

/**
 * Desktop-specific keyboard shortcuts
 * Uses the existing useKeyboardShortcuts hook with desktop-specific actions
 */
export function useDesktopShortcuts() {
  const shortcuts = [
    {
      key: 'q',
      metaKey: true,
      callback: async () => {
        if (isDesktop()) {
          try {
            const { invoke } = await import('./useTauri').then(m => m.default());
            await invoke('quit_app');
          } catch (error) {
            console.error('Failed to quit app:', error);
          }
        }
      },
      description: 'Quit application (Cmd+Q)',
    },
    {
      key: 'w',
      metaKey: true,
      callback: async () => {
        if (isDesktop()) {
          try {
            const { invoke } = await import('./useTauri').then(m => m.default());
            await invoke('close_window');
          } catch (error) {
            console.error('Failed to close window:', error);
          }
        }
      },
      description: 'Close window (Cmd+W)',
    },
    {
      key: 'm',
      metaKey: true,
      callback: async () => {
        if (isDesktop()) {
          try {
            const { invoke } = await import('./useTauri').then(m => m.default());
            await invoke('minimize_window');
          } catch (error) {
            console.error('Failed to minimize window:', error);
          }
        }
      },
      description: 'Minimize window (Cmd+M)',
    },
    {
      key: ',',
      metaKey: true,
      callback: () => {
        // Navigate to preferences/settings
        // TODO: Implement navigation to settings page
        console.log('Open preferences (Cmd+,)');
      },
      description: 'Open preferences (Cmd+,)',
    },
  ];

  useKeyboardShortcuts(shortcuts, isDesktop());
}

export default useDesktopShortcuts;
