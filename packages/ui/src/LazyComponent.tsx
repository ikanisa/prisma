/**
 * Enhanced lazy loading component with preloading support.
 */
import React, { Suspense, useEffect, ComponentType, ReactNode } from 'react';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Default loading skeleton for lazy-loaded components.
 */
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Error boundary fallback for lazy-loaded components.
 */
export function ErrorFallback({ error, resetError }: { error: Error; resetError?: () => void }) {
  return (
    <div className="p-6 text-center">
      <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Wrapper for lazy-loaded components with Suspense.
 */
export function LazyComponent({ children, fallback = <LoadingSkeleton /> }: LazyComponentProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Preload a lazy component on hover or when visible.
 * Call this on route link hover for faster navigation.
 */
export function preloadComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  // Start the dynamic import to cache the module
  importFn().catch(() => {
    // Ignore preload errors - the actual load will handle them
  });
}

/**
 * Hook for preloading components when a link is hovered.
 */
export function usePreloadOnHover(importFn: () => Promise<{ default: ComponentType<any> }>) {
  const handleMouseEnter = () => {
    preloadComponent(importFn);
  };

  return { onMouseEnter: handleMouseEnter };
}

/**
 * Intersection Observer hook for preloading when component is near viewport.
 */
export function usePreloadOnVisible(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: IntersectionObserverInit = { rootMargin: '200px' }
) {
  const ref = React.useRef<HTMLElement>(null);
  const preloaded = React.useRef(false);

  useEffect(() => {
    if (!ref.current || preloaded.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !preloaded.current) {
          preloaded.current = true;
          preloadComponent(importFn);
          observer.disconnect();
        }
      },
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [importFn, options]);

  return ref;
}

