/**
 * Anomaly Alerts Card
 * 
 * Displays detected anomalies with severity badges and quick actions.
 * Part of the MindBridge-style anomaly detection system.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';

interface AnomalyAlert {
    id: string;
    transactionId: string;
    type: 'point' | 'contextual' | 'collective';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    reason: string;
    riskScore: number;
    createdAt: Date;
}

interface AnomalyAlertsResponse {
    alerts: AnomalyAlert[];
    totalCount: number;
    criticalCount: number;
    overallRiskScore: number;
}

function getSeverityIcon(severity: 'low' | 'medium' | 'high' | 'critical') {
    switch (severity) {
        case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
        case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        default: return <Info className="h-4 w-4 text-blue-500" />;
    }
}

function getSeverityBadgeVariant(severity: 'low' | 'medium' | 'high' | 'critical') {
    switch (severity) {
        case 'critical': return 'destructive';
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        default: return 'outline';
    }
}

function getTypeBadgeColor(type: 'point' | 'contextual' | 'collective') {
    switch (type) {
        case 'point': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'contextual': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'collective': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
}

async function fetchAnomalyAlerts(): Promise<AnomalyAlertsResponse> {
    // TODO: Replace with actual API call
    return {
        alerts: [
            {
                id: 'anom-1',
                transactionId: 'tx-789',
                type: 'collective',
                severity: 'high',
                description: 'Potential duplicate payment detected',
                reason: 'Same vendor, same amount ($5,000), 3 days apart',
                riskScore: 80,
                createdAt: new Date(Date.now() - 1000 * 60 * 15),
            },
            {
                id: 'anom-2',
                transactionId: 'tx-456',
                type: 'point',
                severity: 'medium',
                description: 'Amount significantly above average',
                reason: '$15,000 is 4.2 standard deviations from vendor mean',
                riskScore: 55,
                createdAt: new Date(Date.now() - 1000 * 60 * 45),
            },
            {
                id: 'anom-3',
                transactionId: 'tx-123',
                type: 'contextual',
                severity: 'low',
                description: 'Transaction at unusual time',
                reason: 'Business expense at 3:00 AM on Saturday',
                riskScore: 25,
                createdAt: new Date(Date.now() - 1000 * 60 * 120),
            },
        ],
        totalCount: 8,
        criticalCount: 0,
        overallRiskScore: 42,
    };
}

interface AlertItemProps {
    alert: AnomalyAlert;
    onInvestigate: (id: string) => void;
    onDismiss: (id: string) => void;
}

function AlertItem({ alert, onInvestigate, onDismiss }: AlertItemProps) {
    return (
        <div className={`p-4 border-b last:border-0 ${alert.severity === 'critical' || alert.severity === 'high'
                ? 'bg-red-50/50 dark:bg-red-900/10'
                : ''
            }`}>
            <div className="flex items-start gap-3">
                <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityBadgeVariant(alert.severity)} className="text-xs">
                            {alert.severity}
                        </Badge>
                        <Badge className={`text-xs ${getTypeBadgeColor(alert.type)}`}>
                            {alert.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            Risk: {alert.riskScore}%
                        </span>
                    </div>
                    <p className="font-medium text-sm">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.reason}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => onInvestigate(alert.id)}
                        >
                            Investigate
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => onDismiss(alert.id)}
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AnomalyAlertsCard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['anomaly-alerts'],
        queryFn: fetchAnomalyAlerts,
        refetchInterval: 60000, // Refresh every minute
    });

    const handleInvestigate = (id: string) => {
        console.log('Investigating anomaly:', id);
        // TODO: Navigate to transaction detail or open modal
    };

    const handleDismiss = (id: string) => {
        console.log('Dismissing anomaly:', id);
        // TODO: Mark as false positive
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Anomaly Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2].map(i => (
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
                    <CardTitle>Anomaly Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Unable to load anomaly alerts</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Anomaly Alerts
                        </CardTitle>
                        <CardDescription>
                            AI-detected unusual patterns
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant={data.overallRiskScore > 50 ? 'destructive' : 'secondary'}>
                            Risk Score: {data.overallRiskScore}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {data.totalCount} alerts
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {data.alerts.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-muted-foreground">No anomalies detected</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            All transactions appear normal
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        {data.alerts.map(alert => (
                            <AlertItem
                                key={alert.id}
                                alert={alert}
                                onInvestigate={handleInvestigate}
                                onDismiss={handleDismiss}
                            />
                        ))}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
