'use client';

import { type ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCommand } from '@/components/features/command';
import { cn } from '@/lib/utils';
import {
    Home,
    Briefcase,
    FileText,
    ClipboardList,
    Calculator,
    Bot,
    BookOpen,
    FileBarChart,
    History,
    Settings,
    Users,
    ChevronRight,
    Command,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';

// Navigation items with permission requirements
interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    permission?: 'system_admin' | 'manager' | 'staff' | 'all';
}

const navigation: NavItem[] = [
    { label: 'Home', href: '/app', icon: Home, permission: 'all' },
    { label: 'Engagements', href: '/app/engagements', icon: Briefcase, permission: 'all' },
    { label: 'Documents', href: '/app/documents', icon: FileText, permission: 'all' },
    { label: 'Working Papers', href: '/app/working-papers', icon: ClipboardList, permission: 'all' },
    { label: 'Tax', href: '/app/tax', icon: Calculator, permission: 'all' },
    { label: 'Agents', href: '/app/agents', icon: Bot, permission: 'all' },
    { label: 'Knowledge', href: '/app/knowledge', icon: BookOpen, permission: 'all' },
    { label: 'Reports', href: '/app/reports', icon: FileBarChart, permission: 'all' },
    { label: 'Audit Trail', href: '/app/audit-trail', icon: History, permission: 'manager' },
    { label: 'Settings', href: '/app/settings', icon: Settings, permission: 'all' },
];

const adminNavigation: NavItem[] = [
    { label: 'Users & Access', href: '/app/admin/users', icon: Users, permission: 'system_admin' },
];

type UserRole = 'SYSTEM_ADMIN' | 'MANAGER' | 'STAFF' | 'CLIENT';

function canAccess(role: UserRole | null, permission: NavItem['permission']): boolean {
    if (permission === 'all') return true;
    if (!role) return false;
    if (role === 'SYSTEM_ADMIN') return true;
    if (permission === 'manager' && (role === 'MANAGER' || role === 'SYSTEM_ADMIN')) return true;
    if (permission === 'staff') return true;
    return false;
}

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { open: openCommand } = useCommand();
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isCopilotOpen, setIsCopilotOpen] = useState(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email ?? null);
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.role as UserRole || 'STAFF');
                }
            } catch {
                // Supabase not configured
            }
        }
        loadUser();
    }, []);

    const visibleNav = navigation.filter((item) => canAccess(userRole, item.permission));
    const visibleAdminNav = adminNavigation.filter((item) => canAccess(userRole, item.permission));

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="flex w-64 flex-col border-r bg-card">
                {/* Logo */}
                <div className="flex h-14 items-center gap-2 border-b px-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">Prisma Glow</span>
                </div>

                {/* Command bar trigger */}
                <button
                    onClick={openCommand}
                    className="mx-3 mt-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                    <Command className="h-4 w-4" />
                    <span className="flex-1 text-left">What do you want to do?</span>
                    <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
                </button>

                {/* Main Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {visibleNav.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/app' && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* Admin section */}
                    {visibleAdminNav.length > 0 && (
                        <>
                            <div className="my-4 border-t" />
                            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Admin
                            </p>
                            {visibleAdminNav.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>

                {/* User info */}
                <div className="border-t p-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                        <p className="truncate text-sm font-medium">{userEmail || 'Loading...'}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {userRole?.toLowerCase().replace('_', ' ') || 'Staff'}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-14 items-center justify-between border-b bg-card px-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {/* Breadcrumb could go here */}
                    </div>
                    <button
                        onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                            isCopilotOpen
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted'
                        )}
                    >
                        <Bot className="h-4 w-4" />
                        AI Copilot
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isCopilotOpen && 'rotate-180')} />
                    </button>
                </header>

                {/* Content + Copilot */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Main Canvas */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>

                    {/* AI Copilot Panel */}
                    {isCopilotOpen && (
                        <aside className="w-80 border-l bg-card overflow-hidden flex flex-col">
                            <div className="border-b p-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold">AI Copilot</h3>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Context-aware assistant
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {/* Copilot content will be rendered here */}
                                <div className="space-y-4">
                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Actions</p>
                                        <button className="w-full rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted transition-colors">
                                            <p className="font-medium">Start new engagement</p>
                                            <p className="text-xs text-muted-foreground mt-1">Create audit or tax job</p>
                                        </button>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Ask AI</p>
                                        <button
                                            onClick={openCommand}
                                            className="w-full rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted transition-colors"
                                        >
                                            <p className="text-muted-foreground">Type a question...</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}
