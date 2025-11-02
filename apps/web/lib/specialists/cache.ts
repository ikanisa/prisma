import { invalidateRouteCache } from '@/lib/cache/route-cache';
import { logger } from '@/lib/logger';

const ALL_ENGAGEMENTS_KEY = 'all';

export async function invalidateSpecialistsCache(
  orgId: string,
  engagementId: string | null | undefined,
): Promise<void> {
  const targets: Array<[string, string]> = [];
  const scopedEngagement = engagementId ?? ALL_ENGAGEMENTS_KEY;

  targets.push([orgId, scopedEngagement]);

  if (engagementId && engagementId !== ALL_ENGAGEMENTS_KEY) {
    targets.push([orgId, ALL_ENGAGEMENTS_KEY]);
  }

  for (const [targetOrgId, targetEngagementId] of targets) {
    try {
      await invalidateRouteCache('specialists', [targetOrgId, targetEngagementId]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('apps.web.specialists.cache_invalidate_failed', {
        message,
        orgId: targetOrgId,
        engagementId: targetEngagementId,
      });
    }
  }
}
