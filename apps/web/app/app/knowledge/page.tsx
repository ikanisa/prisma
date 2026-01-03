'use client';

import { BookOpen, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';

const sources = [
    {
        id: '1',
        name: 'International Standards on Auditing (ISA)',
        type: 'Standard',
        documents: 45,
        lastSync: '2025-01-01',
        status: 'synced',
    },
    {
        id: '2',
        name: 'IFRS Standards',
        type: 'Standard',
        documents: 32,
        lastSync: '2025-01-02',
        status: 'synced',
    },
    {
        id: '3',
        name: 'Malta Tax Legislation',
        type: 'Tax Law',
        documents: 28,
        lastSync: '2024-12-28',
        status: 'update_available',
    },
    {
        id: '4',
        name: 'Firm Audit Methodology',
        type: 'Methodology',
        documents: 15,
        lastSync: '2025-01-03',
        status: 'synced',
    },
];

export default function KnowledgePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Knowledge</h1>
                    <p className="text-muted-foreground">Standards, legislation, and firm methodology</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                    <RefreshCw className="h-4 w-4" />
                    Sync All
                </button>
            </div>

            {/* Knowledge Sources */}
            <div className="grid gap-4 lg:grid-cols-2">
                {sources.map((source) => (
                    <div key={source.id} className="rounded-xl border bg-card p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{source.name}</h3>
                                    <p className="text-sm text-muted-foreground">{source.type}</p>
                                </div>
                            </div>
                            {source.status === 'synced' ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                    Update available
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {source.documents} documents · Last sync: {source.lastSync}
                            </span>
                            <button className="flex items-center gap-1 text-primary hover:underline">
                                Browse <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
