import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

test.describe('core customer journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**supabase.co/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem('cookieConsent', 'accepted');
      window.localStorage.setItem('currentOrgId', '1');
    });
  });

  test('demo sign-in route redirects to the organization dashboard', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.waitForURL('**/prisma-glow/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back to Prisma Glow')).toBeVisible();
  });

  test('client onboarding agent confirms a drafted profile', async ({ page }) => {
    await page.goto('/prisma-glow/clients');

    await expect(page.getByRole('heading', { name: 'Client Onboarding' })).toBeVisible();

    const agentInput = page.locator('textarea').first();
    await agentInput.fill(
      [
        'Company name: Lunar Analytics',
        'Industry: Technology',
        'Country: Canada',
        'Primary contact: Alex Rivera',
        'Contact email: alex.rivera@lunar.dev',
        'Fiscal year end: 2024-12-31',
      ].join('\n'),
    );
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Ready to create this client?')).toBeVisible();
    await page.getByRole('button', { name: 'Create client' }).click();

    await expect(page.getByText('Client onboarding complete', { exact: false })).toBeVisible();
    await expect(page.getByText('All set! Lunar Analytics', { exact: false })).toBeVisible();
  });

  test('documents workspace uploads files and surfaces failures', async ({ page }) => {
    const now = new Date().toISOString();
    const initialDocuments = [
      {
        id: 'doc-initial',
        org_id: 'org-1',
        engagement_id: null,
        name: 'existing-report.pdf',
        file_path: 'existing-report.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        uploaded_by: 'user-1',
        created_at: now,
        repo_folder: 'shared',
        classification: 'REPORT',
        extraction: { documentType: 'REPORT', fields: {} },
        deleted: false,
        quarantined: false,
        ocr_status: null,
        parse_status: null,
        portal_visible: true,
      },
    ];

    await page.route('**/v1/storage/documents?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: initialDocuments }),
      });
    });

    let uploadCount = 0;
    await page.route('**/v1/storage/documents', async (route) => {
      if (route.request().method() === 'POST') {
        uploadCount += 1;
        if (uploadCount === 1) {
          const document = {
            id: 'doc-new',
            org_id: 'org-1',
            engagement_id: null,
            name: 'lunar-brief.pdf',
            file_path: 'lunar-brief.pdf',
            file_size: 512,
            file_type: 'application/pdf',
            uploaded_by: 'user-1',
            created_at: now,
            repo_folder: 'shared',
            classification: 'BRIEF',
            extraction: { documentType: 'BRIEF', fields: {} },
            deleted: false,
            quarantined: false,
            ocr_status: null,
            parse_status: null,
            portal_visible: true,
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ document }),
          });
          return;
        }

        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated failure' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/prisma-glow/documents');
    await expect(page.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();

    await page.getByRole('button', { name: 'Upload Files' }).first().click();
    await page.setInputFiles('input[type="file"]', {
      name: 'lunar-brief.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test document'),
    });
    await page.getByRole('button', { name: /Upload 1 file/ }).click();

    await expect(page.getByText('Document uploaded')).toBeVisible();
    await expect(page.getByText('lunar-brief.pdf', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: 'Upload Files' }).first().click();
    await page.setInputFiles('input[type="file"]', {
      name: 'corrupted.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('broken'),
    });
    await page.getByRole('button', { name: /Upload 1 file/ }).click();

    await expect(page.getByText('Upload failed')).toBeVisible();
  });
});
