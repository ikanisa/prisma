/**
 * AI Processing Status Card
 * 
 * Real-time display of AI transaction processing metrics.
 * Shows auto-process rate, pending reviews, and confidence scores.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProcessingStatus {
    autoProcessedCount: number;
    autoProcessedPercent: number;
    pendingReviewCount: number;
    rejectedCount: number;
    avgConfidence: number;
    confidenceTrend: 'up' | 'down' | 'stable';
    totalToday: number;
}

interface MetricProps {
    label: string;
    value: string | number;
    percent?: number;
    trend?: 'up' | 'down' | 'stable';
    highlight?: boolean;
}

function Metric({ label, value, percent, trend, highlight }: MetricProps) {
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : '';

    return (
        <div className={`p-4 rounded-lg ${highlight ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {trend && <span className={`text-sm ${trendColor}`}>{trendIcon}</span>}
            </div>
            {percent !== undefined && (
                <Progress value={percent} className="h-1 mt-2" />
            )}
        </div>
    );
}

async function fetchProcessingStatus(): Promise<ProcessingStatus> {
    // TODO: Replace with actual API call
    // const response = await fetch('/api/ai/processing-status');
    // return response.json();

    // Mock data for development
    return {
        autoProcessedCount: 847,
        autoProcessedPercent: 94.2,
        pendingReviewCount: 12,
        rejectedCount: 3,
        avgConfidence: 91.5,
        confidenceTrend: 'up',
        totalToday: 899,
    };
}

export function ProcessingStatusCard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['ai-processing-status'],
        queryFn: fetchProcessingStatus,
        refetchInterval: 5000, // Refresh every 5 seconds
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        AI Processing Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>AI Processing Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Unable to load processing status</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        AI Processing Status
                    </CardTitle>
                    <Badge variant="secondary">
                        {data.totalToday} transactions today
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Metric
                        label="Auto-Processed Today"
                        value={data.autoProcessedCount}
                        percent={data.autoProcessedPercent}
                        trend="up"
                    />
                    <Metric
                        label="Pending Review"
                        value={data.pendingReviewCount}
                        highlight={data.pendingReviewCount > 10}
                    />
                    <Metric
                        label="Avg Confidence"
                        value={`${data.avgConfidence.toFixed(1)}%`}
                        trend={data.confidenceTrend}
                    />
                </div>

                {/* Target Progress */}
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Auto-Process Rate Target: 95%</span>
                        <span className="text-sm font-medium">{data.autoProcessedPercent.toFixed(1)}%</span>
                    </div>
                    <Progress
                        value={data.autoProcessedPercent}
                        className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        {data.autoProcessedPercent >= 95
                            ? '✓ Meeting Docyt/Digits benchmark'
                            : `${(95 - data.autoProcessedPercent).toFixed(1)}% below industry benchmark`}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
