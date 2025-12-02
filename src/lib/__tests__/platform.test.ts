import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDesktop, isMacOS } from '../platform';

describe('platform', () => {
  let originalWindow: typeof window;

  beforeEach(() => {
    // Save original window object
    originalWindow = global.window;
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
  });

  describe('isDesktop', () => {
    it('should return true when __TAURI__ is defined', () => {
      // Mock Tauri environment
      global.window = {
        ...originalWindow,
        __TAURI__: {},
      } as any;

      expect(isDesktop()).toBe(true);
    });

    it('should return false when __TAURI__ is not defined', () => {
      // Mock browser environment
      global.window = {
        ...originalWindow,
      } as any;
      delete (global.window as any).__TAURI__;

      expect(isDesktop()).toBe(false);
    });

    it('should return false when window is undefined', () => {
      // Mock server-side rendering
      (global as any).window = undefined;

      expect(isDesktop()).toBe(false);
    });
  });

  describe('isMacOS', () => {
    it('should return true when in Tauri on macOS', () => {
      // Mock Tauri + macOS environment
      global.window = {
        ...originalWindow,
        __TAURI__: {},
      } as any;
      Object.defineProperty(global.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      expect(isMacOS()).toBe(true);
    });

    it('should return false when in Tauri but not on macOS', () => {
      // Mock Tauri + Windows environment
      global.window = {
        ...originalWindow,
        __TAURI__: {},
      } as any;
      Object.defineProperty(global.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      expect(isMacOS()).toBe(false);
    });

    it('should return false when not in Tauri', () => {
      // Mock browser environment
      global.window = {
        ...originalWindow,
      } as any;
      delete (global.window as any).__TAURI__;
      Object.defineProperty(global.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      expect(isMacOS()).toBe(false);
    });
  });
});
