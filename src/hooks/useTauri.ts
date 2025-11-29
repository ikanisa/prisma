/**
 * Tauri Desktop Integration Hooks
 * 
 * React hooks for interacting with Tauri backend commands.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Check if running in Tauri environment
 */
export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const checkTauri = async () => {
      try {
        // Check if __TAURI__ global is available
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
          setIsTauri(true);
          
          // Get platform info
          const platformInfo = await invoke<string>('get_platform');
          setPlatform(platformInfo);
          
          // Get app version
          const appVersion = await invoke<string>('get_app_version');
          setVersion(appVersion);
        }
      } catch (error) {
        setIsTauri(false);
      }
    };

    checkTauri();
  }, []);

  return { isTauri, platform, version };
}

/**
 * File system operations
 */
export function useFileSystem() {
  const selectFile = useCallback(async (options?: {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    try {
      const selected = await open({
        multiple: options?.multiple ?? false,
        filters: options?.filters,
      });
      return selected;
    } catch (error) {
      console.error('Error selecting file:', error);
      throw error;
    }
  }, []);

  const selectSaveFile = useCallback(async (options?: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    try {
      const path = await save({
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      return path;
    } catch (error) {
      console.error('Error selecting save location:', error);
      throw error;
    }
  }, []);

  const readFile = useCallback(async (path: string) => {
    try {
      const contents = await readTextFile(path);
      return contents;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }, []);

  const writeFile = useCallback(async (path: string, contents: string) => {
    try {
      await writeTextFile(path, contents);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }, []);

  return {
    selectFile,
    selectSaveFile,
    readFile,
    writeFile,
  };
}

/**
 * App window controls
 */
export function useWindow() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // Listen for fullscreen changes
      const checkFullscreen = () => {
        setIsFullscreen(document.fullscreenElement !== null);
      };

      document.addEventListener('fullscreenchange', checkFullscreen);
      return () => {
        document.removeEventListener('fullscreenchange', checkFullscreen);
      };
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}

/**
 * Auto-update functionality
 */
export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    try {
      // Auto-update implementation would go here
      // This requires tauri-plugin-updater
      setUpdateAvailable(false);
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    setIsInstalling(true);
    try {
      // Install update implementation
    } catch (error) {
      console.error('Error installing update:', error);
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    updateAvailable,
    updateInfo,
    isChecking,
    isInstalling,
    checkForUpdate,
    installUpdate,
  };
}

/**
 * System tray functionality
 */
export function useSystemTray() {
  const setTrayIcon = useCallback(async (icon: string) => {
    try {
      // Tray icon implementation
    } catch (error) {
      console.error('Error setting tray icon:', error);
    }
  }, []);

  const setTrayTooltip = useCallback(async (tooltip: string) => {
    try {
      // Tray tooltip implementation
    } catch (error) {
      console.error('Error setting tray tooltip:', error);
    }
  }, []);

  return {
    setTrayIcon,
    setTrayTooltip,
  };
}
