import type { ReactNode } from 'react';
import { AuditApprovalsBanner } from '@/components/audit/approvals-banner';
import { AuditNavigation, type AuditNavItem } from '@/components/audit/navigation';

const AUDIT_NAV_ITEMS: AuditNavItem[] = [
  { to: 'controls', label: 'Controls' },
  { to: 'analytics', label: 'Analytics' },
  { to: 'reconciliations', label: 'Reconciliations' },
  { to: 'group', label: 'Group' },
  { to: 'service-orgs', label: 'Service Orgs' },
  { to: 'specialists', label: 'Specialists' },
  { to: 'other-information', label: 'Other Info' },
];

export function AuditWorkspaceLayout({ children }: { children: ReactNode }) {
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
          <AuditNavigation items={AUDIT_NAV_ITEMS} />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
