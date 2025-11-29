'use client';

import { X } from 'lucide-react';
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const navigation = getNavigationForRole(role);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl md:hidden">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/" className="text-xl font-bold text-primary">
            Prisma Glow
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
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
                  onClick={onClose}
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
                      onClick={onClose}
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
      </aside>
    </>
  );
}
