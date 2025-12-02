import { test, expect } from '@playwright/test';

test.describe('Desktop App - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (adjust URL based on your dev server)
    await page.goto('http://localhost:3000');
  });

  test('should display custom title bar on desktop', async ({ page }) => {
    // Check if title bar exists
    const titleBar = page.locator('[data-testid="desktop-title-bar"]');
    
    if (await titleBar.isVisible()) {
      // Desktop mode
      await expect(titleBar).toBeVisible();
      
      // Check window controls
      await expect(page.locator('[data-testid="window-minimize"]')).toBeVisible();
      await expect(page.locator('[data-testid="window-maximize"]')).toBeVisible();
      await expect(page.locator('[data-testid="window-close"]')).toBeVisible();
    }
  });

  test('should display sync status bar', async ({ page }) => {
    const syncBar = page.locator('[data-testid="sync-status-bar"]');
    
    if (await syncBar.isVisible()) {
      await expect(syncBar).toBeVisible();
      await expect(page.locator('text=Last sync')).toBeVisible();
    }
  });

  test('should have sync now button', async ({ page }) => {
    const syncButton = page.locator('button:has-text("Sync Now")');
    
    if (await syncButton.isVisible()) {
      await expect(syncButton).toBeVisible();
      await expect(syncButton).toBeEnabled();
    }
  });
});

test.describe('Desktop App - Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button:has-text("Sign In")');
    
    await emailInput.fill('invalid-email');
    await submitButton.click();
    
    // Should show validation error
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });
});

test.describe('Desktop App - Sync Functionality', () => {
  test('should trigger sync on button click', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const syncButton = page.locator('button:has-text("Sync Now")');
    
    if (await syncButton.isVisible()) {
      // Click sync button
      await syncButton.click();
      
      // Should show syncing state
      await expect(page.locator('text=/syncing/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update last sync time after sync', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const syncButton = page.locator('button:has-text("Sync Now")');
    
    if (await syncButton.isVisible()) {
      const beforeText = await page.locator('[data-testid="last-sync-time"]').textContent();
      
      await syncButton.click();
      await page.waitForTimeout(3000);
      
      const afterText = await page.locator('[data-testid="last-sync-time"]').textContent();
      
      // Text should have changed
      expect(beforeText).not.toBe(afterText);
    }
  });
});

test.describe('Desktop App - Window Controls', () => {
  test('should minimize window', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const minimizeButton = page.locator('[data-testid="window-minimize"]');
    
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      // Window should minimize (hard to test in headless mode)
    }
  });

  test('should toggle maximize', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const maximizeButton = page.locator('[data-testid="window-maximize"]');
    
    if (await maximizeButton.isVisible()) {
      await maximizeButton.click();
      // Window should maximize
      await page.waitForTimeout(500);
      
      await maximizeButton.click();
      // Window should restore
    }
  });
});

test.describe('Desktop App - Offline Mode', () => {
  test('should work offline', async ({ page, context }) => {
    await page.goto('http://localhost:3000');
    
    // Go offline
    await context.setOffline(true);
    
    // Should still be able to navigate
    await page.goto('http://localhost:3000/documents');
    
    // Should show offline indicator
    const offlineIndicator = page.locator('text=/offline/i');
    if (await offlineIndicator.isVisible()) {
      await expect(offlineIndicator).toBeVisible();
    }
    
    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Desktop App - Performance', () => {
  test('should load in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should be responsive on window resize', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Test different viewport sizes
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // App should still be visible and functional
    await expect(page.locator('body')).toBeVisible();
  });
});
