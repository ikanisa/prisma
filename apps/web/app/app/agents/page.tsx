'use client';

import { Bot, Play, CheckCircle, Clock, FileText, Sparkles } from 'lucide-react';

const agents = [
    {
        id: 'audit-planning',
        name: 'Audit Planning Agent',
        purpose: 'Generates planning memo, risk register, and ISA 315 mapping',
        inputs: ['Trial Balance', 'Prior Year FS', 'Entity Info'],
        outputs: ['Planning Memo', 'Risk Register', 'Materiality'],
        lastRun: '2025-01-03',
        confidence: 0.92,
        status: 'ready',
    },
    {
        id: 'tax-computation',
        name: 'Tax Computation Agent',
        purpose: 'Builds tax computation pack from GL data',
        inputs: ['General Ledger', 'Tax Categories'],
        outputs: ['Computation Pack', 'Adjustment Schedule'],
        lastRun: '2025-01-02',
        confidence: 0.88,
        status: 'ready',
    },
    {
        id: 'document-classifier',
        name: 'Document Classifier',
        purpose: 'Auto-classifies uploaded documents',
        inputs: ['Document Files'],
        outputs: ['Classifications', 'Extracted Fields'],
        lastRun: '2025-01-03',
        confidence: 0.95,
        status: 'running',
    },
];

export default function AgentsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agents</h1>
                    <p className="text-muted-foreground">AI agents organized by outcomes</p>
                </div>
            </div>

            {/* Agent Cards */}
            <div className="grid gap-4 lg:grid-cols-2">
                {agents.map((agent) => (
                    <div key={agent.id} className="rounded-xl border bg-card p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{agent.name}</h3>
                                    <p className="text-sm text-muted-foreground">{agent.purpose}</p>
                                </div>
                            </div>
                            {agent.status === 'running' ? (
                                <span className="flex items-center gap-1 text-sm text-yellow-600">
                                    <Clock className="h-4 w-4 animate-pulse" />
                                    Running
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-sm text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    Ready
                                </span>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Inputs</p>
                                <div className="flex flex-wrap gap-1">
                                    {agent.inputs.map((input) => (
                                        <span key={input} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                            {input}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Outputs</p>
                                <div className="flex flex-wrap gap-1">
                                    {agent.outputs.map((output) => (
                                        <span key={output} className="rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 text-xs">
                                            {output}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Last run: {agent.lastRun}</span>
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {Math.round(agent.confidence * 100)}% confidence
                                </span>
                            </div>
                            <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                                <Play className="h-3.5 w-3.5" />
                                Run
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
