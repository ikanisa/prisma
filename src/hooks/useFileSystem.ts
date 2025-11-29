/**
 * Hook for file system operations using Tauri or web fallback.
 * Provides native file picker dialogs in Tauri, falls back to browser APIs.
 */

import { useState, useCallback } from 'react';
import { useTauri } from './useTauri';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileInfo {
  name: string;
  path: string;
  content?: string;
  size?: number;
}

interface PathInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface FileSystemHook {
  /** Open a file using native dialog (Tauri) or input element (web) */
  openFile: (filters?: FileFilter[]) => Promise<FileInfo | null>;
  /** Save content to a file using native dialog (Tauri) or download (web) */
  saveFile: (content: string, suggestedName?: string, filters?: FileFilter[]) => Promise<string | null>;
  /** Read file contents from a path (Tauri only) */
  readFile: (path: string) => Promise<string | null>;
  /** Write content to a file at path (Tauri only) */
  writeFile: (path: string, content: string) => Promise<boolean>;
  /** List directory contents (Tauri only) */
  listDirectory: (path: string) => Promise<FileInfo[]>;
  /** Whether file operations are in progress */
  loading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Whether we're in Tauri environment */
  isNative: boolean;
}

export function useFileSystem(): FileSystemHook {
  const { isTauri, invoke } = useTauri();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const openFile = useCallback(async (filters?: FileFilter[]): Promise<FileInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      if (isTauri) {
        // Use Tauri native dialog
        const result = await invoke<{ path: string; content: string } | null>('open_file_dialog', {
          filters: filters || undefined,
        });

        if (result) {
          return {
            name: result.path.split('/').pop() || result.path.split('\\').pop() || 'Unknown',
            path: result.path,
            content: result.content,
          };
        }
        return null;
      } else {
        // Web fallback using file input
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          
          if (filters && filters.length > 0) {
            const extensions = filters.flatMap((f) => f.extensions.map((e) => `.${e}`));
            input.accept = extensions.join(',');
          }

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const content = await file.text();
              resolve({
                name: file.name,
                path: file.name, // Web doesn't have full path access
                content,
                size: file.size,
              });
            } else {
              resolve(null);
            }
          };

          input.click();
        });
      }
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isTauri, invoke]);

  const saveFile = useCallback(async (
    content: string,
    suggestedName?: string,
    filters?: FileFilter[]
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      if (isTauri) {
        // Use Tauri native save dialog
        const result = await invoke<string | null>('save_file_dialog', {
          content,
          defaultName: suggestedName,
          filters: filters || undefined,
        });
        return result;
      } else {
        // Web fallback using download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName || 'download.txt';
        a.click();
        URL.revokeObjectURL(url);
        return suggestedName || 'download.txt';
      }
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isTauri, invoke]);

  const readFile = useCallback(async (path: string): Promise<string | null> => {
    if (!isTauri) {
      console.warn('readFile is only available in Tauri environment');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const content = await invoke<string>('read_file', { path });
      return content;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isTauri, invoke]);

  const writeFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    if (!isTauri) {
      console.warn('writeFile is only available in Tauri environment');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('write_file', { path, content });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isTauri, invoke]);

  const listDirectory = useCallback(async (path: string): Promise<FileInfo[]> => {
    if (!isTauri) {
      console.warn('listDirectory is only available in Tauri environment');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const entries = await invoke<PathInfo[]>('list_directory', { path });
      return entries.map((entry) => ({
        name: entry.name,
        path: entry.path,
        size: entry.size,
      }));
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isTauri, invoke]);

  return {
    openFile,
    saveFile,
    readFile,
    writeFile,
    listDirectory,
    loading,
    error,
    isNative: isTauri,
  };
}

export default useFileSystem;
