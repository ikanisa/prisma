'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';

export type AuditNavItem = {
  href: Route;
  label: string;
  description?: string;
};

const baseClasses =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors';
const activeClasses = 'bg-slate-900 text-white shadow-sm';
const inactiveClasses = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

export function AuditNavigation({ items }: { items: AuditNavItem[] }) {
  const pathname = usePathname();
  const currentPath = pathname ?? '';

  return (
    <nav aria-label="Audit workspace sections">
      <ul className="flex flex-wrap gap-2">
        {items.map(item => {
          const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} className={clsx(baseClasses, isActive ? activeClasses : inactiveClasses)}>
                <span>{item.label}</span>
                {item.description ? (
                  <span className="hidden text-xs font-normal text-slate-400 sm:inline">{item.description}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
