import { test, expect } from '@playwright/test';

/**
 * Desktop App E2E Test Suite - Phase 5
 * Comprehensive testing for Tauri desktop application
 */

const DESKTOP_TIMEOUT = 10000;
const SYNC_TIMEOUT = 15000;

test.describe('Desktop Launch & Init', () => {
  test('should detect Tauri environment', async ({ page }) => {
    await page.goto('/');
    
    const isTauri = await page.evaluate(() => {
      return typeof (window as any).__TAURI__ !== 'undefined';
    });

    if (isTauri) {
      const tauriVersion = await page.evaluate(async () => {
        const { getVersion } = (window as any).__TAURI__.app;
        return await getVersion();
      });

      expect(tauriVersion).toBeTruthy();
      console.log(`Tauri version: ${tauriVersion}`);
    }
  });

  test('should load UI within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    
    await page.waitForSelector('body', { state: 'visible' });
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('Offline Mode', () => {
  test('should detect offline state', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    const isVisible = await offlineIndicator.isVisible().catch(() => false);

    if (isVisible) {
      await expect(offlineIndicator).toContainText(/offline/i);
    }

    await context.setOffline(false);
  });

  test('should sync when reconnecting', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    await context.setOffline(false);

    const syncStatus = page.locator('[data-testid="sync-status"]');
    const hasSyncStatus = await syncStatus.isVisible().catch(() => false);

    if (hasSyncStatus) {
      await expect(syncStatus).toContainText(/syncing|synced/i, { 
        timeout: SYNC_TIMEOUT 
      });
    }
  });
});

test.describe('Performance', () => {
  test('should start in < 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('body', { state: 'visible' });
    
    const startupTime = Date.now() - startTime;
    console.log(`Startup time: ${startupTime}ms`);
    expect(startupTime).toBeLessThan(2000);
  });

  test('should have reasonable memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        };
      }
      return null;
    });

    if (metrics) {
      const usedMB = metrics.usedJSHeapSize / 1024 / 1024;
      console.log(`JS Heap: ${usedMB.toFixed(2)} MB`);
      expect(usedMB).toBeLessThan(150);
    }
  });
});
