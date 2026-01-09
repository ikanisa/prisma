/**
 * AI Dashboard Page
 * 
 * Real-time AI processing status, pending reviews, and anomaly alerts.
 */

'use client';

import { ProcessingStatusCard } from '@/components/ai/ProcessingStatusCard';
import { PendingReviewsCard } from '@/components/ai/PendingReviewsCard';
import { AnomalyAlertsCard } from '@/components/ai/AnomalyAlertsCard';

export default function AIDashboardPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">AI Dashboard</h1>
                    <p className="text-muted-foreground">
                        Monitor autonomous transaction processing and AI performance
                    </p>
                </div>
            </div>

            {/* Processing Status */}
            <ProcessingStatusCard />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Reviews */}
                <PendingReviewsCard />

                {/* Anomaly Alerts */}
                <AnomalyAlertsCard />
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Auto-Process Rate"
                    value="94.2%"
                    target="95%"
                    trend="up"
                />
                <MetricCard
                    title="Avg Confidence"
                    value="91.5%"
                    target="95%"
                    trend="stable"
                />
                <MetricCard
                    title="User Corrections"
                    value="3.2%"
                    target="<5%"
                    trend="down"
                />
                <MetricCard
                    title="Processing Time"
                    value="1.2s"
                    target="<2s"
                    trend="stable"
                />
            </div>
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string;
    target: string;
    trend: 'up' | 'down' | 'stable';
}

function MetricCard({ title, value, target, trend }: MetricCardProps) {
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

    return (
        <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">{value}</span>
                <span className={`text-sm ${trendColor}`}>{trendIcon}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: {target}</p>
        </div>
    );
}
