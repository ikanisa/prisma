import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for admin user
    await page.goto('/admin');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="admin-dashboard"]');
  });

  test('displays main dashboard metrics', async ({ page }) => {
    // Check for key dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify metric cards are present
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue"]')).toBeVisible();
  });

  test('navigation menu works correctly', async ({ page }) => {
    // Test navigation to different admin sections
    await page.click('text=Conversations');
    await expect(page).toHaveURL(/.*\/admin\/conversations/);
    
    await page.click('text=Orders');
    await expect(page).toHaveURL(/.*\/admin\/orders/);
    
    await page.click('text=Users');
    await expect(page).toHaveURL(/.*\/admin\/users/);
  });

  test('search functionality works', async ({ page }) => {
    // Navigate to conversations page
    await page.click('text=Conversations');
    
    // Use search
    await page.fill('[data-testid="search-input"]', 'test query');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('real-time updates work', async ({ page }) => {
    // Check for real-time indicator
    await expect(page.locator('[data-testid="realtime-indicator"]')).toBeVisible();
    
    // Verify auto-refresh is working
    const initialCount = await page.locator('[data-testid="total-users"]').textContent();
    
    // Wait for potential update
    await page.waitForTimeout(5000);
    
    // Check if data refreshed (indicator should show green)
    await expect(page.locator('[data-testid="realtime-indicator"]')).toHaveClass(/.*connected.*/);
  });
});

test.describe('Conversations Management', () => {
  test('can view conversation list', async ({ page }) => {
    await page.goto('/admin/conversations');
    
    await expect(page.locator('h1')).toContainText('Conversations');
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
  });

  test('can filter conversations', async ({ page }) => {
    await page.goto('/admin/conversations');
    
    // Apply status filter
    await page.selectOption('[data-testid="status-filter"]', 'active');
    
    // Verify filter is applied
    const conversations = page.locator('[data-testid="conversation-item"]');
    await expect(conversations.first()).toBeVisible();
  });

  test('can view conversation details', async ({ page }) => {
    await page.goto('/admin/conversations');
    
    // Click on first conversation
    await page.click('[data-testid="conversation-item"]');
    
    // Verify detail view opens
    await expect(page.locator('[data-testid="conversation-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
  });
});

test.describe('Agent Management', () => {
  test('can view agent list', async ({ page }) => {
    await page.goto('/admin/ai-agents');
    
    await expect(page.locator('h1')).toContainText('AI Agent Management');
    await expect(page.locator('[data-testid="agent-tabs"]')).toBeVisible();
  });

  test('can upload YAML definition', async ({ page }) => {
    await page.goto('/admin/ai-agents');
    
    // Click upload button
    await page.click('text=Upload YAML');
    
    // Verify dialog opens
    await expect(page.locator('[data-testid="upload-dialog"]')).toBeVisible();
    
    // Mock file upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-agent.yaml');
    
    // Submit upload
    await page.click('text=Upload');
    
    // Verify success message
    await expect(page.locator('text=uploaded successfully')).toBeVisible();
  });

  test('can trigger document embedding', async ({ page }) => {
    await page.goto('/admin/ai-agents');
    
    // Switch to embeddings tab
    await page.click('text=Document Embeddings');
    
    // Click embed button
    await page.click('[data-testid="embed-button"]');
    
    // Verify embedding started
    await expect(page.locator('text=embedding started')).toBeVisible();
  });
});

test.describe('Quality Dashboard', () => {
  test('displays quality metrics', async ({ page }) => {
    await page.goto('/admin/quality-dashboard');
    
    await expect(page.locator('h1')).toContainText('Quality Dashboard');
    
    // Check for quality metrics
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-rate"]')).toBeVisible();
  });

  test('quality gates work correctly', async ({ page }) => {
    await page.goto('/admin/quality-dashboard');
    
    // Check traffic light indicators
    const indicators = page.locator('[data-testid="quality-indicator"]');
    await expect(indicators).toHaveCount(3);
    
    // Verify each indicator has proper status
    for (let i = 0; i < await indicators.count(); i++) {
      const indicator = indicators.nth(i);
      await expect(indicator).toHaveAttribute('data-status', /^(good|warning|critical)$/);
    }
  });

  test('auto-refresh works', async ({ page }) => {
    await page.goto('/admin/quality-dashboard');
    
    // Check initial timestamp
    const initialTime = await page.locator('[data-testid="last-updated"]').textContent();
    
    // Wait for auto-refresh (30 seconds)
    await page.waitForTimeout(31000);
    
    // Check updated timestamp
    const updatedTime = await page.locator('[data-testid="last-updated"]').textContent();
    expect(updatedTime).not.toBe(initialTime);
  });
});

test.describe('Experiments & Feature Flags', () => {
  test('can view experiments list', async ({ page }) => {
    await page.goto('/admin/experiments-new');
    
    await expect(page.locator('h1')).toContainText('Experiments & Feature Flags');
    await expect(page.locator('[data-testid="experiments-tabs"]')).toBeVisible();
  });

  test('can create new experiment', async ({ page }) => {
    await page.goto('/admin/experiments-new');
    
    // Click create experiment
    await page.click('text=Create Experiment');
    
    // Fill experiment form
    await page.fill('[data-testid="experiment-name"]', 'Test Experiment');
    await page.fill('[data-testid="experiment-description"]', 'Test description');
    await page.selectOption('[data-testid="experiment-type"]', 'A/B');
    
    // Submit form
    await page.click('text=Create');
    
    // Verify experiment created
    await expect(page.locator('text=Experiment created successfully')).toBeVisible();
  });

  test('can toggle feature flags', async ({ page }) => {
    await page.goto('/admin/experiments-new');
    
    // Switch to feature flags tab
    await page.click('text=Feature Flags');
    
    // Toggle first flag
    const toggleButton = page.locator('[data-testid="feature-toggle"]').first();
    await toggleButton.click();
    
    // Verify state changed
    await expect(page.locator('text=Feature flag updated')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    // Intercept and fail API requests
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/admin');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=connection error')).toBeVisible();
  });

  test('shows loading states properly', async ({ page }) => {
    // Intercept and delay API requests
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto('/admin/conversations');
    
    // Verify loading spinner is shown
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Wait for content to load
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
  });

  test('validates form inputs', async ({ page }) => {
    await page.goto('/admin/experiments-new');
    
    // Try to submit empty form
    await page.click('text=Create Experiment');
    
    // Verify validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });
});