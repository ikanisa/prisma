import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, CheckCircle, Search, Filter, Download } from 'lucide-react';
import { useAdminData } from '@/hooks/admin/useAdminData';

export default function QualityGateLogging() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const { data: codeReviews, loading: reviewsLoading } = useAdminData('code_review_results', { autoLoad: true });
  const { data: qualityMetrics, loading: metricsLoading } = useAdminData('code_quality_metrics', { autoLoad: true });
  const { data: moderationLogs, loading: moderationLoading } = useAdminData('content_moderation_logs', { autoLoad: true });

  const reviewColumns = [
    {
      accessorKey: 'review_date',
      header: 'Review Date',
      cell: ({ row }: any) => new Date(row.getValue('review_date')).toLocaleDateString(),
    },
    {
      accessorKey: 'overall_score',
      header: 'Overall Score',
      cell: ({ row }: any) => {
        const score = row.getValue('overall_score') as number;
        const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{score}/100</Badge>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string;
        const variant = status === 'completed' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'consolidated_issues',
      header: 'Issues Found',
      cell: ({ row }: any) => {
        const issues = row.getValue('consolidated_issues') as any[];
        return <span>{issues?.length || 0}</span>;
      },
    },
    {
      accessorKey: 'ai_responses',
      header: 'AI Models Used',
      cell: ({ row }: any) => {
        const responses = row.getValue('ai_responses') as any[];
        return <span>{responses?.length || 0}</span>;
      },
    },
  ];

  const metricsColumns = [
    {
      accessorKey: 'metric_name',
      header: 'Metric',
    },
    {
      accessorKey: 'metric_value',
      header: 'Value',
      cell: ({ row }: any) => {
        const value = row.getValue('metric_value') as number;
        return <span>{value.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: 'file_path',
      header: 'File',
      cell: ({ row }: any) => {
        const path = row.getValue('file_path') as string;
        return <span className="font-mono text-xs">{path?.split('/').pop() || 'Global'}</span>;
      },
    },
    {
      accessorKey: 'ai_model',
      header: 'AI Model',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('ai_model') || 'N/A'}</Badge>
      ),
    },
    {
      accessorKey: 'measurement_date',
      header: 'Measured',
      cell: ({ row }: any) => new Date(row.getValue('measurement_date')).toLocaleDateString(),
    },
  ];

  const moderationColumns = [
    {
      accessorKey: 'user_phone',
      header: 'User',
      cell: ({ row }: any) => {
        const phone = row.getValue('user_phone') as string;
        return <span className="font-mono text-xs">{phone?.slice(-4) || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'content_type',
      header: 'Content Type',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.getValue('content_type')}</Badge>
      ),
    },
    {
      accessorKey: 'confidence_score',
      header: 'Confidence',
      cell: ({ row }: any) => {
        const score = row.getValue('confidence_score') as number;
        const variant = score >= 0.8 ? 'default' : score >= 0.6 ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{(score * 100).toFixed(0)}%</Badge>;
      },
    },
    {
      accessorKey: 'action_taken',
      header: 'Action',
      cell: ({ row }: any) => {
        const action = row.getValue('action_taken') as string;
        const variant = action === 'approved' ? 'default' : action === 'flagged' ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{action || 'pending'}</Badge>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }: any) => new Date(row.getValue('created_at')).toLocaleDateString(),
    },
    {
      accessorKey: 'resolved_at',
      header: 'Resolved',
      cell: ({ row }: any) => {
        const resolved = row.getValue('resolved_at');
        return resolved ? new Date(resolved).toLocaleDateString() : 'Pending';
      },
    },
  ];

  const totalReviews = codeReviews?.length || 0;
  const completedReviews = codeReviews?.filter((r: any) => r.status === 'completed').length || 0;
  const avgScore = codeReviews?.reduce((acc: number, r: any) => acc + (r.overall_score || 0), 0) / totalReviews || 0;
  const pendingModerations = moderationLogs?.filter((m: any) => !m.resolved_at).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quality Gate Logging</h1>
          <p className="text-muted-foreground">Monitor code quality, reviews, and content moderation</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Code Reviews</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReviews}/{totalReviews}</div>
            <p className="text-xs text-muted-foreground">Completed reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgScore)}/100</div>
            <p className="text-xs text-muted-foreground">Across all reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Metrics</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityMetrics?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked metrics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingModerations}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quality Logs</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList>
              <TabsTrigger value="reviews">Code Reviews</TabsTrigger>
              <TabsTrigger value="metrics">Quality Metrics</TabsTrigger>
              <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="space-y-4">
              <DataTable
                columns={reviewColumns}
                data={codeReviews || []}
                loading={reviewsLoading}
                searchKey="status"
                searchPlaceholder="Search code reviews..."
              />
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4">
              <DataTable
                columns={metricsColumns}
                data={qualityMetrics || []}
                loading={metricsLoading}
                searchKey="metric_name"
                searchPlaceholder="Search quality metrics..."
              />
            </TabsContent>
            
            <TabsContent value="moderation" className="space-y-4">
              <DataTable
                columns={moderationColumns}
                data={moderationLogs || []}
                loading={moderationLoading}
                searchKey="content_type"
                searchPlaceholder="Search moderation logs..."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}