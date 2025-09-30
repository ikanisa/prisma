import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  nodes: number;
}

interface A11yResult {
  route: string;
  skipped: boolean;
  violations: AxeViolation[];
}

const ROUTES = [
  { path: '/tasks', name: 'Tasks' },
  { path: '/documents', name: 'Documents' },
  { path: '/onboarding', name: 'Onboarding' },
  { path: '/autopilot', name: 'Assistant Autopilot' },
];

const ARTIFACT_DIR = join(process.cwd(), 'GO-LIVE', 'artifacts');
const REPORT_PATH = join(ARTIFACT_DIR, 'a11y-axe-report.json');

const results: A11yResult[] = [];

test.beforeAll(() => {
  if (!existsSync(ARTIFACT_DIR)) {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
});

test.describe('Accessibility', () => {
  for (const route of ROUTES) {
    test(`${route.name} keyboard + axe`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // Keyboard focus smoke test
      await page.keyboard.press('Tab');
      const activeElementTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
      expect(activeElementTag, `${route.name}: first tab stop should not be body`).not.toBeNull();
      expect(activeElementTag).not.toBe('BODY');

      let axeLoaded = true;
      try {
        await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.7.0/axe.min.js' });
      } catch (error) {
        console.warn(`[a11y] axe-core could not be loaded for ${route.path}:`, error);
        axeLoaded = false;
      }

      if (!axeLoaded) {
        results.push({ route: route.path, skipped: true, violations: [] });
        test.skip(`axe-core unavailable for ${route.name}`);
      }

      const axeResults = await page.evaluate(async () => {
        if (!(window as any).axe) {
          return null;
        }
        const run = await (window as any).axe.run(document, {
          reporter: 'v2',
          resultTypes: ['violations'],
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa'],
          },
        });
        return run;
      });

      if (!axeResults) {
        results.push({ route: route.path, skipped: true, violations: [] });
        test.skip(`axe-core was not injected for ${route.name}`);
      }

      const seriousViolations: AxeViolation[] = (axeResults!.violations ?? [])
        .filter((violation: any) => violation.impact === 'critical' || violation.impact === 'serious')
        .map((violation: any) => {
          console.warn('[a11y]', route.path, violation.id, violation.nodes.map((node: any) => node.target));
          return {
            id: violation.id,
            impact: violation.impact ?? null,
            description: violation.description,
            nodes: violation.nodes.length,
          };
        });

      results.push({ route: route.path, skipped: false, violations: seriousViolations });

      expect(seriousViolations, `${route.name}: no serious/critical accessibility violations`).toHaveLength(0);
    });
  }
});

test.afterAll(() => {
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: results,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(payload, null, 2));
});
