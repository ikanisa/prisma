import { designTokens } from '@prisma-glow/ui';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design Tokens',
};

const colorGroups = [
  { label: 'Brand', scale: designTokens.colors.brand },
  { label: 'Neutral', scale: designTokens.colors.neutral },
  { label: 'Accent', scale: designTokens.colors.accent },
  { label: 'Success', scale: designTokens.colors.semantic.success },
  { label: 'Warning', scale: designTokens.colors.semantic.warning },
  { label: 'Danger', scale: designTokens.colors.semantic.danger },
];

export default function StyleGuidePage() {
  return (
    <main className="space-y-10 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Design Tokens</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Centralized design primitives sourced from <code>@prisma-glow/ui</code>. Use these color scales, radii, and
          typography primitives when building new experiences to ensure consistency across the platform.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Color Scales</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {colorGroups.map((group) => (
            <article key={group.label} className="rounded-lg border border-neutral-100 p-4 shadow-glass">
              <h3 className="text-sm font-medium text-neutral-600">{group.label}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(group.scale).map(([tone, hex]) => (
                  <div key={tone} className="space-y-1">
                    <div
                      className="h-14 rounded-md border border-neutral-100"
                      style={{ backgroundColor: hex }}
                      aria-hidden
                    />
                    <div className="text-xs text-neutral-500">
                      <p className="font-medium text-neutral-700">{tone}</p>
                      <p>{hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Radii</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(designTokens.radii).map(([key, radius]) => (
            <div key={key} className="space-y-2 text-sm">
              <div className="flex h-16 w-16 items-center justify-center border border-neutral-200 bg-neutral-25" style={{ borderRadius: radius }}>
                {key}
              </div>
              <p className="text-xs text-neutral-500">{radius}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Typography</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="space-y-2 rounded-lg border border-neutral-100 p-4">
            <h3 className="text-sm font-medium text-neutral-600">Sans</h3>
            <p className="text-neutral-700" style={{ fontFamily: designTokens.typography.fontFamily.sans.join(', ') }}>
              The quick brown fox jumps over the lazy dog.
            </p>
            <p className="text-xs text-neutral-500">{designTokens.typography.fontFamily.sans.join(', ')}</p>
          </article>
          <article className="space-y-2 rounded-lg border border-neutral-100 p-4">
            <h3 className="text-sm font-medium text-neutral-600">Mono</h3>
            <p className="font-mono text-neutral-700" style={{ fontFamily: designTokens.typography.fontFamily.mono.join(', ') }}>
              0123456789 const sum = (a, b) =&gt; a + b;
            </p>
            <p className="text-xs text-neutral-500">{designTokens.typography.fontFamily.mono.join(', ')}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
