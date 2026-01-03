'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Workbox } from 'workbox-window';

interface UpdateNotificationProps {
  className?: string;
}

export function UpdateNotification({ className }: UpdateNotificationProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [workbox, setWorkbox] = useState<Workbox | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Initialize Workbox
    const wb = new Workbox('/sw.js', { type: 'module' });
    setWorkbox(wb);

    // Listen for service worker updates
    wb.addEventListener('waiting', () => {
      setUpdateAvailable(true);
    });

    // Register service worker
    wb.register().catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  }, []);

  const handleUpdate = async () => {
    if (!workbox) return;

    setUpdating(true);
    try {
      // Send skipWaiting message to service worker
      await workbox.messageSkipWaiting();
      
      // Reload the page to activate the new service worker
      window.location.reload();
    } catch (error) {
      console.error('Failed to update:', error);
      setUpdating(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-3 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Update Available
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            A new version is ready. Reload to update.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded p-1 hover:bg-blue-500/20"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

