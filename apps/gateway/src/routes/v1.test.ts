import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createGatewayServer } from '../server';

vi.mock('@prisma-glow/api-client', () => {
  return {
    default: class MockClient {
      async getAutonomyStatus(orgSlug: string) {
        return { ok: true, orgSlug } as any;
      }
      async checkReleaseControls(payload: any) {
        return { status: 'ok', input: payload } as any;
      }
      async listTasks(orgSlug: string) {
        return { tasks: [{ id: 't1', orgSlug }] } as any;
      }
      async createTask(payload: any) {
        return { id: 't-new', ...payload } as any;
      }
      async listDocuments(_opts: any) {
        return { documents: [{ id: 'd1' }] } as any;
      }
      async listWebSources(_orgSlug: string) {
        return { sources: [{ id: 's1' }], settings: {} } as any;
      }
      async listNotifications(orgSlug: string) {
        return { notifications: [{ id: 'n1', orgSlug }] } as any;
      }
      async updateNotification(id: string, payload: any) {
        return { id, ...payload } as any;
      }
      async markAllNotifications(payload: any) {
        return { ok: true, ...payload } as any;
      }
      async onboardingStart(payload: any) {
        return { ok: true, started: true, ...payload } as any;
      }
      async onboardingLinkDoc(payload: any) {
        return { ok: true, linked: true, ...payload } as any;
      }
      async onboardingCommit(payload: any) {
        return { ok: true, committed: true, ...payload } as any;
      }
    },
  };
});

describe('v1 gateway routes', () => {
  let app: ReturnType<typeof createGatewayServer>;
  beforeEach(() => {
    app = createGatewayServer();
  });

  it('proxies autonomy status', async () => {
    const res = await request(app).get('/v1/autonomy/status').query({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.orgSlug).toBe('acme');
  });

  it('validates autonomy status query', async () => {
    const res = await request(app).get('/v1/autonomy/status');
    expect(res.status).toBe(400);
  });

  it('proxies release controls check', async () => {
    const res = await request(app).post('/v1/release-controls/check').send({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.input.orgSlug).toBe('acme');
  });

  it('proxies list tasks', async () => {
    const res = await request(app).get('/v1/tasks').query({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.tasks[0].orgSlug).toBe('acme');
  });

  it('creates a task', async () => {
    const res = await request(app).post('/v1/tasks').send({ title: 'Test task' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test task');
  });

  it('lists documents', async () => {
    const res = await request(app).get('/v1/storage/documents').query({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it('lists web sources', async () => {
    const res = await request(app).get('/v1/knowledge/web-sources').query({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it('lists notifications', async () => {
    const res = await request(app).get('/v1/notifications').query({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.notifications[0].orgSlug).toBe('acme');
  });

  it('updates a notification', async () => {
    const res = await request(app).patch('/v1/notifications/n1').send({ read: true });
    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
  });

  it('marks all notifications', async () => {
    const res = await request(app).post('/v1/notifications/mark-all').send({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('onboarding start', async () => {
    const res = await request(app).post('/v1/onboarding/start').send({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.started).toBe(true);
  });

  it('onboarding link doc', async () => {
    const res = await request(app).post('/v1/onboarding/link-doc').send({ documentId: 'd1' });
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
  });

  it('onboarding commit', async () => {
    const res = await request(app).post('/v1/onboarding/commit').send({ orgSlug: 'acme' });
    expect(res.status).toBe(200);
    expect(res.body.committed).toBe(true);
  });

  it('observability dry-run returns 404 when disabled', async () => {
    delete (process.env as any).ALLOW_SENTRY_DRY_RUN;
    const res = await request(app).post('/v1/observability/dry-run');
    expect(res.status).toBe(404);
  });

  it('observability dry-run throws when enabled', async () => {
    process.env.ALLOW_SENTRY_DRY_RUN = 'true';
    const res = await request(app).post('/v1/observability/dry-run');
    expect(res.status).toBe(500);
  });
});
