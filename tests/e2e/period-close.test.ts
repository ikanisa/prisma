/**
 * E2E Tests for Financial Period Close
 * 
 * P2-4: Comprehensive end-to-end tests for period close workflow
 * 
 * Tests:
 * - Pre-close validation
 * - Period locking
 * - Reversal mechanics
 * - Post-close adjustments
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000';
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-org-001';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-001';

test.describe('Financial Period Close E2E', () => {
  let authToken: string;
  let periodId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Authenticate and create test period
    const authResponse = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'test-password'
      }
    });
    
    if (authResponse.ok()) {
      const authData = await authResponse.json();
      authToken = authData.token;
    }

    // Create test period
    const periodResponse = await request.post(
      `${API_BASE}/api/v1/accounting/periods`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_start: '2026-01-01',
          period_end: '2026-01-31',
          period_name: 'January 2026'
        }
      }
    );
    
    if (periodResponse.ok()) {
      const periodData = await periodResponse.json();
      periodId = periodData.id;
    }
  });

  test('should prevent close with unposted entries', async ({ request }) => {
    // Create unposted journal entry
    const entryResponse = await request.post(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_id: periodId,
          entry_date: '2026-01-15',
          description: 'Test unposted entry',
          debit_account: '5000',
          credit_account: '2100',
          amount: 1000.00,
          status: 'DRAFT'
        }
      }
    );

    expect(entryResponse.ok()).toBeTruthy();

    // Attempt to close period
    const closeResponse = await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(closeResponse.status()).toBe(400);
    const errorData = await closeResponse.json();
    expect(errorData.errors).toContain('UNPOSTED_ENTRIES');
  });

  test('should prevent close with unbalanced entries', async ({ request }) => {
    // Create unbalanced entry (debits != credits)
    const entryResponse = await request.post(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_id: periodId,
          entry_date: '2026-01-15',
          description: 'Unbalanced entry',
          debit_account: '5000',
          credit_account: '2100',
          amount: 1000.00,
          status: 'POSTED'
        }
      }
    );

    // Attempt to close period
    const closeResponse = await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(closeResponse.status()).toBe(400);
    const errorData = await closeResponse.json();
    expect(errorData.errors).toContain('UNBALANCED_ENTRIES');
  });

  test('should successfully close period with valid entries', async ({ request }) => {
    // Create valid posted entry
    const entryResponse = await request.post(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_id: periodId,
          entry_date: '2026-01-15',
          description: 'Valid entry',
          debit_account: '5000',
          credit_account: '2100',
          amount: 1000.00,
          status: 'POSTED'
        }
      }
    );

    expect(entryResponse.ok()).toBeTruthy();

    // Close period
    const closeResponse = await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(closeResponse.status()).toBe(200);
    const closeData = await closeResponse.json();
    expect(closeData.status).toBe('CLOSED');
    expect(closeData.lock_level).toBe('SOFT');
  });

  test('should create reversal entries on new period', async ({ request }) => {
    // Create auto-reverse entry
    const entryResponse = await request.post(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_id: periodId,
          entry_date: '2026-01-31',
          description: 'Auto-reverse entry',
          debit_account: '5000',
          credit_account: '2100',
          amount: 1500.00,
          status: 'POSTED',
          auto_reverse: true,
          reversal_date: '2026-02-01'
        }
      }
    );

    expect(entryResponse.ok()).toBeTruthy();

    // Close period
    await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    // Check reversal exists in next period
    const reversalsResponse = await request.get(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          organization_id: TEST_ORG_ID,
          entry_type: 'REVERSAL',
          entry_date: '2026-02-01'
        }
      }
    );

    expect(reversalsResponse.ok()).toBeTruthy();
    const reversals = await reversalsResponse.json();
    expect(reversals.length).toBeGreaterThan(0);
    expect(reversals[0].entry_type).toBe('REVERSAL');
  });

  test('should lock period after close', async ({ request }) => {
    // Close period
    await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    // Attempt to create entry in locked period
    const entryResponse = await request.post(
      `${API_BASE}/api/v1/accounting/journal-entries`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          organization_id: TEST_ORG_ID,
          period_id: periodId,
          entry_date: '2026-01-20',
          description: 'Entry in locked period',
          debit_account: '5000',
          credit_account: '2100',
          amount: 500.00,
          status: 'DRAFT'
        }
      }
    );

    expect(entryResponse.status()).toBe(403);
    const errorData = await entryResponse.json();
    expect(errorData.error).toContain('PERIOD_LOCKED');
  });

  test('should allow post-close adjustments with approval', async ({ request }) => {
    // Close period
    await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    // Request adjustment
    const adjustmentRequest = await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/adjustments`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          reason: 'Tax adjustment',
          entry_data: {
            description: 'Tax adjustment entry',
            debit_account: '6000',
            credit_account: '2100',
            amount: 250.00
          }
        }
      }
    );

    expect(adjustmentRequest.status()).toBe(201);
    const adjustment = await adjustmentRequest.json();
    expect(adjustment.status).toBe('PENDING_APPROVAL');

    // Approve adjustment (as Partner+)
    const approveResponse = await request.post(
      `${API_BASE}/api/v1/accounting/adjustments/${adjustment.id}/approve`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(approveResponse.status()).toBe(200);
    const approved = await approveResponse.json();
    expect(approved.status).toBe('APPROVED');
  });

  test('should generate reports at close', async ({ request }) => {
    // Close period
    const closeResponse = await request.post(
      `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    expect(closeResponse.status()).toBe(200);
    const closeData = await closeResponse.json();

    // Check reports generated
    expect(closeData.reports).toBeDefined();
    expect(closeData.reports.trial_balance).toBeDefined();
    expect(closeData.reports.general_ledger).toBeDefined();
    expect(closeData.reports.profit_loss).toBeDefined();
    expect(closeData.reports.balance_sheet).toBeDefined();
  });

  test('should handle concurrent close attempts', async ({ request }) => {
    // Attempt concurrent closes
    const [response1, response2] = await Promise.all([
      request.post(
        `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      ),
      request.post(
        `${API_BASE}/api/v1/accounting/periods/${periodId}/close`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      )
    ]);

    // One should succeed, one should fail with conflict
    const statuses = [response1.status(), response2.status()];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409); // Conflict
  });
});

