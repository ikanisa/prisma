/**
 * @prisma/ui
 * 
 * Shared UI components and utilities.
 */

// Core components
export { VirtualList } from './VirtualList';
export { LazyRoute } from './LazyRoute';

// Lazy loading utilities
export {
  LazyComponent,
  LoadingSkeleton,
  ErrorFallback,
  preloadComponent,
  usePreloadOnHover,
  usePreloadOnVisible,
} from './LazyComponent';

// Utilities
export { cn } from './utils';

// Re-export primitives for convenience
export * from './primitives';

// Dashboard components (Phase 3A)
export * from './dashboard';

// Workspace components (Phase 3B)
export * from './workspace';

// Mobile PWA components (Phase 3C)
export * from './mobile';
