'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Briefcase, Calendar, Users, MoreHorizontal } from 'lucide-react';

const engagements = [
    {
        id: '1',
        name: 'Acme Corporation',
        type: 'Financial Audit',
        status: 'in_progress',
        deadline: '2025-03-31',
        staff: ['JD', 'MK'],
        progress: 65,
    },
    {
        id: '2',
        name: 'TechStart Inc.',
        type: 'Tax Compliance',
        status: 'planning',
        deadline: '2025-02-28',
        staff: ['JD'],
        progress: 20,
    },
    {
        id: '3',
        name: 'Global Traders LLC',
        type: 'Internal Audit',
        status: 'completed',
        deadline: '2025-01-15',
        staff: ['MK', 'AS'],
        progress: 100,
    },
];

const statusColors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function EngagementsPage() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Engagements</h1>
                    <p className="text-muted-foreground">Manage audits, tax jobs, and accounting tasks</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    New Engagement
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search engagements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <button className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* Engagements List */}
            <div className="rounded-xl border bg-card">
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr,100px,50px] gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
                    <div>Engagement</div>
                    <div>Status</div>
                    <div>Deadline</div>
                    <div>Progress</div>
                    <div>Team</div>
                    <div></div>
                </div>
                <div className="divide-y">
                    {engagements.map((engagement) => (
                        <div
                            key={engagement.id}
                            className="grid grid-cols-[2fr,1fr,1fr,1fr,100px,50px] gap-4 items-center px-6 py-4 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{engagement.name}</p>
                                    <p className="text-sm text-muted-foreground">{engagement.type}</p>
                                </div>
                            </div>
                            <div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[engagement.status]}`}>
                                    {engagement.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {new Date(engagement.deadline).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-muted">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${engagement.progress}%` }}
                                    />
                                </div>
                                <span className="text-sm text-muted-foreground">{engagement.progress}%</span>
                            </div>
                            <div className="flex -space-x-2">
                                {engagement.staff.map((initials, i) => (
                                    <div
                                        key={i}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium"
                                    >
                                        {initials}
                                    </div>
                                ))}
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
