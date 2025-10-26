import Link from 'next/link';

const LEGACY_CONSOLE_URL = 'https://legacy.prismaglow.app/reporting/controls';

export default function ControlsLegacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Controls reporting is handled in the legacy console</h1>
      <p className="mt-4 text-slate-600">
        We are still migrating the end-to-end controls workflow into this Next.js experience. Until that work is complete, please
        launch the legacy console to review testing results, walkthrough evidence, and deficiency tracking.
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
