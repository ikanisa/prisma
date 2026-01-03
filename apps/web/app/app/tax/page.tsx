'use client';

import { Plus, Search, FileText, Calculator, AlertTriangle } from 'lucide-react';

const taxJobs = [
    {
        id: '1',
        client: 'Acme Corporation',
        type: 'Corporate Income Tax',
        period: 'FY 2024',
        status: 'in_progress',
        deadline: '2025-03-31',
        adjustments: 5,
    },
    {
        id: '2',
        client: 'TechStart Inc.',
        type: 'VAT Return',
        period: 'Q4 2024',
        status: 'review',
        deadline: '2025-01-31',
        adjustments: 2,
    },
    {
        id: '3',
        client: 'Global Traders LLC',
        type: 'PAYE',
        period: 'Dec 2024',
        status: 'filed',
        deadline: '2025-01-15',
        adjustments: 0,
    },
];

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    filed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function TaxPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tax</h1>
                    <p className="text-muted-foreground">Tax returns, compliance packs, and filings</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    New Tax Job
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search tax jobs..."
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Tax Jobs */}
            <div className="rounded-xl border bg-card">
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,100px] gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
                    <div>Client / Type</div>
                    <div>Period</div>
                    <div>Status</div>
                    <div>Deadline</div>
                    <div>Adjustments</div>
                    <div></div>
                </div>
                <div className="divide-y">
                    {taxJobs.map((job) => (
                        <div
                            key={job.id}
                            className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,100px] gap-4 items-center px-6 py-4 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                                    <Calculator className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-medium">{job.client}</p>
                                    <p className="text-sm text-muted-foreground">{job.type}</p>
                                </div>
                            </div>
                            <div className="text-sm">{job.period}</div>
                            <div>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[job.status]}`}>
                                    {job.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {new Date(job.deadline).toLocaleDateString()}
                            </div>
                            <div>
                                {job.adjustments > 0 ? (
                                    <span className="flex items-center gap-1 text-sm text-yellow-600">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {job.adjustments}
                                    </span>
                                ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                )}
                            </div>
                            <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
                                View
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
