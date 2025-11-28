import { Stack } from '@/components/layout/Stack';
import { Grid } from '@/components/layout/Grid';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, Home, Plus, Trash2 } from 'lucide-react';
import { AnimatedPage } from '@/components/layout/AnimatedPage';

export function ComponentShowcase() {
  return (
    <AnimatedPage>
      <Container size="lg" className="py-8">
        <Stack direction="vertical" gap="xl">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Component Showcase
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              All available components in the Prisma Glow design system
            </p>
          </div>

          {/* Buttons */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Buttons
            </h2>
            <Stack direction="horizontal" gap="md">
              <Button variant="default">Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </Stack>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              Sizes
            </h3>
            <Stack direction="horizontal" gap="md" align="center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Stack>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              With Icons & Loading
            </h3>
            <Stack direction="horizontal" gap="md">
              <Button>
                <Plus className="h-4 w-4" />
                Create New
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button loading>Loading...</Button>
            </Stack>
          </section>

          {/* Badges */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Badges
            </h2>
            <Stack direction="horizontal" gap="md" align="center">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </Stack>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              Sizes
            </h3>
            <Stack direction="horizontal" gap="md" align="center">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
            </Stack>
          </section>

          {/* Skeletons */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Skeleton Loaders
            </h2>
            <Stack direction="vertical" gap="md">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Stack>
          </section>

          {/* DataCards */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Data Cards
            </h2>
            <Grid cols={3} gap="md">
              <DataCard hoverable>
                <DataCard.Header>Active Users</DataCard.Header>
                <DataCard.Metric value="1,234" trend="up" trendValue="+12%" />
                <DataCard.Footer>
                  <Badge variant="success">All time high</Badge>
                </DataCard.Footer>
              </DataCard>

              <DataCard hoverable>
                <DataCard.Header>Revenue</DataCard.Header>
                <DataCard.Metric value="$45,231" trend="up" trendValue="+8.2%" />
                <DataCard.Footer>
                  <Badge variant="info">This month</Badge>
                </DataCard.Footer>
              </DataCard>

              <DataCard loading>
                <DataCard.Header>Loading...</DataCard.Header>
                <DataCard.Metric value={0} />
              </DataCard>
            </Grid>
          </section>

          {/* Empty State */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Empty State
            </h2>
            <DataCard>
              <EmptyState
                icon={Home}
                title="No items found"
                description="Get started by creating your first item."
                action={{
                  label: 'Create Item',
                  onClick: () => console.log('Create clicked'),
                }}
              />
            </DataCard>
          </section>

          {/* Layout Examples */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Layout Components
            </h2>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              Stack (Vertical)
            </h3>
            <DataCard>
              <Stack direction="vertical" gap="sm">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded">Item 1</div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded">Item 2</div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded">Item 3</div>
              </Stack>
            </DataCard>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              Stack (Horizontal)
            </h3>
            <DataCard>
              <Stack direction="horizontal" gap="sm">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded">Item A</div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded">Item B</div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded">Item C</div>
              </Stack>
            </DataCard>

            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mt-6 mb-4">
              Grid (Auto-fit)
            </h3>
            <Grid cols={4} gap="md">
              {[1, 2, 3, 4].map((i) => (
                <DataCard key={i}>
                  <DataCard.Header>Grid Item {i}</DataCard.Header>
                  <DataCard.Content>Responsive grid layout</DataCard.Content>
                </DataCard>
              ))}
            </Grid>
          </section>

          {/* Color Palette */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Color Palette
            </h2>
            <DataCard>
              <h3 className="font-medium mb-3">Primary (Purple)</h3>
              <div className="grid grid-cols-9 gap-2 mb-6">
                {[50, 100, 200, 300, 400, 500, 600, 700, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div
                      className={`h-12 rounded mb-1 bg-primary-${shade}`}
                      style={{ backgroundColor: `var(--color-primary-${shade})` }}
                    />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{shade}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-medium mb-3">Semantic Colors</h3>
              <Stack direction="horizontal" gap="md">
                <div className="text-center flex-1">
                  <div className="h-12 rounded bg-green-500 mb-1" />
                  <span className="text-xs">Success</span>
                </div>
                <div className="text-center flex-1">
                  <div className="h-12 rounded bg-yellow-500 mb-1" />
                  <span className="text-xs">Warning</span>
                </div>
                <div className="text-center flex-1">
                  <div className="h-12 rounded bg-red-500 mb-1" />
                  <span className="text-xs">Error</span>
                </div>
                <div className="text-center flex-1">
                  <div className="h-12 rounded bg-blue-500 mb-1" />
                  <span className="text-xs">Info</span>
                </div>
              </Stack>
            </DataCard>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Typography Scale
            </h2>
            <DataCard>
              <Stack direction="vertical" gap="md">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Display</div>
                  <div className="text-display font-bold">The quick brown fox</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Heading</div>
                  <div className="text-heading font-semibold">The quick brown fox</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Body</div>
                  <div className="text-body">The quick brown fox jumps over the lazy dog</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Small</div>
                  <div className="text-small">The quick brown fox jumps over the lazy dog</div>
                </div>
              </Stack>
            </DataCard>
          </section>
        </Stack>
      </Container>
    </AnimatedPage>
  );
}
