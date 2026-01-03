'use client';

import { useState } from 'react';
import { Upload, Search, FileText, FileSpreadsheet, File, MoreHorizontal, Sparkles } from 'lucide-react';

const documents = [
    {
        id: '1',
        name: 'Trial Balance FY2024.xlsx',
        type: 'spreadsheet',
        classification: 'Trial Balance',
        engagement: 'Acme Corporation',
        uploaded: '2025-01-02',
        status: 'processed',
    },
    {
        id: '2',
        name: 'Bank Statement Dec 2024.pdf',
        type: 'pdf',
        classification: 'Bank Statement',
        engagement: 'Acme Corporation',
        uploaded: '2025-01-02',
        status: 'processed',
    },
    {
        id: '3',
        name: 'Sales Invoices Q4.zip',
        type: 'archive',
        classification: 'Invoices',
        engagement: 'TechStart Inc.',
        uploaded: '2025-01-01',
        status: 'processing',
    },
];

const typeIcons: Record<string, React.ElementType> = {
    spreadsheet: FileSpreadsheet,
    pdf: FileText,
    archive: File,
};

export default function DocumentsPage() {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documents</h1>
                    <p className="text-muted-foreground">AI-powered document inbox and viewer</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload Documents
                </button>
            </div>

            {/* AI Classification Banner */}
            <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-primary/5 to-purple-500/5 p-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                    <p className="font-medium">AI Document Processing</p>
                    <p className="text-sm text-muted-foreground">
                        Documents are automatically classified, extracted, and linked to engagements
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Documents Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => {
                    const Icon = typeIcons[doc.type] || FileText;
                    return (
                        <div key={doc.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <button className="rounded-lg p-1 hover:bg-muted">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-3">
                                <p className="font-medium truncate">{doc.name}</p>
                                <p className="text-sm text-muted-foreground">{doc.engagement}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                    {doc.classification}
                                </span>
                                <span className={`text-xs ${doc.status === 'processed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {doc.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
