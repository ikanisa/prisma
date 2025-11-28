import { lazy, Suspense, ComponentType } from 'react';

interface LazyRouteProps {
  factory: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}
  >
    <div
      style={{
        width: '2rem',
        height: '2rem',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #7C3AED',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  </div>
);

export function LazyRoute({ factory, fallback }: LazyRouteProps) {
  const Component = lazy(factory);
  
  return (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <Component />
    </Suspense>
  );
}
