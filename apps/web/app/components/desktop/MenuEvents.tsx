'use client';

import { useEffect } from 'react';
import { isTauri } from '@/lib/desktop/tauri';

export function useDesktopMenuEvents() {
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    (async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // Listen for menu events
      unlisten = await listen('menu:new-document', () => {
        console.log('New document requested');
        window.dispatchEvent(new CustomEvent('desktop:new-document'));
      });

      const saveListener = await listen('menu:save', () => {
        console.log('Save requested');
        window.dispatchEvent(new CustomEvent('desktop:save'));
      });

      const syncListener = await listen('menu:sync', () => {
        console.log('Sync requested');
        window.dispatchEvent(new CustomEvent('desktop:sync'));
      });

      const refreshListener = await listen('menu:refresh', () => {
        console.log('Refresh requested');
        window.location.reload();
      });

      const aboutListener = await listen('menu:about', () => {
        console.log('About requested');
        window.dispatchEvent(new CustomEvent('desktop:about'));
      });

      // Store all listeners for cleanup
      return () => {
        if (unlisten) unlisten();
        saveListener();
        syncListener();
        refreshListener();
        aboutListener();
      };
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

// Global menu event hooks
export function useMenuNewDocument(handler: () => void) {
  useEffect(() => {
    const handleEvent = () => handler();
    window.addEventListener('desktop:new-document', handleEvent);
    return () => window.removeEventListener('desktop:new-document', handleEvent);
  }, [handler]);
}

export function useMenuSave(handler: () => void) {
  useEffect(() => {
    const handleEvent = () => handler();
    window.addEventListener('desktop:save', handleEvent);
    return () => window.removeEventListener('desktop:save', handleEvent);
  }, [handler]);
}

export function useMenuSync(handler: () => void) {
  useEffect(() => {
    const handleEvent = () => handler();
    window.addEventListener('desktop:sync', handleEvent);
    return () => window.removeEventListener('desktop:sync', handleEvent);
  }, [handler]);
}
