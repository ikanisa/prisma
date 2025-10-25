'use client';

import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react';
import { logger } from '@/lib/logger';

interface BoundaryProps {
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      logger.error('async_boundary.caught_error', { error, info });
    }
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      return typeof fallback === 'function' ? fallback(error, this.reset) : fallback;
    }

    return children;
  }
}

interface AsyncBoundaryProps {
  children: ReactNode;
  pendingFallback: ReactNode;
  errorFallback?: BoundaryProps['fallback'];
}

export function AsyncBoundary({ children, pendingFallback, errorFallback }: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback ?? ((error) => <p role="alert">{error.message}</p>)}>
      <Suspense fallback={pendingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
