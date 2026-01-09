import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configureSupabaseTable,
  createAuthHeader,
  getSupabaseInsertions,
  resetSupabase,
} from '../../tests/setup.ts';

async function loadApp() {
  const mod = await import('../../index.ts');
  return mod.default;
}

describe('POST /v1/journal/entries', () => {
  beforeEach(() => {
    resetSupabase();
    vi.resetModules();
  });

  it('rejects unauthenticated requests', async () => {
    const app = await loadApp();
    const response = await request(app).post('/v1/journal/entries').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'missing or invalid authorization header' });
  });

  it('requires an orgSlug in the payload', async () => {
    const app = await loadApp();

    const response = await request(app)
      .post('/v1/journal/entries')
      .set('authorization', createAuthHeader())
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'orgSlug is required' });
  });

  it('returns 404 when the organization cannot be resolved', async () => {
    configureSupabaseTable('organizations', { maybeSingle: { data: null, error: null } });

    const app = await loadApp();
    const response = await request(app)
      .post('/v1/journal/entries')
      .set('authorization', createAuthHeader({ sub: 'user-missing-org' }))
      .send({ orgSlug: 'missing-co' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'organization not found' });
    expect(getSupabaseInsertions('approval_queue')).toHaveLength(0);
  });

  it('returns 403 when the user is not a member of the organization', async () => {
    configureSupabaseTable('organizations', {
      maybeSingle: { data: { id: 'org-1', slug: 'acme-co' }, error: null },
    });
    configureSupabaseTable('memberships', { maybeSingle: { data: null, error: null } });

    const app = await loadApp();
    const response = await request(app)
      .post('/v1/journal/entries')
      .set('authorization', createAuthHeader({ sub: 'user-without-access' }))
      .send({ orgSlug: 'acme-co' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'forbidden' });
    expect(getSupabaseInsertions('approval_queue')).toHaveLength(0);
  });

  it('enforces manager approval requirements for non-manager roles', async () => {
    configureSupabaseTable('organizations', {
      maybeSingle: { data: { id: 'org-2', slug: 'finance-inc' }, error: null },
    });
    configureSupabaseTable('memberships', {
      maybeSingle: { data: { role: 'STAFF' }, error: null },
    });

    const app = await loadApp();
    const response = await request(app)
      .post('/v1/journal/entries')
      .set('authorization', createAuthHeader({ sub: 'staff-user' }))
      .send({ orgSlug: 'finance-inc' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'manager_approval_required', action: 'JOURNAL_POST' });
    expect(getSupabaseInsertions('approval_queue')).toHaveLength(0);
  });

  it('queues manager approvals and returns tracking metadata for ledger posts', async () => {
    configureSupabaseTable('organizations', {
      maybeSingle: { data: { id: 'org-3', slug: 'ledger-labs' }, error: null },
    });
    configureSupabaseTable('memberships', {
      maybeSingle: { data: { role: 'MANAGER' }, error: null },
    });
    configureSupabaseTable('approval_queue', {
      insert: { data: { id: 'approval-123' }, error: null },
    });

    const app = await loadApp();
    const response = await request(app)
      .post('/v1/journal/entries')
      .set('authorization', createAuthHeader({ sub: 'manager-user' }))
      .send({ orgSlug: 'ledger-labs' });

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      status: 'approval_required',
      action: 'JOURNAL_POST',
      approvalId: 'approval-123',
      message: 'Awaiting manager review.',
      citationsRequired: true,
      monitoringEnabled: true,
    });

    const [queued] = getSupabaseInsertions('approval_queue');
    expect(queued).toMatchObject({
      org_id: 'org-3',
      kind: 'JOURNAL_POST',
      status: 'PENDING',
      requested_by_user_id: 'manager-user',
    });
    expect(queued.context_json).toMatchObject({
      orgSlug: 'ledger-labs',
      action: 'JOURNAL_POST',
      path: '/v1/journal/entries',
      method: 'POST',
      requestedBy: 'manager-user',
    });
  });
});

