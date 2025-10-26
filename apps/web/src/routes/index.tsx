'use client';

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import { featureRoutes, type FeatureRoute } from '@/src/features/routes';

export type LazyFeatureRoute = Omit<FeatureRoute, 'component'> & {
  component: LazyExoticComponent<ComponentType<any>>;
};

const componentLoaders: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  '@/src/features/agents/orchestrator/AgentOrchestratorPage': () =>
    import('@/src/features/agents/orchestrator/AgentOrchestratorPage'),
  '@/app/agent/domain-tools/page': () => import('@/app/agent/domain-tools/page'),
  '@/app/agent-chat/page': () => import('@/app/agent-chat/page'),
  '@/app/dashboard/page': () => import('@/app/dashboard/page'),
};

const toLazyComponent = (loader: () => Promise<{ default: ComponentType<any> }>) => lazy(loader);

export const lazyFeatureRoutes: LazyFeatureRoute[] = featureRoutes.map((route) => {
  const loader = componentLoaders[route.component];

  if (!loader) {
    throw new Error(`Missing lazy loader registration for component "${route.component}"`);
  }

  return {
    ...route,
    component: toLazyComponent(loader),
  } satisfies LazyFeatureRoute;
});

export const lazyFeatureRouteMap: Record<string, LazyFeatureRoute['component']> = lazyFeatureRoutes.reduce(
  (acc, route) => {
    acc[route.route] = route.component;
    return acc;
  },
  {} as Record<string, LazyFeatureRoute['component']>,
);

export type LazyFeatureRouteMap = typeof lazyFeatureRouteMap;
