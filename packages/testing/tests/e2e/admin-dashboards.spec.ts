// E2E Tests for Admin Dashboards
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { user: { id: '123', role: 'admin' } },
          error: null
        })
      });
    });

    // Mock API calls
    await page.route('**/rest/v1/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], error: null })
      });
    });
  });

  test('should navigate to admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible();
  });

  test('should display commerce dashboard', async ({ page }) => {
    await page.goto('/admin/commerce');
    
    await expect(page.locator('h1')).toContainText('Commerce Dashboard');
    await expect(page.locator('[data-testid="commerce-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible();
  });

  test('should display mobility dashboard', async ({ page }) => {
    await page.goto('/admin/mobility');
    
    await expect(page.locator('h1')).toContainText('Mobility Dashboard');
    await expect(page.locator('[data-testid="mobility-stats"]')).toBeVisible();
  });

  test('should display operations dashboard', async ({ page }) => {
    await page.goto('/admin/operations');
    
    await expect(page.locator('h1')).toContainText('Operations Dashboard');
    await expect(page.locator('[data-testid="operations-stats"]')).toBeVisible();
  });

  test('should handle data table interactions', async ({ page }) => {
    await page.goto('/admin/commerce');
    
    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    }
    
    // Test pagination if present
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }
  });

  test('should display code reviewer', async ({ page }) => {
    await page.goto('/admin');
    
    const reviewButton = page.locator('button:has-text("Run Code Review")');
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await expect(page.locator('[data-testid="review-status"]')).toBeVisible();
    }
  });
});