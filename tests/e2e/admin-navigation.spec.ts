import { test, expect } from '@playwright/test';

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to all consolidated pages', async ({ page }) => {
    const pages = [
      { name: 'Dashboard', path: '/' },
      { name: 'Users & Contacts', path: '/users-contacts' },
      { name: 'Businesses', path: '/businesses' },
      { name: 'Listings & Inventory', path: '/listings-inventory' },
      { name: 'Orders & Payments', path: '/orders-payments' },
      { name: 'Trips & Intents', path: '/trips-intents' },
      { name: 'Messaging & Campaigns', path: '/messaging-campaigns' },
      { name: 'AI Agents & Models', path: '/ai-agents-models' },
      { name: 'System Ops', path: '/system-ops' }
    ];

    for (const page_item of pages) {
      await page.click(`text=${page_item.name}`);
      await expect(page).toHaveURL(page_item.path);
      await expect(page.locator('h1')).toContainText(page_item.name);
    }
  });

  test('should display correct navigation items count', async ({ page }) => {
    const navItems = page.locator('[role="button"]');
    await expect(navItems).toHaveCount(9);
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.click('text=Businesses');
    await expect(page.locator('text=Businesses').first()).toHaveClass(/bg-primary/);
  });

  test('dashboard should load without errors', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should show proper metrics on dashboard', async ({ page }) => {
    // Check for key metrics cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Orders')).toBeVisible();
    await expect(page.locator('text=Monthly Revenue')).toBeVisible();
  });
});

test.describe('Listings & Inventory Flow', () => {
  test('should filter listings by type', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Listings & Inventory');
    
    // Test filtering
    await page.selectOption('select', 'product');
    await expect(page.locator('text=Products')).toBeVisible();
    
    await page.selectOption('select', 'produce');
    await expect(page.locator('text=Produce')).toBeVisible();
  });

  test('should create new listing', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Listings & Inventory');
    await page.click('text=Add Listing');
    
    // Fill form (would need actual form implementation)
    await expect(page.locator('text=Create New Listing')).toBeVisible();
  });
});

test.describe('Orders & Payments Flow', () => {
  test('should display orders and payments tabs', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Orders & Payments');
    
    await expect(page.locator('text=Orders')).toBeVisible();
    await expect(page.locator('text=Payments')).toBeVisible();
    
    // Switch between tabs
    await page.click('text=Payments');
    await expect(page.locator('text=Payment History')).toBeVisible();
  });
});

test.describe('AI Agents Management', () => {
  test('should manage AI agents and personas', async ({ page }) => {
    await page.goto('/');
    await page.click('text=AI Agents & Models');
    
    // Check tabs
    await expect(page.locator('text=Agents')).toBeVisible();
    await expect(page.locator('text=Personas')).toBeVisible();
    await expect(page.locator('text=Models')).toBeVisible();
    
    // Switch to personas tab
    await page.click('text=Personas');
    await expect(page.locator('text=Agent Personas')).toBeVisible();
  });
});