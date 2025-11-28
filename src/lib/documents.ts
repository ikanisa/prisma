import { authorizedFetch } from '@/lib/api';

export interface DocumentExtractionSummary {
  status?: string | null;
  fields: Record<string, unknown>;
  confidence?: number | null;
  provenance?: Array<Record<string, unknown>>;
  extractorName?: string | null;
  updated_at?: string | null;
  documentType?: string | null;
  summary?: string | null;
}

export interface DocumentRecord {
  id: string;
  org_id: string;
  engagement_id: string | null;
  name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
  repo_folder?: string | null;
  classification?: string | null;
  deleted?: boolean;
  ocr_status?: string | null;
  parse_status?: string | null;
  portal_visible?: boolean;
  extraction?: DocumentExtractionSummary | null;
  quarantined?: boolean;
}

export interface UploadDocumentParams {
  orgSlug: string;
  engagementId?: string;
  name?: string;
  repoFolder?: string;
  entityId?: string;
}

export async function uploadDocument(file: File, params: UploadDocumentParams): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('orgSlug', params.orgSlug);

  if (params.engagementId) {
    formData.append('engagementId', params.engagementId);
  }
  if (params.name) {
    formData.append('name', params.name);
  }
  if (params.repoFolder) {
    formData.append('repoFolder', params.repoFolder);
  }
  if (params.entityId) {
    formData.append('entityId', params.entityId);
  }

  const response = await authorizedFetch('/v1/storage/documents', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Document upload failed');
  }

  return payload.document as DocumentRecord;
}

export interface ListDocumentsParams {
  orgSlug: string;
  page?: number;
  pageSize?: number;
  state?: 'active' | 'archived' | 'all';
}

export async function listDocuments({
  orgSlug,
  page = 1,
  pageSize = 20,
  state = 'active',
}: ListDocumentsParams): Promise<DocumentRecord[]> {
  const offset = (page - 1) * pageSize;
  const stateParam = encodeURIComponent(state);
  const response = await authorizedFetch(
    `/v1/storage/documents?orgSlug=${encodeURIComponent(orgSlug)}&state=${stateParam}&limit=${pageSize}&offset=${offset}`,
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Document list failed');
  }
  return (payload.documents ?? []) as DocumentRecord[];
}

export async function createSignedDocumentUrl(documentId: string, ttlSeconds?: number): Promise<string> {
  const response = await authorizedFetch('/v1/storage/sign', {
    method: 'POST',
    body: JSON.stringify({ documentId, ttlSeconds }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to generate preview link');
  }
  return payload.url as string;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await authorizedFetch(`/v1/storage/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'delete failed' }));
    throw new Error(payload.error ?? 'delete failed');
  }
}

export async function restoreDocument(documentId: string): Promise<void> {
  const response = await authorizedFetch(`/v1/storage/documents/${documentId}/restore`, {
    method: 'POST',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'restore failed' }));
    throw new Error(payload.error ?? 'restore failed');
  }
}
