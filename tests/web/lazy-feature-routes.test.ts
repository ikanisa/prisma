import { describe, expect, it } from 'vitest';

import { featureRoutes } from '@/src/features/routes';
import { lazyFeatureRoutes, lazyFeatureRouteMap } from '@/src/routes';

describe('lazy feature routes registry', () => {
  it('exposes a lazy component for every registered feature route', () => {
    expect(lazyFeatureRoutes).toHaveLength(featureRoutes.length);

    for (const route of featureRoutes) {
      expect(lazyFeatureRouteMap[route.route]).toBeDefined();
    }
  });
});
