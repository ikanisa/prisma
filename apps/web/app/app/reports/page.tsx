'use client';

import { FileBarChart, Download, Calendar } from 'lucide-react';

const reports = [
    {
        id: '1',
        name: 'Audit File Pack',
        description: 'Complete audit file with all working papers',
        type: 'Audit',
    },
    {
        id: '2',
        name: 'Tax Computation Pack',
        description: 'Tax computation with schedules and adjustments',
        type: 'Tax',
    },
    {
        id: '3',
        name: 'Management Letter',
        description: 'Summary of findings and recommendations',
        type: 'Audit',
    },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Reports & Exports</h1>
                <p className="text-muted-foreground">Generate deliverables and export packs</p>
            </div>

            {/* Report Types */}
            <div className="grid gap-4 lg:grid-cols-3">
                {reports.map((report) => (
                    <div key={report.id} className="rounded-xl border bg-card p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                            <FileBarChart className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">{report.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                        <button className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline">
                            <Download className="h-4 w-4" />
                            Generate
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
