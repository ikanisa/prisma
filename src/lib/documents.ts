import { authorizedFetch } from '@/lib/api';

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
}

export interface UploadDocumentParams {
  orgSlug: string;
  engagementId?: string;
  name?: string;
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

export async function listDocuments(orgSlug: string, limit = 100): Promise<DocumentRecord[]> {
  const response = await authorizedFetch(`/v1/storage/documents?orgSlug=${encodeURIComponent(orgSlug)}&limit=${limit}`);
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
