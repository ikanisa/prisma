'use client';

import { Plus, Search, ClipboardList, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const workingPapers = [
    {
        id: '1',
        ref: 'A100',
        title: 'Audit Planning Memorandum',
        engagement: 'Acme Corporation',
        status: 'approved',
        preparer: 'JD',
        reviewer: 'MK',
        lastModified: '2025-01-02',
    },
    {
        id: '2',
        ref: 'B200',
        title: 'Risk Assessment',
        engagement: 'Acme Corporation',
        status: 'review',
        preparer: 'JD',
        reviewer: null,
        lastModified: '2025-01-03',
    },
    {
        id: '3',
        ref: 'C300',
        title: 'Revenue Testing',
        engagement: 'Acme Corporation',
        status: 'draft',
        preparer: 'AS',
        reviewer: null,
        lastModified: '2025-01-03',
    },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    draft: { icon: Clock, color: 'text-gray-500', label: 'Draft' },
    review: { icon: AlertCircle, color: 'text-yellow-500', label: 'Needs Review' },
    approved: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
};

export default function WorkingPapersPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Working Papers</h1>
                    <p className="text-muted-foreground">ISA-based templates with AI assistance</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    New Working Paper
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search working papers..."
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Working Papers Table */}
            <div className="rounded-xl border bg-card">
                <div className="grid grid-cols-[80px,2fr,1fr,1fr,1fr,120px] gap-4 border-b px-6 py-3 text-sm font-medium text-muted-foreground">
                    <div>Ref</div>
                    <div>Title</div>
                    <div>Status</div>
                    <div>Preparer</div>
                    <div>Reviewer</div>
                    <div>Modified</div>
                </div>
                <div className="divide-y">
                    {workingPapers.map((wp) => {
                        const { icon: StatusIcon, color, label } = statusConfig[wp.status];
                        return (
                            <div
                                key={wp.id}
                                className="grid grid-cols-[80px,2fr,1fr,1fr,1fr,120px] gap-4 items-center px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <div className="font-mono text-sm font-medium">{wp.ref}</div>
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{wp.title}</p>
                                        <p className="text-xs text-muted-foreground">{wp.engagement}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusIcon className={`h-4 w-4 ${color}`} />
                                    <span className="text-sm">{label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                        {wp.preparer}
                                    </div>
                                </div>
                                <div>
                                    {wp.reviewer ? (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
                                            {wp.reviewer}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {new Date(wp.lastModified).toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
