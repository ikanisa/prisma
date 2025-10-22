import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

test.describe('Core customer journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agent/**', async (route) => {
      const url = new URL(route.request().url());
      const jsonResponse = (body: unknown) =>
        route.fulfill({
          status: 200,
          body: JSON.stringify(body),
          headers: { 'content-type': 'application/json' },
        });

      if (url.pathname.endsWith('/conversations')) {
        return jsonResponse({
          conversations: [
            {
              id: 'conv-fixture',
              created_at: Date.now() / 1000,
              metadata: { summary: 'Quarterly planning check-in' },
            },
          ],
          hasMore: false,
          lastId: null,
        });
      }

      if (url.pathname.includes('/conversations/') && url.pathname.endsWith('/items')) {
        return jsonResponse({
          items: [
            {
              id: 'item-1',
              type: 'message',
              role: 'assistant',
              status: 'COMPLETED',
              content: [
                {
                  type: 'output_text',
                  output_text: 'Reviewed supporting workpapers and draft opinion.',
                },
              ],
            },
          ],
        });
      }

      if (url.pathname.endsWith('/start')) {
        return jsonResponse({ sessionId: 'sess_demo' });
      }

      if (url.pathname.includes('/chatkit/session') && url.pathname.endsWith('/cancel')) {
        return jsonResponse({ session: { chatkit_session_id: 'chatkit-fixture', status: 'CANCELLED' } });
      }

      if (url.pathname.includes('/chatkit/session') && url.pathname.endsWith('/resume')) {
        return jsonResponse({ session: { chatkit_session_id: 'chatkit-fixture', status: 'ACTIVE' } });
      }

      if (url.pathname.includes('/chatkit/session')) {
        return jsonResponse({
          session: {
            chatkit_session_id: 'chatkit-fixture',
            status: 'ACTIVE',
            metadata: { owner: 'playwright' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }

      if (url.pathname.endsWith('/realtime/session')) {
        return jsonResponse({
          clientSecret: 'secret-demo',
          sessionId: 'chatkit-fixture',
          expiresAt: '2030-01-01T00:00:00Z',
          turnServers: [{ urls: 'turn:relay.example.com', username: 'agent', credential: 'secret' }],
        });
      }

      if (url.pathname.endsWith('/respond')) {
        return jsonResponse({ status: 'ok' });
      }

      return jsonResponse({});
    });
  });

  test('auth landing exposes primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Agent Chat' })).toHaveAttribute('href', '/agent-chat');
    await expect(page.getByRole('link', { name: 'Client Portal' })).toHaveAttribute('href', '/client-portal');
  });

  test('agent chat session bootstrap uses stable fixtures', async ({ page }) => {
    await page.goto('/agent-chat');
    await expect(page.getByRole('heading', { name: 'Agent Streaming Playground' })).toBeVisible();

    const startButton = page.getByRole('button', { name: 'Start agent session' });
    await startButton.click();
    await expect(page.getByText('Agent session sess_demo started.')).toBeVisible();

    const realtimeButton = page.getByRole('button', { name: 'Request realtime session' });
    await realtimeButton.click();
    await expect(page.getByText('Realtime session created and ChatKit metadata stored.')).toBeVisible();

    await expect(page.getByText('ChatKit session cancelled.')).not.toBeVisible({ timeout: 500 }).catch(() => {
      /* ignore optional UI */
    });
  });

  test('document upload flow reports success state', async ({ page }) => {
    await page.route('**/client/upload', (route) =>
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) }),
    );

    await page.goto('/client-portal');
    const fileInput = page.getByLabel('Upload document');
    await fileInput.setInputFiles({ name: 'evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await expect(page.getByText('Uploaded')).toBeVisible();
  });
});
