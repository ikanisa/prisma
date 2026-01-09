/**
 * Month-End Close Page
 * 
 * FloQast-style month-end close checklist with automated tasks,
 * progress tracking, and reconciliation status.
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, Clock, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ChecklistItem {
    id: string;
    name: string;
    category: 'preparation' | 'reconciliation' | 'adjustments' | 'review' | 'finalization';
    order: number;
    status: 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'blocked';
    estimatedMinutes: number;
    actualMinutes?: number;
    automationLevel: 'manual' | 'semi_auto' | 'fully_auto';
    assignee?: string;
}

interface CloseChecklist {
    id: string;
    period: string;
    status: 'not_started' | 'in_progress' | 'pending_review' | 'closed';
    items: ChecklistItem[];
    targetCloseDate: string;
    startedAt?: string;
    closedAt?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockChecklist: CloseChecklist = {
    id: 'cl-2026-01',
    period: '2026-01',
    status: 'in_progress',
    targetCloseDate: '2026-01-10',
    startedAt: '2026-01-09T08:00:00Z',
    items: [
        { id: '1', name: 'Ensure all transactions posted', category: 'preparation', order: 1, status: 'completed', estimatedMinutes: 30, actualMinutes: 15, automationLevel: 'fully_auto' },
        { id: '2', name: 'Review open purchase orders', category: 'preparation', order: 2, status: 'completed', estimatedMinutes: 20, actualMinutes: 18, automationLevel: 'semi_auto' },
        { id: '3', name: 'Post pending invoices', category: 'preparation', order: 3, status: 'in_progress', estimatedMinutes: 45, automationLevel: 'semi_auto' },
        { id: '4', name: 'Bank reconciliation - Operating', category: 'reconciliation', order: 4, status: 'not_started', estimatedMinutes: 30, automationLevel: 'fully_auto' },
        { id: '5', name: 'Bank reconciliation - Payroll', category: 'reconciliation', order: 5, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
        { id: '6', name: 'Credit card reconciliation', category: 'reconciliation', order: 6, status: 'not_started', estimatedMinutes: 20, automationLevel: 'fully_auto' },
        { id: '7', name: 'Accounts receivable aging', category: 'reconciliation', order: 7, status: 'not_started', estimatedMinutes: 25, automationLevel: 'semi_auto' },
        { id: '8', name: 'Accounts payable aging', category: 'reconciliation', order: 8, status: 'not_started', estimatedMinutes: 25, automationLevel: 'semi_auto' },
        { id: '9', name: 'Calculate depreciation', category: 'adjustments', order: 9, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
        { id: '10', name: 'Accrue payroll', category: 'adjustments', order: 10, status: 'not_started', estimatedMinutes: 20, automationLevel: 'semi_auto' },
        { id: '11', name: 'Variance analysis', category: 'review', order: 11, status: 'not_started', estimatedMinutes: 45, automationLevel: 'fully_auto' },
        { id: '12', name: 'Generate financial statements', category: 'finalization', order: 12, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
        { id: '13', name: 'Lock period', category: 'finalization', order: 13, status: 'not_started', estimatedMinutes: 5, automationLevel: 'fully_auto' },
    ],
};

// ============================================================================
// COMPONENTS
// ============================================================================

function getStatusIcon(status: ChecklistItem['status']) {
    switch (status) {
        case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'in_progress': return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
        case 'pending_review': return <AlertCircle className="h-5 w-5 text-amber-500" />;
        case 'blocked': return <AlertCircle className="h-5 w-5 text-red-500" />;
        default: return <Circle className="h-5 w-5 text-gray-300" />;
    }
}

function getAutomationBadge(level: ChecklistItem['automationLevel']) {
    switch (level) {
        case 'fully_auto': return <Badge variant="default" className="text-xs">Auto</Badge>;
        case 'semi_auto': return <Badge variant="secondary" className="text-xs">Semi-Auto</Badge>;
        default: return <Badge variant="outline" className="text-xs">Manual</Badge>;
    }
}

function ChecklistItemRow({
    item,
    onStatusChange
}: {
    item: ChecklistItem;
    onStatusChange: (id: string, status: ChecklistItem['status']) => void;
}) {
    const canStart = item.status === 'not_started';
    const canComplete = item.status === 'in_progress';

    return (
        <div className={`flex items-center gap-4 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${item.status === 'completed' ? 'opacity-60' : ''
            }`}>
            <div className="flex-shrink-0">
                {getStatusIcon(item.status)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-medium ${item.status === 'completed' ? 'line-through' : ''}`}>
                        {item.name}
                    </span>
                    {getAutomationBadge(item.automationLevel)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Est: {item.estimatedMinutes}m</span>
                    {item.actualMinutes && <span>Actual: {item.actualMinutes}m</span>}
                    {item.assignee && <span>Assigned: {item.assignee}</span>}
                </div>
            </div>

            <div className="flex-shrink-0 flex gap-2">
                {canStart && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStatusChange(item.id, 'in_progress')}
                    >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                    </Button>
                )}
                {canComplete && (
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => onStatusChange(item.id, 'completed')}
                    >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                    </Button>
                )}
            </div>
        </div>
    );
}

function ProgressSummary({ checklist }: { checklist: CloseChecklist }) {
    const total = checklist.items.length;
    const completed = checklist.items.filter(i => i.status === 'completed').length;
    const inProgress = checklist.items.filter(i => i.status === 'in_progress').length;
    const percentComplete = Math.round((completed / total) * 100);

    const remaining = checklist.items.filter(i => i.status !== 'completed');
    const estimatedMinutesRemaining = remaining.reduce((sum, i) => sum + i.estimatedMinutes, 0);

    const automated = checklist.items.filter(i => i.automationLevel === 'fully_auto').length;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Close Progress</CardTitle>
                <CardDescription>January 2026</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Overall Progress</span>
                            <span className="font-medium">{percentComplete}%</span>
                        </div>
                        <Progress value={percentComplete} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-600">{completed}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-2xl font-bold">{remaining.length}</div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            <div className="text-2xl font-bold">{Math.round(estimatedMinutesRemaining / 60)}h</div>
                            <div className="text-xs text-muted-foreground">Est. Time Left</div>
                        </div>
                    </div>

                    <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Automated Tasks</span>
                            <span className="font-medium">{automated} of {total}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Target Close Date</span>
                            <span className="font-medium">{checklist.targetCloseDate}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MonthEndClosePage() {
    const [checklist, setChecklist] = useState<CloseChecklist>(mockChecklist);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const handleStatusChange = (itemId: string, newStatus: ChecklistItem['status']) => {
        setChecklist(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.id === itemId
                    ? {
                        ...item,
                        status: newStatus,
                        actualMinutes: newStatus === 'completed' ? item.estimatedMinutes : item.actualMinutes
                    }
                    : item
            ),
        }));
    };

    const filteredItems = activeCategory === 'all'
        ? checklist.items
        : checklist.items.filter(i => i.category === activeCategory);

    const categories = ['all', 'preparation', 'reconciliation', 'adjustments', 'review', 'finalization'];

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Month-End Close</h1>
                    <p className="text-muted-foreground">
                        Manage your close process with automated workflows
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                    <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Run All Auto
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Progress Sidebar */}
                <div className="lg:col-span-1">
                    <ProgressSummary checklist={checklist} />
                </div>

                {/* Checklist */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Close Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                                    {categories.map(cat => (
                                        <TabsTrigger
                                            key={cat}
                                            value={cat}
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary capitalize"
                                        >
                                            {cat === 'all' ? 'All' : cat}
                                            {cat !== 'all' && (
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    {checklist.items.filter(i => i.category === cat).length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <div className="divide-y">
                                    {filteredItems.map(item => (
                                        <ChecklistItemRow
                                            key={item.id}
                                            item={item}
                                            onStatusChange={handleStatusChange}
                                        />
                                    ))}
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
