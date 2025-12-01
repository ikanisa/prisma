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
import type { UserRole } from '@/components/features/auth/auth-provider';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const staffNavigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Accounting', href: '/accounting', icon: Calculator },
  { label: 'Audit', href: '/audit', icon: ClipboardCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const adminNavigation: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin', icon: Shield },
  { label: 'IAM', href: '/admin/iam', icon: Users },
  { label: 'Agents', href: '/admin/agents', icon: Bot },
  { label: 'Workflows', href: '/admin/workflows', icon: GitBranch },
  { label: 'Telemetry', href: '/admin/telemetry', icon: BarChart },
  { label: 'Knowledge', href: '/admin/knowledge', icon: BookOpen },
];

export const clientNavigation: NavItem[] = [
  { label: 'Portal Home', href: '/portal', icon: Home },
  { label: 'Documents', href: '/portal/documents', icon: FileText },
  { label: 'Requests', href: '/portal/requests', icon: CheckSquare },
];

export function getNavigationForRole(role: UserRole): {
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

export function isNavItemActive(
  pathname: string,
  href: string
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
