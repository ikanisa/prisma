import type { ReactNode } from 'react';
import { AuditNavigation, type AuditNavItem } from '../../components/audit/navigation';
import { AuditApprovalsBanner } from '../../components/audit/approvals-banner';

const NAV_ITEMS: AuditNavItem[] = [
  { href: '/audit/controls', label: 'Controls' },
  { href: '/audit/analytics', label: 'Analytics' },
  { href: '/audit/reconciliations', label: 'Reconciliations' },
  { href: '/audit/group', label: 'Group' },
  { href: '/audit/service-orgs', label: 'Service Orgs' },
  { href: '/audit/specialists', label: 'Specialists' },
  { href: '/audit/other-information', label: 'Other Info' },
];

export default function AuditLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Audit workspace</h1>
            <p className="text-sm text-slate-600">
              Navigate between fieldwork modules, track approvals, and keep documentation aligned to ISA requirements.
            </p>
          </div>
          <AuditApprovalsBanner />
          <AuditNavigation items={NAV_ITEMS} />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}
