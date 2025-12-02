/**
 * Tauri Desktop Integration for Prisma Glow
 */

import { useEffect, useState } from 'react';

// Type definitions
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

// Check if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Desktop Auth API
export const desktopAuth = {
  login: async (email: string, password: string) => {
    if (!isTauri()) throw new Error('Not in Tauri');
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke('login', { email, password });
  },
  
  logout: async () => {
    if (!isTauri()) return;
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke('logout');
  },
  
  getStoredToken: async () => {
    if (!isTauri()) return null;
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke('get_stored_token');
  },
};

// React Hook for Desktop Auth
export const useDesktopAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTauri()) {
      desktopAuth.getStoredToken().then((token) => {
        setIsAuthenticated(token !== null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  return { isAuthenticated, loading };
};
