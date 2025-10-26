import Link from 'next/link';

const LEGACY_CONSOLE_URL = 'https://legacy.prismaglow.app/reporting/report';

export default function ReportLegacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">SOC report drafting is not yet available here</h1>
      <p className="mt-4 text-slate-600">
        Continue to manage report sections, note disclosures, and PDF exports in the legacy console. We will migrate these
        features into the agent-native workflow later this quarter.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={LEGACY_CONSOLE_URL}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Open legacy console
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
