'use client';

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
  Bot,
  GitBranch,
  BarChart,
  Shield,
  BookOpen,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, type UserRole } from '@/components/features/auth/auth-provider';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const staffNavigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Accounting', href: '/accounting', icon: Calculator },
  { label: 'Audit', href: '/audit', icon: ClipboardCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin', icon: Shield },
  { label: 'IAM', href: '/admin/iam', icon: Users },
  { label: 'Agents', href: '/admin/agents', icon: Bot },
  { label: 'Workflows', href: '/admin/workflows', icon: GitBranch },
  { label: 'Telemetry', href: '/admin/telemetry', icon: BarChart },
  { label: 'Knowledge', href: '/admin/knowledge', icon: BookOpen },
];

const clientNavigation: NavItem[] = [
  { label: 'Portal Home', href: '/portal', icon: Home },
  { label: 'Documents', href: '/portal/documents', icon: FileText },
  { label: 'Requests', href: '/portal/requests', icon: CheckSquare },
];

function getNavigationForRole(role: UserRole): {
  main: NavItem[];
  admin?: NavItem[];
} {
  switch (role) {
    case 'admin':
      return { main: staffNavigation, admin: adminNavigation };
    case 'staff':
      return { main: staffNavigation };
    case 'client':
      return { main: clientNavigation };
    default:
      return { main: staffNavigation };
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const navigation = getNavigationForRole(role);

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="text-xl font-bold text-primary">
          Prisma Glow
        </Link>
        {role === 'admin' && (
          <span className="ml-2 rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
            Admin
          </span>
        )}
        {role === 'client' && (
          <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            Client
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigation.main.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {navigation.admin && (
          <>
            <div className="my-4 border-t border-border" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            <div className="space-y-1">
              {navigation.admin.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.email || 'Guest'}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {role || 'User'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
