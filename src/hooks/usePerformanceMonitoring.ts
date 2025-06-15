
import { useEffect, useRef } from 'react';
import { analyticsService } from '@/services/analyticsService';

export const usePerformanceMonitoring = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRender.current) {
      const loadTime = Date.now() - startTime.current;
      
      // Track component load time
      analyticsService.trackEvent('component_load_time', {
        component: componentName,
        load_time_ms: loadTime
      });

      isFirstRender.current = false;
    }
  }, [componentName]);

  const trackUserAction = (action: string, data?: Record<string, any>) => {
    analyticsService.trackEvent('user_action', {
      component: componentName,
      action,
      ...data
    });
  };

  return { trackUserAction };
};
