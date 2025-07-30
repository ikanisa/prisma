import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageCircle, 
  Clock, 
  Target,
  RefreshCw,
  Download
} from 'lucide-react';

interface PerformanceMetrics {
  template_name: string;
  total_sends: number;
  delivered: number;
  read: number;
  clicked: number;
  conversions: number;
  delivery_rate: number;
  read_rate: number;
  click_rate: number;
  conversion_rate: number;
  engagement_score: number;
  avg_response_time: number;
  bounce_rate: number;
  period: string;
}

interface TrendData {
  date: string;
  sends: number;
  clicks: number;
  conversions: number;
  engagement: number;
}

interface SegmentPerformance {
  segment: string;
  sends: number;
  engagement: number;
  conversion_rate: number;
}

export default function TemplatePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [segmentData, setSegmentData] = useState<SegmentPerformance[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceData();
  }, [selectedPeriod, selectedTemplate]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // Load performance metrics
      const { data: metricsData, error: metricsError } = await supabase.functions.invoke('template-performance-monitor', {
        body: { 
          action: 'metrics',
          templateName: selectedTemplate === 'all' ? undefined : selectedTemplate,
          period: selectedPeriod
        }
      });

      if (metricsError) throw metricsError;

      // Load trend data
      const { data: trendsData, error: trendsError } = await supabase.functions.invoke('template-performance-monitor', {
        body: { 
          action: 'trends',
          templateName: selectedTemplate === 'all' ? undefined : selectedTemplate,
          period: selectedPeriod
        }
      });

      if (trendsError) throw trendsError;

      // Load segment performance
      const { data: segmentData, error: segmentError } = await supabase.functions.invoke('template-performance-monitor', {
        body: { 
          action: 'segments',
          period: selectedPeriod
        }
      });

      if (segmentError) throw segmentError;

      setMetrics(metricsData?.metrics || []);
      setTrendData(trendsData?.trends || []);
      setSegmentData(segmentData?.segments || []);

    } catch (error) {
      console.error('Error loading performance data:', error);
      
      // Mock data for development
      const mockMetrics: PerformanceMetrics[] = [
        {
          template_name: 'tpl_welcome_quick_v1',
          total_sends: 1250,
          delivered: 1198,
          read: 847,
          clicked: 234,
          conversions: 89,
          delivery_rate: 95.8,
          read_rate: 70.7,
          click_rate: 27.6,
          conversion_rate: 38.0,
          engagement_score: 8.4,
          avg_response_time: 45,
          bounce_rate: 4.2,
          period: selectedPeriod
        },
        {
          template_name: 'tpl_payment_confirmation_v1',
          total_sends: 890,
          delivered: 876,
          read: 798,
          clicked: 267,
          conversions: 267,
          delivery_rate: 98.4,
          read_rate: 91.1,
          click_rate: 33.5,
          conversion_rate: 100.0,
          engagement_score: 9.6,
          avg_response_time: 12,
          bounce_rate: 1.6,
          period: selectedPeriod
        }
      ];

      const mockTrends: TrendData[] = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        sends: Math.floor(Math.random() * 200) + 100,
        clicks: Math.floor(Math.random() * 50) + 20,
        conversions: Math.floor(Math.random() * 20) + 5,
        engagement: Math.random() * 3 + 7
      }));

      const mockSegments: SegmentPerformance[] = [
        { segment: 'new_users', sends: 450, engagement: 8.2, conversion_rate: 15.6 },
        { segment: 'active_users', sends: 780, engagement: 7.8, conversion_rate: 42.3 },
        { segment: 'dormant_users', sends: 320, engagement: 6.4, conversion_rate: 8.9 },
        { segment: 'vip_users', sends: 90, engagement: 9.1, conversion_rate: 67.8 }
      ];

      setMetrics(mockMetrics);
      setTrendData(mockTrends);
      setSegmentData(mockSegments);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const csvData = metrics.map(metric => ({
        'Template Name': metric.template_name,
        'Total Sends': metric.total_sends,
        'Delivery Rate': `${metric.delivery_rate}%`,
        'Read Rate': `${metric.read_rate}%`,
        'Click Rate': `${metric.click_rate}%`,
        'Conversion Rate': `${metric.conversion_rate}%`,
        'Engagement Score': metric.engagement_score,
        'Avg Response Time': `${metric.avg_response_time}s`,
        'Period': metric.period
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_performance_${selectedPeriod}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Performance data exported successfully'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  const getMetricIcon = (trend: number) => {
    return trend > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getMetricColor = (value: number, threshold: number) => {
    return value >= threshold ? 'text-green-600' : value >= threshold * 0.7 ? 'text-yellow-600' : 'text-red-600';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const topMetric = metrics.length > 0 ? metrics.reduce((top, current) => 
    current.engagement_score > top.engagement_score ? current : top
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Performance Analytics</h2>
          <p className="text-muted-foreground">Detailed performance metrics and insights</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last Day</SelectItem>
              <SelectItem value="7d">Last Week</SelectItem>
              <SelectItem value="30d">Last Month</SelectItem>
              <SelectItem value="90d">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {metrics.map(metric => (
                <SelectItem key={metric.template_name} value={metric.template_name}>
                  {metric.template_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadPerformanceData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sends</p>
                <p className="text-2xl font-bold">
                  {metrics.reduce((sum, m) => sum + m.total_sends, 0).toLocaleString()}
                </p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">
                  {(metrics.reduce((sum, m) => sum + m.click_rate, 0) / metrics.length || 0).toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Conversion</p>
                <p className="text-2xl font-bold">
                  {(metrics.reduce((sum, m) => sum + m.conversion_rate, 0) / metrics.length || 0).toFixed(1)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.reduce((sum, m) => sum + m.avg_response_time, 0) / metrics.length || 0)}s
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Daily template performance over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sends" stroke="#8884d8" strokeWidth={2} name="Sends" />
                <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} name="Clicks" />
                <Line type="monotone" dataKey="conversions" stroke="#ffc658" strokeWidth={2} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>Detailed metrics for each template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.map((metric) => (
                <div key={metric.template_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{metric.template_name}</h4>
                    <Badge variant="outline">{metric.period}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sends:</span>
                      <span className="ml-2 font-medium">{metric.total_sends.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Delivery:</span>
                      <span className={`ml-2 font-medium ${getMetricColor(metric.delivery_rate, 95)}`}>
                        {metric.delivery_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Read Rate:</span>
                      <span className={`ml-2 font-medium ${getMetricColor(metric.read_rate, 60)}`}>
                        {metric.read_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Click Rate:</span>
                      <span className={`ml-2 font-medium ${getMetricColor(metric.click_rate, 20)}`}>
                        {metric.click_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conversions:</span>
                      <span className={`ml-2 font-medium ${getMetricColor(metric.conversion_rate, 30)}`}>
                        {metric.conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Engagement:</span>
                      <span className={`ml-2 font-medium ${getMetricColor(metric.engagement_score, 7)}`}>
                        {metric.engagement_score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Segment Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Segment</CardTitle>
            <CardDescription>How different user segments engage with templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, conversion_rate }) => `${segment}: ${conversion_rate.toFixed(1)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="conversion_rate"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {segmentData.map((segment, index) => (
                  <div key={segment.segment} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="capitalize">{segment.segment.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div>{segment.sends.toLocaleString()} sends</div>
                      <div className="text-muted-foreground">{segment.conversion_rate.toFixed(1)}% conversion</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Template Highlight */}
      {topMetric && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">🏆 Top Performing Template</CardTitle>
            <CardDescription>Best engagement score in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Template</p>
                <p className="font-bold text-green-800">{topMetric.template_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engagement Score</p>
                <p className="font-bold text-green-800">{topMetric.engagement_score.toFixed(1)}/10</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="font-bold text-green-800">{topMetric.conversion_rate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sends</p>
                <p className="font-bold text-green-800">{topMetric.total_sends.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}