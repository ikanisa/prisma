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
 * Get Tauri invoke function if available
 * Returns null if not in Tauri environment
 * @deprecated Use invokeCommand directly instead
 */
export async function getTauriApi(): Promise<{ invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> } | null> {
  if (!isDesktop()) {
    return null;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return { invoke };
  } catch {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      return { invoke };
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

  try {
    // Try Tauri v2 API first
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(command, args);
  } catch {
    try {
      // Fallback to Tauri v1 API
      const { invoke } = await import('@tauri-apps/api/tauri');
      return await invoke<T>(command, args);
    } catch (error) {
      console.error(`Failed to invoke Tauri command '${command}':`, error);
      throw error;
    }
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
