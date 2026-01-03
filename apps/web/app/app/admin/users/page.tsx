'use client';

import { Plus, Search, Users, Shield, MoreHorizontal } from 'lucide-react';

const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'SYSTEM_ADMIN', status: 'active' },
    { id: '2', name: 'Mary Kim', email: 'mary@example.com', role: 'MANAGER', status: 'active' },
    { id: '3', name: 'Alex Smith', email: 'alex@example.com', role: 'STAFF', status: 'active' },
];

const roleColors: Record<string, string> = {
    SYSTEM_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    STAFF: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminUsersPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users & Access</h1>
                    <p className="text-muted-foreground">Manage team members and permissions</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Invite User
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Users Table */}
            <div className="rounded-xl border bg-card">
                <div className="grid grid-cols-[2fr,1fr,1fr,50px] gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
                    <div>User</div>
                    <div>Role</div>
                    <div>Status</div>
                    <div></div>
                </div>
                <div className="divide-y">
                    {users.map((user) => (
                        <div key={user.id} className="grid grid-cols-[2fr,1fr,1fr,50px] gap-4 items-center px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}>
                                    {user.role.replace('_', ' ')}
                                </span>
                            </div>
                            <div>
                                <span className="flex items-center gap-1 text-sm text-green-600">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    Active
                                </span>
                            </div>
                            <button className="rounded-lg p-2 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
