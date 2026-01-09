/**
 * Pending Reviews Card
 * 
 * Shows transactions requiring human review with quick actions.
 * Part of the human-in-the-loop workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Simple relative time formatter
function formatDistanceToNow(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}


interface PendingReview {
    id: string;
    transactionId: string;
    vendor: string;
    amount: number;
    currency: string;
    suggestedCategory: string;
    confidence: number;
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
}

interface PendingReviewsResponse {
    items: PendingReview[];
    total: number;
    highPriorityCount: number;
}

function getConfidenceBadgeVariant(confidence: number) {
    if (confidence >= 0.9) return 'default';
    if (confidence >= 0.8) return 'secondary';
    return 'outline';
}

function getPriorityBadgeVariant(priority: 'low' | 'medium' | 'high') {
    switch (priority) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        default: return 'outline';
    }
}

async function fetchPendingReviews(): Promise<PendingReviewsResponse> {
    // TODO: Replace with actual API call
    // const response = await fetch('/api/ai/pending-reviews');
    // return response.json();

    return {
        items: [
            {
                id: 'rev-1',
                transactionId: 'tx-123',
                vendor: 'Office Depot',
                amount: 1234.56,
                currency: 'USD',
                suggestedCategory: 'Office Supplies',
                confidence: 0.87,
                reasoning: 'Vendor pattern match: Office Depot → Office Supplies (87% confidence)',
                priority: 'low',
                createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
            },
            {
                id: 'rev-2',
                transactionId: 'tx-456',
                vendor: 'Unknown Vendor LLC',
                amount: 5000.00,
                currency: 'USD',
                suggestedCategory: 'Professional Services',
                confidence: 0.72,
                reasoning: 'GPT-4 prediction based on amount and description',
                priority: 'high',
                createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
            },
        ],
        total: 12,
        highPriorityCount: 3,
    };
}

interface ReviewItemProps {
    item: PendingReview;
    onApprove: (id: string, category: string) => void;
    onReject: (id: string) => void;
}

function ReviewItem({ item, onApprove, onReject }: ReviewItemProps) {
    return (
        <div className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.vendor}</span>
                        <Badge variant={getPriorityBadgeVariant(item.priority)} className="text-xs">
                            {item.priority}
                        </Badge>
                    </div>
                    <p className="text-lg font-semibold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency }).format(item.amount)}
                    </p>
                </div>
                <Badge variant={getConfidenceBadgeVariant(item.confidence)}>
                    {(item.confidence * 100).toFixed(0)}% confidence
                </Badge>
            </div>

            <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-1">AI Suggestion:</p>
                <Badge variant="outline" className="text-sm">
                    {item.suggestedCategory}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                    {item.reasoning}
                </p>
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(item.createdAt)}
                </span>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => onApprove(item.id, item.suggestedCategory)}
                    >
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject(item.id)}
                    >
                        Review
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function PendingReviewsCard() {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['pending-reviews'],
        queryFn: fetchPendingReviews,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const approveMutation = useMutation({
        mutationFn: async ({ id, category }: { id: string; category: string }) => {
            // TODO: Replace with actual API call
            console.log('Approving review:', id, category);
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['ai-processing-status'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            // TODO: Replace with actual API call
            console.log('Opening review:', id);
            return { success: true };
        },
    });

    const handleApprove = (id: string, category: string) => {
        approveMutation.mutate({ id, category });
    };

    const handleReject = (id: string) => {
        rejectMutation.mutate(id);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
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
                    <CardTitle>Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Unable to load pending reviews</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Pending Reviews</CardTitle>
                        <CardDescription>
                            Transactions requiring human verification
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {data.highPriorityCount > 0 && (
                            <Badge variant="destructive">
                                {data.highPriorityCount} high priority
                            </Badge>
                        )}
                        <Badge variant="secondary">
                            {data.total} total
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {data.items.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-muted-foreground">No pending reviews</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            All transactions have been processed
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px]">
                        {data.items.map(item => (
                            <ReviewItem
                                key={item.id}
                                item={item}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
