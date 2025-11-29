'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  CheckSquare,
  Users,
  Calculator,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Accounting', href: '/accounting', icon: Calculator },
  { label: 'Audit', href: '/audit', icon: ClipboardCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="text-xl font-bold text-primary">
            Prisma Glow
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Admin Console →
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Staff User</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
