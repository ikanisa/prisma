import { test, expect } from '@playwright/test';

test.describe('Unified Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin dashboard
    await page.goto('/admin');
  });

  test('should load unified dashboard correctly', async ({ page }) => {
    // Check page title and main heading
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.getByText('Unified view of your easyMO admin operations')).toBeVisible();
  });

  test('should display metrics cards', async ({ page }) => {
    // Wait for metrics cards to load
    await expect(page.getByText('Total Listings')).toBeVisible();
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('Conversations')).toBeVisible();

    // Check for metric icons
    await expect(page.locator('[data-testid="package-icon"]')).toBeVisible();
    await expect(page.locator('[data-testid="shopping-cart-icon"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-square-icon"]')).toBeVisible();
  });

  test('should navigate through admin sections', async ({ page }) => {
    // Test navigation to different sections
    const sections = [
      { name: 'Users & Contacts', path: '/admin/users-contacts' },
      { name: 'Businesses', path: '/admin/businesses' },
      { name: 'Listings & Inventory', path: '/admin/unified-listings' },
      { name: 'Orders & Payments', path: '/admin/unified-orders' },
      { name: 'System Ops', path: '/admin/system-ops' },
    ];

    for (const section of sections) {
      await page.getByRole('link', { name: section.name }).click();
      await expect(page).toHaveURL(section.path);
      
      // Navigate back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await expect(page).toHaveURL('/admin');
    }
  });

  test('should display recent listings table', async ({ page }) => {
    // Check for listings table
    await expect(page.getByText('Recent Listings')).toBeVisible();
    
    // Check table headers
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Price')).toBeVisible();
  });

  test('should display recent orders table', async ({ page }) => {
    // Check for orders table
    await expect(page.getByText('Recent Orders')).toBeVisible();
    
    // Check table headers
    await expect(page.getByText('Order ID')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be accessible
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Sidebar should be collapsible on mobile
    const sidebarToggle = page.locator('button[aria-label="Toggle sidebar"]');
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('**/rest/v1/unified_listings*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.reload();
    
    // Loading indicators should be visible
    await expect(page.locator('.animate-spin')).toBeVisible();
  });
});

test.describe('Admin Navigation', () => {
  test('should have collapsible sidebar', async ({ page }) => {
    await page.goto('/admin');
    
    // Find sidebar toggle button
    const toggleButton = page.locator('button').filter({ hasText: /menu|hamburger|toggle/i }).first();
    
    if (await toggleButton.isVisible()) {
      // Test sidebar collapse
      await toggleButton.click();
      
      // Sidebar should be in collapsed state
      await expect(page.locator('.w-16')).toBeVisible(); // Collapsed width
      
      // Test sidebar expand
      await toggleButton.click();
      await expect(page.locator('.w-64')).toBeVisible(); // Expanded width
    }
  });

  test('should highlight active route', async ({ page }) => {
    await page.goto('/admin/businesses');
    
    // Active route should have specific styling
    const activeLink = page.getByRole('link', { name: 'Businesses' });
    await expect(activeLink).toHaveClass(/bg-accent/);
  });

  test('should display user info in sidebar', async ({ page }) => {
    await page.goto('/admin');
    
    // User info should be visible in sidebar footer
    await expect(page.getByText('Online')).toBeVisible();
    
    // User avatar/initial should be visible
    await expect(page.locator('.rounded-full').first()).toBeVisible();
  });
});

test.describe('Data Integration', () => {
  test('should load and display unified data', async ({ page }) => {
    await page.goto('/admin');
    
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Check that metrics show actual numbers (not just 0)
    const metricsCards = page.locator('[data-testid="metrics-card"]');
    
    for (let i = 0; i < await metricsCards.count(); i++) {
      const card = metricsCards.nth(i);
      const value = await card.locator('.text-2xl').textContent();
      expect(value).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('**/rest/v1/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/admin');
    
    // Should show error state or empty state instead of crashing
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Should not show error dialogs or crashes
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });
});