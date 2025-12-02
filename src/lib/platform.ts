/**
 * Platform detection utilities for Prisma Glow desktop app.
 * Provides environment detection for Tauri and platform-specific features.
 */

/**
 * Check if running in a Tauri desktop environment
 */
export function isDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI__' in window &&
    typeof (window as Record<string, unknown>).__TAURI__ !== 'undefined'
  );
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.platform?.toLowerCase().includes('mac') ||
    navigator.userAgent?.toLowerCase().includes('mac')
  );
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.platform?.toLowerCase().includes('win') ||
    navigator.userAgent?.toLowerCase().includes('windows')
  );
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.platform?.toLowerCase().includes('linux') ||
    navigator.userAgent?.toLowerCase().includes('linux')
  );
}

/**
 * Get the current platform name
 */
export function getPlatform(): 'macos' | 'windows' | 'linux' | 'web' | 'unknown' {
  if (!isDesktop()) return 'web';
  if (isMacOS()) return 'macos';
  if (isWindows()) return 'windows';
  if (isLinux()) return 'linux';
  return 'unknown';
}

/**
 * Check if the app is running in a web browser (not desktop)
 */
export function isWeb(): boolean {
  return !isDesktop();
}

/**
 * Get Tauri API module if available
 * Returns null if not in Tauri environment
 */
export async function getTauriApi() {
  if (!isDesktop()) {
    return null;
  }

  try {
    const tauriCore = await import('@tauri-apps/api/core');
    return tauriCore;
  } catch {
    // Fallback for Tauri v1 API
    try {
      const tauriLegacy = await import('@tauri-apps/api/tauri');
      return tauriLegacy;
    } catch {
      return null;
    }
  }
}

/**
 * Invoke a Tauri command with fallback for non-Tauri environments
 */
export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!isDesktop()) {
    console.warn(`Tauri command '${command}' called but not in Tauri environment`);
    return null;
  }

  const api = await getTauriApi();
  if (!api) {
    console.error('Failed to load Tauri API');
    return null;
  }

  try {
    // Tauri v2 uses 'invoke' from @tauri-apps/api/core
    if ('invoke' in api) {
      return await api.invoke<T>(command, args);
    }
    return null;
  } catch (error) {
    console.error(`Failed to invoke Tauri command '${command}':`, error);
    throw error;
  }
}

/**
 * Platform-specific feature flags
 */
export interface PlatformFeatures {
  /** Native file dialogs available */
  nativeFileDialogs: boolean;
  /** System tray available */
  systemTray: boolean;
  /** Native notifications available */
  nativeNotifications: boolean;
  /** Auto-updater available */
  autoUpdater: boolean;
  /** Offline storage available */
  offlineStorage: boolean;
  /** Custom titlebar available */
  customTitlebar: boolean;
  /** Window vibrancy/blur effects */
  windowVibrancy: boolean;
  /** Secure keychain storage */
  secureStorage: boolean;
}

/**
 * Get available platform features
 */
export function getPlatformFeatures(): PlatformFeatures {
  const desktop = isDesktop();
  const macos = isMacOS();

  return {
    nativeFileDialogs: desktop,
    systemTray: desktop,
    nativeNotifications: desktop,
    autoUpdater: desktop,
    offlineStorage: desktop,
    customTitlebar: desktop,
    windowVibrancy: desktop && macos,
    secureStorage: desktop,
  };
}
