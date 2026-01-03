'use client';

import { useCommand } from '@/components/features/command';
import {
    Briefcase,
    FileText,
    Upload,
    HelpCircle,
    Sparkles,
    AlertTriangle,
    Clock,
    ArrowRight,
} from 'lucide-react';

const intentTiles = [
    {
        id: 'audit',
        icon: Briefcase,
        title: 'Start an Audit',
        description: 'Create new audit engagement',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    {
        id: 'tax',
        icon: FileText,
        title: 'Start Tax Return',
        description: 'Begin tax compliance work',
        color: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    {
        id: 'upload',
        icon: Upload,
        title: 'Upload Documents',
        description: 'Add files to process',
        color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    {
        id: 'ask',
        icon: HelpCircle,
        title: 'Ask a Question',
        description: 'Get AI assistance',
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
];

const nextActions = [
    {
        id: 1,
        title: 'Complete risk assessment for Acme Corp',
        type: 'Audit',
        priority: 'high',
        engagement: 'Acme Corp FY2025',
    },
    {
        id: 2,
        title: 'Review VAT computation pack',
        type: 'Tax',
        priority: 'medium',
        engagement: 'TechStart Q4 2024',
    },
    {
        id: 3,
        title: 'Upload missing bank statements',
        type: 'Documents',
        priority: 'high',
        engagement: 'Global Traders Ltd',
    },
];

const exceptions = [
    {
        id: 1,
        title: 'Missing confirmation letter',
        engagement: 'Acme Corp FY2025',
        deadline: '2 days',
    },
    {
        id: 2,
        title: 'Revenue anomaly detected',
        engagement: 'TechStart Q4 2024',
        deadline: 'Review needed',
    },
];

export default function AIWorkspaceHome() {
    const { open } = useCommand();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">What do you want to do?</h1>
                <p className="text-muted-foreground">
                    Start from intent. AI will guide you through the process.
                </p>
            </div>

            {/* Intent Tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {intentTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <button
                            key={tile.id}
                            onClick={() => {
                                if (tile.id === 'ask') {
                                    open();
                                }
                            }}
                            className={`flex flex-col items-start rounded-xl border p-5 text-left transition-all hover:shadow-md ${tile.color}`}
                        >
                            <Icon className="h-8 w-8 mb-3" />
                            <h3 className="font-semibold">{tile.title}</h3>
                            <p className="text-sm opacity-80">{tile.description}</p>
                        </button>
                    );
                })}
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Next Best Actions */}
                <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2 border-b p-4">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold">Your Next Best Actions</h2>
                        <span className="ml-auto text-xs text-muted-foreground">AI-prioritized</span>
                    </div>
                    <div className="divide-y">
                        {nextActions.map((action) => (
                            <div key={action.id} className="flex items-center gap-4 p-4">
                                <div
                                    className={`h-2 w-2 rounded-full ${action.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}
                                />
                                <div className="flex-1">
                                    <p className="font-medium">{action.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {action.type} · {action.engagement}
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Exceptions Needing Attention */}
                <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2 border-b p-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <h2 className="font-semibold">Exceptions Needing Attention</h2>
                    </div>
                    <div className="divide-y">
                        {exceptions.map((exception) => (
                            <div key={exception.id} className="flex items-center gap-4 p-4">
                                <div className="flex-1">
                                    <p className="font-medium">{exception.title}</p>
                                    <p className="text-sm text-muted-foreground">{exception.engagement}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {exception.deadline}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
