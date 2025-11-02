import { invalidateRouteCache } from '@/lib/cache/route-cache';
import { logger } from '@/lib/logger';

export async function invalidateGroupComponentsCache(orgId: string, engagementId: string): Promise<void> {
  try {
    await invalidateRouteCache('groupComponents', [orgId, engagementId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('apps.web.group.cache_invalidate_failed', {
      message,
      orgId,
      engagementId,
    });
  }
}
