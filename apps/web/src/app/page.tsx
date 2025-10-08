import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Sparkles, UserRound } from "lucide-react";

const features = [
  {
    title: "Role-aware navigation",
    description:
      "Jump into dedicated admin and member experiences with sensible defaults for permissions.",
  },
  {
    title: "PWA-ready foundation",
    description:
      "Offline caching, install prompts, and theming hooks are set up so you can ship quickly.",
  },
  {
    title: "Composable UI",
    description:
      "Tailwind CSS and shadcn/ui are pre-configured for rapid iteration on your product surface.",
  },
];

const roles = [
  {
    name: "Administrators",
    description:
      "Configure organizations, audit activity, and deploy guardrails for sensitive operations.",
    href: "/admin",
    accent: "text-cyan-500",
    icon: ShieldCheck,
  },
  {
    name: "Members",
    description:
      "Give teammates a curated workspace that surfaces tasks, announcements, and support options.",
    href: "/user",
    accent: "text-emerald-500",
    icon: UserRound,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 pb-24 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pt-24 sm:px-12">
        <header className="space-y-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            <Sparkles className="h-4 w-4" aria-hidden />
            PWA scaffold ready
          </span>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Build a modern role-based experience in minutes
            </h1>
            <p className="mx-auto max-w-3xl text-base text-slate-300 sm:text-lg">
              Prisma Glow ships with a Next.js 14 app directory project, Tailwind CSS, and shadcn/ui.
              Use this starter to bootstrap authentication-aware layouts, installable PWAs, and
              reusable UI primitives without starting from scratch.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/admin">
                Explore admin console
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-600 text-slate-100">
              <Link href="/user">
                Visit member workspace
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-left shadow-lg shadow-slate-950/40"
            >
              <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-slate-800/60 bg-slate-900/40 p-8 md:grid-cols-2">
          {roles.map((role) => (
            <div key={role.name} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`rounded-full bg-slate-800/80 p-3 ${role.accent}`}>
                  <role.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-xl font-semibold">{role.name}</h3>
              </div>
              <p className="text-sm text-slate-300">{role.description}</p>
              <Button asChild variant="ghost" className="px-0 text-sm text-slate-200 hover:text-white">
                <Link href={role.href}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
