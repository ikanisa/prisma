import Link from 'next/link';

const LEGACY_CONSOLE_URL = 'https://legacy.prismaglow.app/reporting/kam';

export default function KamLegacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Key audit matters live in the legacy console</h1>
      <p className="mt-4 text-slate-600">
        The modern Prisma Glow interface will soon include full KAM authoring and review. For now, please switch back to the
        legacy console to manage disclosures and audit committee responses.
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
