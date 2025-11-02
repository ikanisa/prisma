import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { createGatewayServer } from '../../apps/gateway/src/server.js';

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
        return { id: 'task', ...payload } as any;
      }
      async updateTask(_taskId: string, payload: any) {
        return { ok: true, ...payload } as any;
      }
      async listTaskComments(_taskId: string) {
        return { comments: [] } as any;
      }
      async addTaskComment(_taskId: string, payload: any) {
        return { ok: true, ...payload } as any;
      }
      async listDocuments() {
        return { documents: [] } as any;
      }
      async signDocument(payload: any) {
        return { ok: true, ...payload } as any;
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
      async runAnalytics(payload: any) {
        return { ok: true, ...payload } as any;
      }
      async onboardingStart(payload: any) {
        return { ok: true, ...payload } as any;
      }
      async onboardingLinkDoc(payload: any) {
        return { ok: true, ...payload } as any;
      }
      async onboardingCommit(payload: any) {
        return { ok: true, ...payload } as any;
      }
    },
  };
});

describe('gateway security hardening', () => {
  let app: Express;

  beforeEach(async () => {
    app = await createGatewayServer();
  });

  function withOrgHeaders<T extends request.Test>(req: T): T {
    return req
      .set('x-org-id', 'acme')
      .set('x-user-id', 'user-1')
      .set('x-org-memberships', 'acme:MANAGER');
  }

  it('applies strict security headers to responses', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).not.toMatch(/unsafe/i);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['permissions-policy']).toContain('camera=()');
  });

  it('rejects malformed release control payloads with validation errors', async () => {
    const res = await withOrgHeaders(request(app).post('/v1/release-controls/check')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.details.fieldErrors.orgSlug).toBeDefined();
  });

  it('requires authenticated user context for protected routes', async () => {
    const res = await request(app)
      .get('/v1/tasks')
      .set('x-org-id', 'acme')
      .set('x-org-memberships', 'acme:MANAGER');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('user_not_authenticated');
  });
});
