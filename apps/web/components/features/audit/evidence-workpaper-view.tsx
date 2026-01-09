'use client';

/**
 * Evidence Workpaper View
 * 
 * DataSnipper-style evidence management and workpaper automation.
 */

import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Workpaper {
    id: string;
    ref: string;
    title: string;
    status: 'draft' | 'prepared' | 'reviewed' | 'approved';
    preparedBy?: string;
    reviewedBy?: string;
    date: Date;
    evidenceCount: number;
    riskLevel?: 'low' | 'medium' | 'high';
}

interface Evidence {
    id: string;
    type: 'document' | 'confirmation' | 'calculation' | 'observation' | 'inquiry';
    title: string;
    source: string;
    extractedData?: ExtractedData[];
    status: 'pending' | 'extracted' | 'validated' | 'linked';
    confidence?: number;
}

interface ExtractedData {
    field: string;
    value: string | number;
    confidence: number;
    bounds?: { x: number; y: number; width: number; height: number };
}

interface WorkpaperViewProps {
    engagementId?: string;
    onWorkpaperSelect?: (id: string) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockWorkpapers: Workpaper[] = [
    { id: 'w1', ref: 'A1-1', title: 'Planning Memorandum', status: 'approved', preparedBy: 'John S.', reviewedBy: 'Sarah M.', date: new Date('2026-01-05'), evidenceCount: 5, riskLevel: 'medium' },
    { id: 'w2', ref: 'A2-1', title: 'Risk Assessment', status: 'reviewed', preparedBy: 'John S.', reviewedBy: 'Sarah M.', date: new Date('2026-01-08'), evidenceCount: 12, riskLevel: 'high' },
    { id: 'w3', ref: 'B1-1', title: 'Revenue Controls Testing', status: 'prepared', preparedBy: 'Alice K.', date: new Date('2026-01-10'), evidenceCount: 8 },
    { id: 'w4', ref: 'B2-1', title: 'Purchasing Controls Testing', status: 'draft', preparedBy: 'Bob L.', date: new Date('2026-01-12'), evidenceCount: 3 },
    { id: 'w5', ref: 'C1-1', title: 'AR Confirmations', status: 'draft', date: new Date('2026-01-14'), evidenceCount: 0 },
];

const mockEvidence: Evidence[] = [
    {
        id: 'e1', type: 'document', title: 'Bank Statement Dec 2025', source: 'First National Bank', status: 'validated', confidence: 98, extractedData: [
            { field: 'Ending Balance', value: 1250000, confidence: 99 },
            { field: 'Statement Date', value: '2025-12-31', confidence: 100 },
        ]
    },
    {
        id: 'e2', type: 'confirmation', title: 'AR Confirmation - Acme Corp', source: 'Acme Corporation', status: 'linked', confidence: 95, extractedData: [
            { field: 'Confirmed Balance', value: 75000, confidence: 97 },
            { field: 'Confirmation Date', value: '2026-01-10', confidence: 100 },
        ]
    },
    { id: 'e3', type: 'calculation', title: 'Depreciation Recalculation', source: 'AI Generated', status: 'validated', confidence: 100 },
    { id: 'e4', type: 'document', title: 'Invoice #INV-2025-1234', source: 'Vendor X', status: 'extracted', confidence: 92 },
    { id: 'e5', type: 'observation', title: 'Inventory Count Sheet', source: 'Physical Count', status: 'pending' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function WorkpaperList({ workpapers, selectedId, onSelect }: {
    workpapers: Workpaper[];
    selectedId?: string;
    onSelect: (id: string) => void;
}) {
    const getStatusColor = (status: Workpaper['status']) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'reviewed': return 'bg-blue-100 text-blue-700';
            case 'prepared': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getRiskIcon = (level?: Workpaper['riskLevel']) => {
        switch (level) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                    <span>📁</span>
                    Workpapers
                </h3>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
                {workpapers.map((wp) => (
                    <div
                        key={wp.id}
                        onClick={() => onSelect(wp.id)}
                        className={`p-3 cursor-pointer transition ${selectedId === wp.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-500">{wp.ref}</span>
                                    {getRiskIcon(wp.riskLevel)}
                                </div>
                                <p className="font-medium">{wp.title}</p>
                                <p className="text-xs text-gray-500">
                                    {wp.preparedBy && `Prepared: ${wp.preparedBy}`}
                                    {wp.reviewedBy && ` • Reviewed: ${wp.reviewedBy}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(wp.status)}`}>
                                    {wp.status.charAt(0).toUpperCase() + wp.status.slice(1)}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{wp.evidenceCount} items</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
    const getTypeIcon = (type: Evidence['type']) => {
        switch (type) {
            case 'document': return '📄';
            case 'confirmation': return '✉️';
            case 'calculation': return '🧮';
            case 'observation': return '👁️';
            case 'inquiry': return '💬';
            default: return '📎';
        }
    };

    const getStatusBadge = (status: Evidence['status']) => {
        switch (status) {
            case 'linked': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Linked' };
            case 'validated': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Validated' };
            case 'extracted': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Extracted' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' };
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <span>🔗</span>
                    Evidence
                </h3>
                <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                    + Add Evidence
                </button>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
                {evidence.map((ev) => {
                    const status = getStatusBadge(ev.status);
                    return (
                        <div key={ev.id} className="p-3 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <span className="text-2xl">{getTypeIcon(ev.type)}</span>
                                    <div>
                                        <p className="font-medium">{ev.title}</p>
                                        <p className="text-xs text-gray-500">Source: {ev.source}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded ${status.bg} ${status.text}`}>
                                        {status.label}
                                    </span>
                                    {ev.confidence && (
                                        <p className="text-xs text-gray-500 mt-1">{ev.confidence}% confidence</p>
                                    )}
                                </div>
                            </div>

                            {ev.extractedData && ev.extractedData.length > 0 && (
                                <div className="mt-2 ml-9 space-y-1">
                                    {ev.extractedData.map((data, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span className="text-gray-600">{data.field}:</span>
                                            <span className="font-medium">
                                                {typeof data.value === 'number'
                                                    ? `$${data.value.toLocaleString()}`
                                                    : data.value}
                                            </span>
                                            <span className="text-xs text-gray-400">({data.confidence}%)</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ExtractorPanel() {
    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                    <span>🤖</span>
                    AI Extractor
                </h3>
            </div>
            <div className="p-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-2">📤</div>
                    <p className="text-gray-600 mb-2">Drop documents here or click to upload</p>
                    <p className="text-xs text-gray-400">PDF, images, Excel supported</p>
                    <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
                        Select Files
                    </button>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-medium mb-2">Recent Extractions</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Bank Statement Dec 2025</span>
                            <span className="text-green-600">✓ Complete</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Invoice #INV-2025-1234</span>
                            <span className="text-blue-600">Processing...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EvidenceWorkpaperView({ engagementId, onWorkpaperSelect }: WorkpaperViewProps) {
    const [workpapers] = useState<Workpaper[]>(mockWorkpapers);
    const [evidence] = useState<Evidence[]>(mockEvidence);
    const [selectedWorkpaper, setSelectedWorkpaper] = useState<string | undefined>(workpapers[0]?.id);

    const handleSelectWorkpaper = (id: string) => {
        setSelectedWorkpaper(id);
        onWorkpaperSelect?.(id);
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>📋</span>
                    Evidence & Workpapers
                </h2>
                <p className="text-gray-600">DataSnipper-style document extraction and linking</p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <WorkpaperList
                    workpapers={workpapers}
                    selectedId={selectedWorkpaper}
                    onSelect={handleSelectWorkpaper}
                />
                <EvidencePanel evidence={evidence} />
                <ExtractorPanel />
            </div>
        </div>
    );
}

export default EvidenceWorkpaperView;
