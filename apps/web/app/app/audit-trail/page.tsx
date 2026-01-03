'use client';

import { History, FileText, Bot, User, Check, Upload } from 'lucide-react';

const auditEvents = [
    {
        id: '1',
        type: 'approval',
        title: 'Planning memo approved',
        user: 'MK',
        engagement: 'Acme Corporation',
        timestamp: '2025-01-03 14:32',
    },
    {
        id: '2',
        type: 'agent_run',
        title: 'Risk Assessment Agent completed',
        user: 'System',
        engagement: 'Acme Corporation',
        timestamp: '2025-01-03 14:28',
    },
    {
        id: '3',
        type: 'upload',
        title: 'Bank statements uploaded (3 files)',
        user: 'JD',
        engagement: 'TechStart Inc.',
        timestamp: '2025-01-03 13:15',
    },
    {
        id: '4',
        type: 'change',
        title: 'Materiality updated from $50K to $45K',
        user: 'MK',
        engagement: 'Acme Corporation',
        timestamp: '2025-01-03 11:42',
    },
];

const typeIcons: Record<string, React.ElementType> = {
    approval: Check,
    agent_run: Bot,
    upload: Upload,
    change: FileText,
};

const typeColors: Record<string, string> = {
    approval: 'bg-green-500/10 text-green-500',
    agent_run: 'bg-purple-500/10 text-purple-500',
    upload: 'bg-blue-500/10 text-blue-500',
    change: 'bg-yellow-500/10 text-yellow-500',
};

export default function AuditTrailPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Audit Trail</h1>
                    <p className="text-muted-foreground">Immutable log of all system events</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                    Export Log
                </button>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border bg-card">
                <div className="divide-y">
                    {auditEvents.map((event) => {
                        const Icon = typeIcons[event.type] || History;
                        const color = typeColors[event.type] || 'bg-muted text-muted-foreground';
                        return (
                            <div key={event.id} className="flex items-start gap-4 p-4">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{event.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {event.engagement} · {event.user === 'System' ? 'System' : `by ${event.user}`}
                                    </p>
                                </div>
                                <span className="text-sm text-muted-foreground">{event.timestamp}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
