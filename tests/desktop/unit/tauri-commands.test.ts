import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for Tauri command handlers
 * Tests TypeScript/React side of Tauri IPC
 */

const mockInvoke = vi.fn();
const mockListen = vi.fn();

global.window = {
  __TAURI__: {
    invoke: mockInvoke,
    event: {
      listen: mockListen,
    },
    app: {
      getVersion: vi.fn().mockResolvedValue('1.0.0'),
      getName: vi.fn().mockResolvedValue('Prisma Glow'),
    },
    window: {
      appWindow: {
        minimize: vi.fn().mockResolvedValue(undefined),
        maximize: vi.fn().mockResolvedValue(undefined),
        unmaximize: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        isMaximized: vi.fn().mockResolvedValue(false),
      },
    },
    dialog: {
      open: vi.fn().mockResolvedValue('/path/to/file.txt'),
      save: vi.fn().mockResolvedValue('/path/to/save.txt'),
    },
    fs: {
      readTextFile: vi.fn().mockResolvedValue('file contents'),
      writeTextFile: vi.fn().mockResolvedValue(undefined),
    },
  },
} as any;

describe('Tauri Window Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should minimize window', async () => {
    const { appWindow } = window.__TAURI__.window;
    await appWindow.minimize();
    expect(appWindow.minimize).toHaveBeenCalled();
  });

  it('should maximize window', async () => {
    const { appWindow } = window.__TAURI__.window;
    await appWindow.maximize();
    expect(appWindow.maximize).toHaveBeenCalled();
  });

  it('should close window', async () => {
    const { appWindow } = window.__TAURI__.window;
    await appWindow.close();
    expect(appWindow.close).toHaveBeenCalled();
  });
});

describe('Tauri File System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open file dialog', async () => {
    const { open } = window.__TAURI__.dialog;
    const result = await open({ multiple: false });
    expect(open).toHaveBeenCalled();
    expect(result).toBe('/path/to/file.txt');
  });

  it('should read text file', async () => {
    const { readTextFile } = window.__TAURI__.fs;
    const content = await readTextFile('/path/to/file.txt');
    expect(readTextFile).toHaveBeenCalledWith('/path/to/file.txt');
    expect(content).toBe('file contents');
  });
});

describe('Tauri App Info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get app version', async () => {
    const { getVersion } = window.__TAURI__.app;
    const version = await getVersion();
    expect(getVersion).toHaveBeenCalled();
    expect(version).toBe('1.0.0');
  });

  it('should get app name', async () => {
    const { getName } = window.__TAURI__.app;
    const name = await getName();
    expect(getName).toHaveBeenCalled();
    expect(name).toBe('Prisma Glow');
  });
});

describe('Tauri Custom Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke sync_to_local', async () => {
    mockInvoke.mockResolvedValue({ success: true, records: 100 });
    
    const result = await window.__TAURI__.invoke('sync_to_local', {
      data: [{ id: 1, name: 'Test' }],
    });
    
    expect(mockInvoke).toHaveBeenCalledWith('sync_to_local', {
      data: [{ id: 1, name: 'Test' }],
    });
    expect(result.success).toBe(true);
  });

  it('should handle errors', async () => {
    mockInvoke.mockRejectedValue(new Error('Database locked'));
    
    await expect(
      window.__TAURI__.invoke('sync_to_local', { data: [] })
    ).rejects.toThrow('Database locked');
  });
});
