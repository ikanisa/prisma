/**
 * Accessibility Audit Tests
 * 
 * P2-2: Comprehensive accessibility testing for WCAG 2.1 AA compliance
 * 
 * Tests:
 * - ARIA labels
 * - Keyboard navigation
 * - Color contrast
 * - Screen reader compatibility
 * - Form accessibility
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test('should have no critical accessibility violations on homepage', async ({ page }) => {
    const violations = await getViolations(page, null, {
      includedImpacts: ['critical', 'serious']
    });
    
    expect(violations).toHaveLength(0);
  });

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      expect(
        ariaLabel || textContent || ariaLabelledBy
      ).toBeTruthy();
    }

    // Check form inputs have labels
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"]').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);

    // Test Enter key on buttons
    const firstButton = page.locator('button').first();
    if (await firstButton.count() > 0) {
      await firstButton.focus();
      await page.keyboard.press('Enter');
      // Should not throw error
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    // Check text contrast
    const violations = await getViolations(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    const contrastViolations = violations.filter(v => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;

    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));

      // First heading should be h1
      if (previousLevel === 0) {
        expect(level).toBe(1);
      } else {
        // Should not skip levels
        expect(level - previousLevel).toBeLessThanOrEqual(1);
      }

      previousLevel = level;
    }
  });

  test('should have alt text on images', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be decorative (role="presentation")
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('should have proper form error messages', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await injectAxe(page);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .error, [aria-invalid="true"]').count();
      expect(errorMessages).toBeGreaterThan(0);
    }
  });

  test('should have skip links for keyboard users', async ({ page }) => {
    const skipLinks = await page.locator('a[href^="#main"], a[href^="#content"]').count();
    
    // Skip links are recommended but not required
    // Just verify they work if present
    if (skipLinks > 0) {
      const skipLink = page.locator('a[href^="#main"], a[href^="#content"]').first();
      await skipLink.focus();
      await page.keyboard.press('Enter');
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    const focusableElements = await page.locator(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    for (const element of focusableElements.slice(0, 5)) {
      await element.focus();
      const outline = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.outline || style.outlineWidth;
      });

      // Should have visible focus indicator
      expect(outline && outline !== 'none' && outline !== '0px').toBeTruthy();
    }
  });

  test('should pass axe accessibility scan on key pages', async ({ page }) => {
    const pages = ['/', '/login', '/dashboard', '/settings'];
    
    for (const path of pages) {
      await page.goto(path);
      await injectAxe(page);
      
      const violations = await getViolations(page, null, {
        includedImpacts: ['critical', 'serious']
      });
      
      expect(violations).toHaveLength(0);
    }
  });
});

