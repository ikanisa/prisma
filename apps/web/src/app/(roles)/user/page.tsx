import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Inbox, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Member workspace",
};

const resources: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "View assigned tasks",
    description: "Track deliverables and due dates tailored to your role across projects.",
    href: "/user/tasks",
    icon: CalendarCheck,
  },
  {
    title: "Check announcements",
    description: "Catch up on the latest updates from administrators and team leads.",
    href: "/user/announcements",
    icon: Inbox,
  },
  {
    title: "Request support",
    description: "Open a ticket or browse help center content curated for your responsibilities.",
    href: "/user/support",
    icon: LifeBuoy,
  },
];

export default function UserPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-500">
          Member area
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Give teammates a clear starting point
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Use this workspace as a staging ground for personalized dashboards, quick links, and
          onboarding content. Replace these modules with integrations that make sense for your
          product.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">
              Return home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">
              Visit admin console
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {resources.map((resource) => (
          <article
            key={resource.title}
            className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-md"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <resource.icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="mt-4 space-y-2">
              <h2 className="text-xl font-semibold">{resource.title}</h2>
              <p className="text-sm text-muted-foreground">
                {resource.description}
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:text-emerald-500"
            >
              <Link href={resource.href}>
                Explore module
              </Link>
            </Button>
          </article>
        ))}
      </section>
    </main>
  );
}

