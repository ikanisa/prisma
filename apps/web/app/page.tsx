import Link from 'next/link';
import type { Route } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Button } from '@prisma-glow/ui';

export default function Home() {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/agent-chat', label: 'Agent Chat' },
    { href: '/engagements', label: 'Engagements' },
    { href: '/accounting', label: 'Accounting' },
    { href: '/audit/specialists', label: 'Audit Specialists' },
    { href: '/audit/controls', label: 'Audit Controls' },
    { href: '/tax', label: 'Tax' },
    { href: '/client-portal', label: 'Client Portal' },
    { href: '/agent/approvals', label: 'Agent Approvals' },
    { href: '/agent/orchestrator', label: 'Agent Orchestrator' },
    { href: '/agent/domain-tools', label: 'Agent Domain Tools' },
  ] satisfies Array<{ href: Route; label: string }>;
  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Welcome</h1>
      <div className="mb-4">
        <Button onClick={() => console.log('hello')}>
          Quick Action
        </Button>
      </div>
      <nav>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link className="text-blue-600 underline" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
