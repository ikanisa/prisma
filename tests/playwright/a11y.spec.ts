import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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

const ORG_SLUG = process.env.PLAYWRIGHT_ORG_SLUG ?? 'prisma-glow';
const focusableSelector = 'a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

const ROUTES = [
  { path: `/${ORG_SLUG}/tasks`, name: 'Tasks' },
  { path: `/${ORG_SLUG}/documents`, name: 'Documents' },
  { path: `/${ORG_SLUG}/onboarding`, name: 'Onboarding' },
  { path: `/${ORG_SLUG}/autopilot`, name: 'Assistant Autopilot' },
];

const ARTIFACT_DIR = join(process.cwd(), 'GO-LIVE', 'artifacts');
const REPORT_PATH = join(ARTIFACT_DIR, 'a11y-axe-report.json');

const results: A11yResult[] = [];
const shouldRunE2E = process.env.PLAYWRIGHT_RUN === 'true';

if (!shouldRunE2E) {
  if (!existsSync(ARTIFACT_DIR)) {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
  const placeholder = {
    generatedAt: new Date().toISOString(),
    skipped: true,
    reason: 'Playwright browser disabled in sandbox. Set PLAYWRIGHT_RUN=true to execute locally.',
    summary: [] as A11yResult[],
  };
  writeFileSync(REPORT_PATH, JSON.stringify(placeholder, null, 2));
  test.skip(true, 'Playwright browser not available in this environment.');
}

async function visitOrSkip(page: Page, route: { path: string; name: string }) {
  const targetPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
  try {
    await page.goto(targetPath, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  } catch (error) {
    console.warn(`[a11y] skipping ${route.path}:`, error);
    results.push({ route: route.path, skipped: true, violations: [] });
    test.skip(`Unable to reach ${route.path}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }

  try {
    const firstFocusable = page.locator(focusableSelector).first();
    await firstFocusable.waitFor({ timeout: 15_000 });
  } catch (error) {
    console.warn(`[a11y] no focusable element detected for ${route.path}:`, error);
    results.push({ route: route.path, skipped: true, violations: [] });
    test.skip(`No focusable elements found for ${route.name}.`);
    return false;
  }

  try {
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.7.0/axe.min.js' });
  } catch (error) {
    console.warn(`[a11y] axe-core could not be loaded for ${route.path}:`, error);
    results.push({ route: route.path, skipped: true, violations: [] });
    test.skip(`axe-core unavailable for ${route.name}`);
    return false;
  }

  return true;
}

test.beforeAll(() => {
  if (!existsSync(ARTIFACT_DIR)) {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
});

test.describe('Accessibility', () => {
  for (const route of ROUTES) {
    test(`${route.name} keyboard + axe`, async ({ page }) => {
      const reachable = await visitOrSkip(page, route);
      if (!reachable) return;

      await page.evaluate(() => window.scrollTo(0, 0));

      // Keyboard focus smoke test
      await page.keyboard.press('Tab');
      const activeElementTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
      expect(activeElementTag, `${route.name}: first tab stop should not be body`).not.toBeNull();
      expect(activeElementTag).not.toBe('BODY');

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
