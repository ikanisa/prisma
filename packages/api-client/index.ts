import type { paths } from './types.js';

export type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface ClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  defaultHeaders?: Record<string, string>;
  retries?: number;
  retryDelayMs?: number;
  retryStatuses?: number[];
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryStatuses: Set<number>;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike);
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.retries = typeof options.retries === 'number' ? Math.max(0, options.retries) : 1;
    this.retryDelayMs = typeof options.retryDelayMs === 'number' ? Math.max(0, options.retryDelayMs) : 250;
    const defaults = new Set([429, 502, 503, 504]);
    this.retryStatuses = new Set(options.retryStatuses && options.retryStatuses.length ? options.retryStatuses : Array.from(defaults));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.fetchImpl(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...this.defaultHeaders, ...(init?.headers ?? {}) },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        return body as T;
      }
      const shouldRetry = this.retryStatuses.has(res.status) && attempt < this.retries;
      if (!shouldRetry) {
        const err = (body && (body.error || body.detail)) || `request_failed_${res.status}`;
        throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
      }
      attempt += 1;
      const backoff = this.retryDelayMs * attempt;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  // GET /v1/autonomy/status?orgSlug=
  /**
   * @see ApiTypes for exact response shape
   */
  async getAutonomyStatus(orgSlug: string): Promise<
    paths['/v1/autonomy/status']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/autonomy/status?${params.toString()}`);
  }

  // POST /api/release-controls/check
  /**
   * @see ApiTypes for exact response shape
   */
  async checkReleaseControls(
    payload: paths['/api/release-controls/check']['post']['requestBody']['content']['application/json'],
  ): Promise<
    paths['/api/release-controls/check']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/api/release-controls/check`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // GET /v1/storage/documents
  /**
   * @see ApiTypes for exact response shape
   */
  async listDocuments(options: {
    orgSlug: string;
    limit?: number;
    offset?: number;
    repo?: string;
    state?: 'active' | 'archived' | 'all';
  }): Promise<paths['/v1/storage/documents']['get']['responses']['200']['content']['application/json']> {
    const params = new URLSearchParams({ orgSlug: options.orgSlug });
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.repo) params.set('repo', options.repo);
    if (options.state) params.set('state', options.state);
    return this.request(`/v1/storage/documents?${params.toString()}`);
  }

  // GET /v1/knowledge/web-sources
  async listWebSources(orgSlug: string): Promise<
    paths['/v1/knowledge/web-sources']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/knowledge/web-sources?${params.toString()}`);
  }

  // GET /v1/knowledge/drive/metadata
  async getDriveMetadata(orgSlug: string): Promise<
    paths['/v1/knowledge/drive/metadata']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/knowledge/drive/metadata?${params.toString()}`);
  }

  // GET /v1/knowledge/drive/status
  async getDriveStatus(orgSlug: string): Promise<
    paths['/v1/knowledge/drive/status']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/knowledge/drive/status?${params.toString()}`);
  }

  // POST /v1/knowledge/web-harvest
  async triggerWebHarvest(payload: paths['/v1/knowledge/web-harvest']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/knowledge/web-harvest']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/knowledge/web-harvest`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Tasks API
  async listTasks(orgSlug: string): Promise<
    paths['/v1/tasks']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/tasks?${params.toString()}`);
  }

  async createTask(payload: paths['/v1/tasks']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/tasks']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/tasks`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateTask(
    taskId: string,
    payload: paths['/v1/tasks/{task_id}']['patch']['requestBody']['content']['application/json'],
  ): Promise<paths['/v1/tasks/{task_id}']['patch']['responses']['200']['content']['application/json']> {
    return this.request(`/v1/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async listTaskComments(taskId: string): Promise<
    paths['/v1/tasks/{task_id}/comments']['get']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/tasks/${encodeURIComponent(taskId)}/comments`);
  }

  async addTaskComment(
    taskId: string,
    payload: paths['/v1/tasks/{task_id}/comments']['post']['requestBody']['content']['application/json'],
  ): Promise<paths['/v1/tasks/{task_id}/comments']['post']['responses']['200']['content']['application/json']> {
    return this.request(`/v1/tasks/${encodeURIComponent(taskId)}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Documents signing
  async signDocument(payload: paths['/v1/storage/sign']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/storage/sign']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/storage/sign`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Notifications API
  async listNotifications(orgSlug: string): Promise<
    paths['/v1/notifications']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams({ orgSlug });
    return this.request(`/v1/notifications?${params.toString()}`);
  }

  async updateNotification(
    notificationId: string,
    payload: paths['/v1/notifications/{notification_id}']['patch']['requestBody']['content']['application/json'],
  ): Promise<paths['/v1/notifications/{notification_id}']['patch']['responses']['200']['content']['application/json']> {
    return this.request(`/v1/notifications/${encodeURIComponent(notificationId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async markAllNotifications(
    payload: paths['/v1/notifications/mark-all']['post']['requestBody']['content']['application/json'],
  ): Promise<paths['/v1/notifications/mark-all']['post']['responses']['200']['content']['application/json']> {
    return this.request(`/v1/notifications/mark-all`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Documents delete/restore/extraction update
  async deleteDocument(documentId: string): Promise<
    paths['/v1/storage/documents/{document_id}']['delete']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/storage/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
  }

  async restoreDocument(documentId: string): Promise<
    paths['/v1/storage/documents/{document_id}/restore']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/storage/documents/${encodeURIComponent(documentId)}/restore`, { method: 'POST' });
  }

  async updateDocumentExtraction(
    documentId: string,
    payload: paths['/v1/documents/{document_id}/extraction']['post']['requestBody']['content']['application/json'],
  ): Promise<paths['/v1/documents/{document_id}/extraction']['post']['responses']['200']['content']['application/json']> {
    return this.request(`/v1/documents/${encodeURIComponent(documentId)}/extraction`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Analytics (ADA) endpoints
  async getAnalyticsRun(query: paths['/api/ada/run']['get']['parameters']['query']): Promise<
    paths['/api/ada/run']['get']['responses']['200']['content']['application/json']
  > {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request(`/api/ada/run?${params.toString()}`);
  }

  // Onboarding endpoints
  async onboardingStart(payload: paths['/v1/onboarding/start']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/onboarding/start']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/onboarding/start`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async onboardingLinkDoc(payload: paths['/v1/onboarding/link-doc']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/onboarding/link-doc']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/onboarding/link-doc`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async onboardingCommit(payload: paths['/v1/onboarding/commit']['post']['requestBody']['content']['application/json']): Promise<
    paths['/v1/onboarding/commit']['post']['responses']['200']['content']['application/json']
  > {
    return this.request(`/v1/onboarding/commit`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async runAnalytics(
    payload: paths['/api/ada/run']['post']['requestBody']['content']['application/json'],
  ): Promise<paths['/api/ada/run']['post']['responses']['200']['content']['application/json']> {
    return this.request(`/api/ada/run`, { method: 'POST', body: JSON.stringify(payload) });
  }
}

export default ApiClient;
export * as ApiTypes from './types.js';
