import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
  });

  test('should display dashboard metrics', async ({ page }) => {
    // Check if dashboard loads
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for key metrics cards
    await expect(page.locator('[data-testid="metrics-card"]')).toBeVisible();
  });

  test('should navigate to listings inventory', async ({ page }) => {
    // Navigate to listings
    await page.getByRole('link', { name: /listings/i }).click();
    
    // Check if listings page loads
    await expect(page.locator('h1')).toContainText('Listings');
    
    // Check for listings table
    await expect(page.locator('[data-testid="listings-table"]')).toBeVisible();
  });

  test('should handle WhatsApp button functionality', async ({ page }) => {
    await page.goto('/admin/listings-inventory');
    
    // Look for WhatsApp buttons
    const whatsappButton = page.locator('[data-testid="whatsapp-button"]').first();
    
    if (await whatsappButton.isVisible()) {
      // Verify button is functional
      await expect(whatsappButton).toBeEnabled();
      
      // Check that clicking opens WhatsApp (without actually opening)
      await whatsappButton.hover();
      await expect(whatsappButton).toHaveAttribute('href', /wa\.me/);
    }
  });
});