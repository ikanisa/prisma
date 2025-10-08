import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { BarChart3, ShieldCheck, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

const quickActions: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "Review organization settings",
    description: "Manage authentication, billing, and workspace preferences in a single hub.",
    href: "/admin/settings",
    icon: ShieldCheck,
  },
  {
    title: "Audit member access",
    description: "Track invitations, pending approvals, and fine-grained permissions by role.",
    href: "/admin/members",
    icon: Users2,
  },
  {
    title: "Monitor engagement",
    description: "Stay informed with real-time dashboards that highlight adoption trends and alerts.",
    href: "/admin/analytics",
    icon: BarChart3,
  },
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-500">
          Admin area
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Guide administrators through critical setup tasks
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          This section of the application is reserved for team members with elevated privileges.
          Replace these placeholders with analytics, controls, and guardrails tailored to your
          organization.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">
              Return home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/user">
              Preview member area
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {quickActions.map((action) => (
          <article
            key={action.title}
            className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-400/70 hover:shadow-md"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
              <action.icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="mt-4 space-y-2">
              <h2 className="text-xl font-semibold">{action.title}</h2>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-600 group-hover:text-cyan-500"
            >
              <Link href={action.href}>
                Continue to module
              </Link>
            </Button>
          </article>
        ))}
      </section>
    </main>
  );
}

