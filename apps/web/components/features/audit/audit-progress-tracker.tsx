'use client';

/**
 * Audit Progress Tracker
 * 
 * Visual tracker for audit engagement progress across phases and standards.
 */

import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface AuditPhase {
    id: string;
    name: string;
    status: 'complete' | 'in_progress' | 'pending';
    progress: number;
    procedures: AuditProcedure[];
}

interface AuditProcedure {
    id: string;
    ref: string;
    title: string;
    status: 'complete' | 'in_progress' | 'pending' | 'blocked';
    assignee?: string;
    dueDate?: Date;
    workpaperRef?: string;
}

interface RiskItem {
    id: string;
    description: string;
    level: 'low' | 'medium' | 'high';
    assertion: string;
    response?: string;
}

interface AuditProgressTrackerProps {
    engagementId?: string;
    onProcedureClick?: (procedureId: string) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockPhases: AuditPhase[] = [
    {
        id: 'planning',
        name: 'Planning',
        status: 'complete',
        progress: 100,
        procedures: [
            { id: 'p1', ref: 'ISA315.11', title: 'Understand the entity', status: 'complete', workpaperRef: 'A1-1' },
            { id: 'p2', ref: 'ISA315.25', title: 'Risk assessment', status: 'complete', workpaperRef: 'A2-1' },
            { id: 'p3', ref: 'ISA320.10', title: 'Determine materiality', status: 'complete', workpaperRef: 'A3-1' },
        ],
    },
    {
        id: 'interim',
        name: 'Interim Testing',
        status: 'in_progress',
        progress: 65,
        procedures: [
            { id: 'i1', ref: 'ISA330.6', title: 'Test of controls - Revenue', status: 'complete', workpaperRef: 'B1-1' },
            { id: 'i2', ref: 'ISA330.7', title: 'Test of controls - Purchasing', status: 'in_progress', assignee: 'John S.', workpaperRef: 'B2-1' },
            { id: 'i3', ref: 'ISA330.8', title: 'Test of controls - Payroll', status: 'pending' },
            { id: 'i4', ref: 'ISA500.6', title: 'Walkthrough testing', status: 'complete', workpaperRef: 'B3-1' },
        ],
    },
    {
        id: 'substantive',
        name: 'Substantive Testing',
        status: 'pending',
        progress: 15,
        procedures: [
            { id: 's1', ref: 'ISA500.9', title: 'Accounts receivable confirmations', status: 'in_progress', dueDate: new Date('2026-02-15') },
            { id: 's2', ref: 'ISA501.4', title: 'Inventory observation', status: 'blocked', dueDate: new Date('2026-01-31') },
            { id: 's3', ref: 'ISA540.12', title: 'Evaluate accounting estimates', status: 'pending' },
            { id: 's4', ref: 'ISA570.10', title: 'Going concern evaluation', status: 'pending' },
        ],
    },
    {
        id: 'completion',
        name: 'Completion',
        status: 'pending',
        progress: 0,
        procedures: [
            { id: 'c1', ref: 'ISA450.5', title: 'Evaluate misstatements', status: 'pending' },
            { id: 'c2', ref: 'ISA260.9', title: 'Communicate with TCWG', status: 'pending' },
            { id: 'c3', ref: 'ISA700.10', title: 'Form audit opinion', status: 'pending' },
        ],
    },
];

const mockRisks: RiskItem[] = [
    { id: 'r1', description: 'Revenue cutoff', level: 'high', assertion: 'Cutoff', response: 'Extended cutoff testing' },
    { id: 'r2', description: 'Inventory valuation', level: 'medium', assertion: 'Valuation', response: 'NRV testing' },
    { id: 'r3', description: 'Related party completeness', level: 'high', assertion: 'Completeness', response: 'Inquiry and confirmation' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function PhaseCard({ phase, onClick }: { phase: AuditPhase; onClick: (id: string) => void }) {
    const getStatusColor = (status: AuditPhase['status']) => {
        switch (status) {
            case 'complete': return 'bg-green-500';
            case 'in_progress': return 'bg-blue-500';
            default: return 'bg-gray-300';
        }
    };

    const getProcedureStatusIcon = (status: AuditProcedure['status']) => {
        switch (status) {
            case 'complete': return '✅';
            case 'in_progress': return '🔄';
            case 'blocked': return '🚫';
            default: return '⏳';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{phase.name}</h4>
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(phase.status)}`}>
                    {phase.progress}%
                </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                    className={`h-2 rounded-full ${getStatusColor(phase.status)}`}
                    style={{ width: `${phase.progress}%` }}
                />
            </div>

            <div className="space-y-2">
                {phase.procedures.map((proc) => (
                    <div
                        key={proc.id}
                        onClick={() => onClick(proc.id)}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition"
                    >
                        <div className="flex items-center gap-2">
                            <span>{getProcedureStatusIcon(proc.status)}</span>
                            <div>
                                <span className="text-xs text-gray-500">{proc.ref}</span>
                                <p className="text-sm">{proc.title}</p>
                            </div>
                        </div>
                        {proc.workpaperRef && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {proc.workpaperRef}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function RiskMatrix({ risks }: { risks: RiskItem[] }) {
    const getLevelColor = (level: RiskItem['level']) => {
        switch (level) {
            case 'high': return 'bg-red-100 text-red-700 border-red-300';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            default: return 'bg-green-100 text-green-700 border-green-300';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
                <span>⚠️</span>
                Identified Risks
            </h4>
            <div className="space-y-2">
                {risks.map((risk) => (
                    <div key={risk.id} className={`p-3 rounded border ${getLevelColor(risk.level)}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{risk.description}</p>
                                <p className="text-sm opacity-75">Assertion: {risk.assertion}</p>
                            </div>
                            <span className="text-xs uppercase font-bold">{risk.level}</span>
                        </div>
                        {risk.response && (
                            <p className="text-xs mt-2 opacity-75">→ {risk.response}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProgressSummary({ phases }: { phases: AuditPhase[] }) {
    const totalProcedures = phases.reduce((sum, p) => sum + p.procedures.length, 0);
    const completedProcedures = phases.reduce(
        (sum, p) => sum + p.procedures.filter(pr => pr.status === 'complete').length,
        0
    );
    const inProgressProcedures = phases.reduce(
        (sum, p) => sum + p.procedures.filter(pr => pr.status === 'in_progress').length,
        0
    );
    const blockedProcedures = phases.reduce(
        (sum, p) => sum + p.procedures.filter(pr => pr.status === 'blocked').length,
        0
    );

    const overallProgress = Math.round((completedProcedures / totalProcedures) * 100);

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold">Audit Engagement Progress</h3>
                    <p className="text-indigo-200">FY2025 Financial Statement Audit</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold">{overallProgress}%</div>
                    <p className="text-indigo-200">Complete</p>
                </div>
            </div>

            <div className="w-full bg-indigo-400 bg-opacity-30 rounded-full h-3 mb-4">
                <div
                    className="h-3 rounded-full bg-white"
                    style={{ width: `${overallProgress}%` }}
                />
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold">{completedProcedures}</div>
                    <p className="text-xs text-indigo-200">Complete</p>
                </div>
                <div>
                    <div className="text-2xl font-bold">{inProgressProcedures}</div>
                    <p className="text-xs text-indigo-200">In Progress</p>
                </div>
                <div>
                    <div className="text-2xl font-bold">{blockedProcedures}</div>
                    <p className="text-xs text-yellow-300">Blocked</p>
                </div>
                <div>
                    <div className="text-2xl font-bold">{totalProcedures - completedProcedures - inProgressProcedures}</div>
                    <p className="text-xs text-indigo-200">Pending</p>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditProgressTracker({ engagementId, onProcedureClick }: AuditProgressTrackerProps) {
    const [phases] = useState<AuditPhase[]>(mockPhases);
    const [risks] = useState<RiskItem[]>(mockRisks);

    const handleProcedureClick = (procedureId: string) => {
        onProcedureClick?.(procedureId);
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <ProgressSummary phases={phases} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {phases.map((phase) => (
                    <PhaseCard key={phase.id} phase={phase} onClick={handleProcedureClick} />
                ))}
            </div>

            <RiskMatrix risks={risks} />
        </div>
    );
}

export default AuditProgressTracker;
