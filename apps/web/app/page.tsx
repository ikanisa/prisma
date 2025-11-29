import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Prisma Glow
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered operations suite for modern businesses
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/client/portal"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Client Portal
          </Link>

          <Link
            href="/admin/iam"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-card-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Admin Console
          </Link>
        </div>

        <p className="pt-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Prisma Glow. All rights reserved.
        </p>
      </div>
    </main>
  );
}
