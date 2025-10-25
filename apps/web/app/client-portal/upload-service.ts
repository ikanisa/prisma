import { logger } from '@/lib/logger';

export interface UploadOptions {
  apiBase: string;
  fetchImpl?: typeof fetch;
}

const normaliseBase = (base: string): string => base.replace(/\/$/, '');

export const resolveUploadEndpoint = (apiBase: string): string => {
  const base = apiBase.trim();
  if (!base) return '/client/upload';
  return `${normaliseBase(base)}/client/upload`;
};

export async function submitDocument({ apiBase, fetchImpl = fetch }: UploadOptions, file: File): Promise<boolean> {
  const target = resolveUploadEndpoint(apiBase);
  const form = new FormData();
  form.append('file', file);

  try {
    const response = await fetchImpl(target, { method: 'POST', body: form });
    return response.ok;
  } catch (error) {
    logger.warn('client_portal.document_upload_failed', { error, target });
    return false;
  }
}
