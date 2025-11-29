/**
 * PWA utilities for Prisma Glow Web App
 * Migrated from src/utils/pwa.ts and simplified for Next.js
 */

export interface QueuedOfflineAction {
  id: string;
  action: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_STORAGE_KEY = 'queuedActions';

/**
 * Generate a unique ID with fallback for environments without crypto.randomUUID
 */
function generateUniqueId(): string {
  // Try crypto.randomUUID first (available in secure contexts)
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback using crypto.getRandomValues
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Format as UUID v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last resort fallback using Math.random
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if the app is running as an installed PWA
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/**
 * Check if the device supports PWA installation
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return 'BeforeInstallPromptEvent' in window;
}

/**
 * Get the current network status
 */
export function getNetworkStatus(): 'online' | 'offline' {
  if (typeof window === 'undefined') return 'online';
  return navigator.onLine ? 'online' : 'offline';
}

/**
 * Register for network status changes
 */
export function onNetworkStatusChange(
  callback: (status: 'online' | 'offline') => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback('online');
  const handleOffline = () => callback('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Queue an action for offline sync
 */
export async function queueOfflineAction(
  action: string,
  data: unknown
): Promise<QueuedOfflineAction> {
  if (typeof window === 'undefined') {
    return { id: '', action, data, timestamp: Date.now(), retries: 0 };
  }

  const id = generateUniqueId();
  const entry: QueuedOfflineAction = {
    id,
    action,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = await getOfflineQueue();
  queue.push(entry);

  try {
    localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }

  return entry;
}

/**
 * Get all queued offline actions
 */
export async function getOfflineQueue(): Promise<QueuedOfflineAction[]> {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Clear all queued offline actions
 */
export async function clearOfflineQueue(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear offline queue:', error);
  }
}

/**
 * Get estimated storage usage
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
