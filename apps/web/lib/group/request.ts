import { auth } from '@/auth';
import type { NextRequest } from 'next/server';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

export function toJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function getOrgIdFromRequest(request: NextRequest, candidate?: unknown): string | null {
  const url = new URL(request.url);
  const queryValue = url.searchParams.get('orgId');
  const headerValue = request.headers.get('x-org-id');
  const candidates = [candidate, headerValue, queryValue];
  for (const option of candidates) {
    if (typeof option === 'string' && isUuid(option)) {
      return option.trim();
    }
  }
  return null;
}

export async function resolveUserId(request: NextRequest, candidate?: unknown): Promise<string | null> {
  const headerValue = request.headers.get('x-user-id');
  const staticCandidates = [candidate, headerValue];
  for (const option of staticCandidates) {
    if (typeof option === 'string' && isUuid(option)) {
      return option.trim();
    }
  }

  try {
    const session = await auth();
    const sessionCandidates = [
      (session?.user as { id?: string } | undefined)?.id,
      (session?.user as { sub?: string } | undefined)?.sub,
    ];
    for (const option of sessionCandidates) {
      if (typeof option === 'string' && isUuid(option)) {
        return option.trim();
      }
    }
  } catch (error) {
    console.warn('Unable to resolve session user for group request', error);
  }

  return null;
}
