import { notFound } from 'next/navigation';
import { SupabaseAuthDemo } from '@/src/features/auth/components/supabase-auth-demo';

if (process.env.NODE_ENV === 'production' && process.env.ANALYZE !== 'true') {
  notFound();
}

export default function SupabaseAuthDemoPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6" aria-labelledby="supabase-auth-demo-heading">
      <header className="space-y-2">
        <h1 id="supabase-auth-demo-heading" className="text-2xl font-semibold text-foreground">
          Supabase auth playground
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Use this page to validate browser authentication flows against the configured Supabase project or the
          in-memory stub when credentials are unavailable.
        </p>
      </header>

      <SupabaseAuthDemo />
    </main>
  );
}
