import { test, expect } from '@playwright/test';

test.describe('Embeddings playground', () => {
  test('generates an embedding preview via the proxy API', async ({ page }) => {
    await page.route('**/api/openai/embeddings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 10, total_tokens: 10 },
          data: [
            {
              index: 0,
              embedding: [
                0.123456,
                -0.654321,
                0.234567,
                -0.345678,
                0.456789,
                -0.567891,
                0.678912,
                -0.789123,
                0.891234,
                -0.912345,
              ],
            },
          ],
        }),
      });
    });

    await page.goto('/openai/embeddings');

    await expect(page.getByRole('heading', { name: 'Vector embeddings overview' })).toBeVisible();

    await page.getByLabel('Text to embed').fill('Playwright ensures the playground renders embedding previews.');
    await page.getByLabel('Dimensions (optional)').fill('128');
    await page.getByRole('button', { name: 'Create embedding' }).click();

    await expect(page.getByText('text-embedding-3-small')).toBeVisible();
    await expect(page.getByText('Tokens: prompt 10 · total 10')).toBeVisible();
    await expect(page.locator('code, div.font-mono').first()).toContainText('[0.123456, -0.654321, 0.234567, -0.345678, 0.456789, -0.567891, 0.678912, -0.789123 …]');
  });

  test('ranks deterministic corpus without live API calls', async ({ page }) => {
    await page.goto('/openai/embeddings');

    await expect(page.getByRole('heading', { name: 'Vector embeddings overview' })).toBeVisible();

    const deterministicToggle = page.getByLabel('Use deterministic corpus (offline)');
    await expect(deterministicToggle).toBeChecked();

    await page.getByLabel('Natural language query').fill('Revenue recognition controls for SaaS engagements');
    await page.getByRole('button', { name: 'Run semantic search' }).click();

    const resultsList = page.locator('ul.space-y-3').first();
    await expect(resultsList).toBeVisible();

    const firstResult = resultsList.locator('li').first();
    await expect(firstResult).toContainText('Revenue controls walkthrough');
    await expect(firstResult).toContainText('Similarity');
  });
});
