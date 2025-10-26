import { themeTokens } from '@prisma-glow/ui';

const colorGroups = Object.entries(themeTokens.colors);
const spacingTokens = Object.entries(themeTokens.spacing);
const radiusTokens = Object.entries(themeTokens.radii);

// eslint-disable-next-line react-refresh/only-export-components -- Next.js metadata export required
export const metadata = {
  title: 'Design tokens',
};

export default function StyleGuidePage() {
  return (
    <main className="space-y-12 bg-background p-8" aria-labelledby="style-guide-heading">
      <header className="space-y-2">
        <h1 id="style-guide-heading" className="text-3xl font-semibold text-foreground">
          Prisma Glow design tokens
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Centralised tokens sourced from <code className="rounded bg-muted px-2 py-1 text-xs">@prisma-glow/ui</code>. Use these
          primitives to keep brand, typography, and spacing consistent across applications.
        </p>
      </header>

      <section aria-labelledby="color-system" className="space-y-6">
        <div>
          <h2 id="color-system" className="text-2xl font-semibold text-foreground">
            Colour palette
          </h2>
          <p className="text-sm text-muted-foreground">
            Each swatch lists the semantic token and the hexadecimal value exposed via Tailwind&apos;s theme extension.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {colorGroups.map(([group, values]) => (
            <article key={group} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <h3 className="text-lg font-semibold capitalize text-foreground">{group}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {Object.entries(values).map(([token, hex]) => (
                  <div key={token} className="space-y-2">
                    <div className="h-16 w-full rounded-lg border border-border/50" style={{ backgroundColor: String(hex) }} />
                    <dl className="space-y-1 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        <dt>{token}</dt>
                      </div>
                      <dd className="font-mono">{hex}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="spacing-system" className="space-y-6">
        <div>
          <h2 id="spacing-system" className="text-2xl font-semibold text-foreground">
            Spacing scale
          </h2>
          <p className="text-sm text-muted-foreground">
            Reference spacing tokens when composing layouts or configuring component gaps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {spacingTokens.map(([token, size]) => (
            <div key={token} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-sm font-medium text-foreground">{token}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{size}</p>
              <div className="mt-3 h-2 rounded-full bg-brand-200" style={{ width: size }} />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="radius-system" className="space-y-6">
        <div>
          <h2 id="radius-system" className="text-2xl font-semibold text-foreground">
            Border radius tokens
          </h2>
          <p className="text-sm text-muted-foreground">
            Apply these radii directly via Tailwind classes such as <code className="rounded bg-muted px-1 py-0.5 text-xs">rounded-md</code> or
            <code className="rounded bg-muted px-1 py-0.5 text-xs">rounded-xl</code> to remain consistent.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {radiusTokens.map(([token, radius]) => (
            <div key={token} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <p className="text-sm font-medium text-foreground">{token}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{radius}</p>
              <div className="mt-3 h-16 w-full border border-dashed border-brand-200" style={{ borderRadius: String(radius) }} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
