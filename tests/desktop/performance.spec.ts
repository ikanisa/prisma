import { test, expect } from '@playwright/test';

/**
 * Performance test suite for desktop app
 * Validates performance targets from Phase 5
 */

test.describe('Desktop Performance Benchmarks', () => {
  test('should measure initial load performance', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      return {
        navigation: performance.getEntriesByType('navigation')[0],
        paint: performance.getEntriesByType('paint'),
      };
    });

    console.log('Performance Metrics:');
    console.log(`- DOM Content Loaded: ${(metrics.navigation as any).domContentLoadedEventEnd}ms`);
    console.log(`- Load Complete: ${(metrics.navigation as any).loadEventEnd}ms`);
    console.log(`- First Paint: ${metrics.paint[0]?.startTime}ms`);
    console.log(`- First Contentful Paint: ${metrics.paint[1]?.startTime}ms`);

    expect((metrics.navigation as any).domContentLoadedEventEnd).toBeLessThan(3000);
  });

  test('should measure memory footprint', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const memoryMetrics = await page.evaluate(() => {
      if ((performance as any).memory) {
        const mem = (performance as any).memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryMetrics) {
      const usedMB = memoryMetrics.usedJSHeapSize / 1024 / 1024;
      const totalMB = memoryMetrics.totalJSHeapSize / 1024 / 1024;
      const limitMB = memoryMetrics.jsHeapSizeLimit / 1024 / 1024;

      console.log('\nMemory Metrics:');
      console.log(`- Used JS Heap: ${usedMB.toFixed(2)} MB`);
      console.log(`- Total JS Heap: ${totalMB.toFixed(2)} MB`);
      console.log(`- JS Heap Limit: ${limitMB.toFixed(2)} MB`);
      console.log(`- Usage: ${((usedMB / limitMB) * 100).toFixed(2)}%`);

      expect(usedMB).toBeLessThan(150);
    }
  });

  test('should measure route transition performance', async ({ page }) => {
    await page.goto('/');

    const routes = [
      { path: '/documents', name: 'Documents' },
      { path: '/clients', name: 'Clients' },
      { path: '/reports', name: 'Reports' },
      { path: '/', name: 'Home' },
    ];

    const timings: Record<string, number> = {};

    for (const route of routes) {
      const start = Date.now();
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      const duration = Date.now() - start;

      timings[route.name] = duration;
      console.log(`${route.name} navigation: ${duration}ms`);

      expect(duration).toBeLessThan(1000);
    }

    const avgTime = Object.values(timings).reduce((a, b) => a + b, 0) / routes.length;
    console.log(`\nAverage navigation time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(800);
  });

  test('should measure render performance', async ({ page }) => {
    await page.goto('/');

    const renderMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        requestAnimationFrame((timestamp) => {
          const entries = performance.getEntriesByType('measure');
          resolve({
            timestamp,
            measures: entries.map(e => ({
              name: e.name,
              duration: e.duration,
            })),
          });
        });
      });
    });

    console.log('Render metrics:', renderMetrics);
  });

  test('should have acceptable Time to Interactive', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle');

    const tti = Date.now() - startTime;
    console.log(`Time to Interactive: ${tti}ms`);

    expect(tti).toBeLessThan(3000);
  });

  test('should measure JavaScript bundle execution time', async ({ page }) => {
    await page.goto('/');

    const scriptMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const scripts = resources.filter(r => r.initiatorType === 'script');

      return scripts.map(script => ({
        name: script.name.split('/').pop(),
        duration: script.duration,
        size: script.transferSize,
      }));
    });

    console.log('\nScript Execution Metrics:');
    scriptMetrics.forEach(script => {
      console.log(`- ${script.name}: ${script.duration.toFixed(2)}ms (${(script.size / 1024).toFixed(2)} KB)`);
    });

    const totalDuration = scriptMetrics.reduce((sum, s) => sum + s.duration, 0);
    expect(totalDuration).toBeLessThan(2000);
  });

  test('should track Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const webVitals = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const vitals: any = {};

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (simulated)
        vitals.FID = 0;

        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          let cls = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
          vitals.CLS = cls;
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => resolve(vitals), 2000);
      });
    });

    console.log('\nCore Web Vitals:');
    console.log(`- LCP (Largest Contentful Paint): ${webVitals.LCP?.toFixed(2)}ms`);
    console.log(`- FID (First Input Delay): ${webVitals.FID}ms`);
    console.log(`- CLS (Cumulative Layout Shift): ${webVitals.CLS?.toFixed(4)}`);

    // Good LCP is < 2500ms
    if (webVitals.LCP) {
      expect(webVitals.LCP).toBeLessThan(2500);
    }

    // Good CLS is < 0.1
    if (webVitals.CLS !== undefined) {
      expect(webVitals.CLS).toBeLessThan(0.1);
    }
  });

  test('should monitor offline sync performance', async ({ page, context }) => {
    await page.goto('/');

    // Queue operations while offline
    await context.setOffline(true);

    const operations = 10;
    const startQueue = Date.now();

    for (let i = 0; i < operations; i++) {
      // Simulate queuing operations
      await page.evaluate((idx) => {
        localStorage.setItem(`pending-op-${idx}`, JSON.stringify({
          type: 'create',
          data: { id: idx },
          timestamp: Date.now(),
        }));
      }, i);
    }

    const queueTime = Date.now() - startQueue;
    console.log(`\nQueued ${operations} operations in ${queueTime}ms`);
    expect(queueTime).toBeLessThan(100);

    // Measure sync time
    await context.setOffline(false);
    const startSync = Date.now();

    // Wait for sync indicator
    const syncStatus = page.locator('[data-testid="sync-status"]');
    const hasSyncStatus = await syncStatus.isVisible().catch(() => false);

    if (hasSyncStatus) {
      await expect(syncStatus).toContainText(/synced/i, { timeout: 15000 });
      const syncTime = Date.now() - startSync;
      console.log(`Sync completed in ${syncTime}ms`);
      expect(syncTime).toBeLessThan(10000);
    }

    // Cleanup
    await page.evaluate((ops) => {
      for (let i = 0; i < ops; i++) {
        localStorage.removeItem(`pending-op-${i}`);
      }
    }, operations);
  });

  test('should measure app responsiveness under load', async ({ page }) => {
    await page.goto('/');

    // Simulate rapid interactions
    const interactions = 20;
    const timings: number[] = [];

    for (let i = 0; i < interactions; i++) {
      const start = performance.now();
      await page.click('body');
      const duration = performance.now() - start;
      timings.push(duration);
    }

    const avgResponseTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxResponseTime = Math.max(...timings);

    console.log(`\nResponsiveness Metrics:`);
    console.log(`- Average response: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`- Max response: ${maxResponseTime.toFixed(2)}ms`);

    expect(avgResponseTime).toBeLessThan(100);
    expect(maxResponseTime).toBeLessThan(200);
  });
});

test.describe('Desktop Resource Usage', () => {
  test('should monitor network requests', async ({ page }) => {
    const requests: any[] = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`\nTotal requests: ${requests.length}`);
    
    const byType = requests.reduce((acc, req) => {
      acc[req.resourceType] = (acc[req.resourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Requests by type:', byType);

    // Should be reasonable number of requests
    expect(requests.length).toBeLessThan(100);
  });

  test('should track bundle sizes', async ({ page }) => {
    await page.goto('/');

    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries.map(e => ({
        name: e.name.split('/').pop(),
        type: e.initiatorType,
        size: e.transferSize,
        encoded: e.encodedBodySize,
        decoded: e.decodedBodySize,
      }));
    });

    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalSizeMB = totalSize / 1024 / 1024;

    console.log(`\nTotal resources transferred: ${totalSizeMB.toFixed(2)} MB`);

    const largestBundles = resources
      .filter(r => r.type === 'script')
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    console.log('Largest bundles:');
    largestBundles.forEach(bundle => {
      console.log(`- ${bundle.name}: ${(bundle.size / 1024).toFixed(2)} KB`);
    });
  });
});
