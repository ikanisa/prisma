import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Zap, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface StressTestConfig {
  concurrent_rides: number;
  test_duration_minutes: number;
  target_rps: number;
  test_type: 'realtime' | 'api' | 'full';
}

interface StressTestResult {
  test_id: string;
  start_time: string;
  end_time?: string;
  config: StressTestConfig;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  errors: Array<{
    timestamp: string;
    error: string;
    request_type: string;
  }>;
  realtime_stats?: {
    connections_established: number;
    connections_failed: number;
    messages_sent: number;
    messages_received: number;
    avg_latency: number;
  };
}

export default function RealtimeStressTesting() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<StressTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<StressTestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const [config, setConfig] = useState<StressTestConfig>({
    concurrent_rides: 100,
    test_duration_minutes: 5,
    target_rps: 10,
    test_type: 'full'
  });

  useEffect(() => {
    fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('stress_test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTestHistory(data?.map(row => row.results) || []);
    } catch (error) {
      console.error('Error fetching test history:', error);
    }
  };

  const startStressTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest(null);

    try {
      toast({
        title: "Starting Stress Test",
        description: `Testing ${config.concurrent_rides} concurrent connections for ${config.test_duration_minutes} minutes`,
      });

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (config.test_duration_minutes * 60));
          return Math.min(newProgress, 99);
        });
      }, 1000);

      const response = await supabase.functions.invoke('realtime-stress-test', {
        body: { config }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Test failed');
      }

      setCurrentTest(response.data.results);
      await fetchTestHistory();

      toast({
        title: "Stress Test Completed",
        description: `Test completed successfully with ${response.data.results.successful_requests}/${response.data.results.total_requests} successful requests`,
      });

    } catch (error) {
      console.error('Stress test error:', error);
      toast({
        title: "Stress Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const getSuccessRate = (result: StressTestResult): number => {
    if (result.total_requests === 0) return 0;
    return Math.round((result.successful_requests / result.total_requests) * 100);
  };

  const getRealtimeSuccessRate = (result: StressTestResult): number => {
    if (!result.realtime_stats) return 0;
    const total = result.realtime_stats.connections_established + result.realtime_stats.connections_failed;
    if (total === 0) return 0;
    return Math.round((result.realtime_stats.connections_established / total) * 100);
  };

  const getStatusBadge = (successRate: number) => {
    if (successRate >= 95) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (successRate >= 90) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (successRate >= 80) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Realtime Stress Testing</h1>
          <p className="text-muted-foreground">Test system performance under high load conditions</p>
        </div>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure stress test parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="concurrent-rides">Concurrent Rides</Label>
              <Input
                id="concurrent-rides"
                type="number"
                min="1"
                max="1000"
                value={config.concurrent_rides}
                onChange={(e) => setConfig(prev => ({ ...prev, concurrent_rides: parseInt(e.target.value) }))}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="60"
                value={config.test_duration_minutes}
                onChange={(e) => setConfig(prev => ({ ...prev, test_duration_minutes: parseInt(e.target.value) }))}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <Label htmlFor="rps">Target RPS</Label>
              <Input
                id="rps"
                type="number"
                min="1"
                max="100"
                value={config.target_rps}
                onChange={(e) => setConfig(prev => ({ ...prev, target_rps: parseInt(e.target.value) }))}
                disabled={isRunning}
              />
            </div>
            
            <div>
              <Label htmlFor="test-type">Test Type</Label>
              <Select 
                value={config.test_type} 
                onValueChange={(value: 'realtime' | 'api' | 'full') => 
                  setConfig(prev => ({ ...prev, test_type: value }))
                }
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Realtime Only</SelectItem>
                  <SelectItem value="api">API Only</SelectItem>
                  <SelectItem value="full">Full Stack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={startStressTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Start Stress Test
                </>
              )}
            </Button>
            
            {isRunning && (
              <div className="flex items-center gap-2 min-w-48">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Test Results */}
      {currentTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Latest Test Results
            </CardTitle>
            <CardDescription>Test ID: {currentTest.test_id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">API Performance</div>
                <div className="text-2xl font-bold">{getSuccessRate(currentTest)}%</div>
                <div className="text-xs text-muted-foreground">
                  {currentTest.successful_requests}/{currentTest.total_requests} requests
                </div>
                {getStatusBadge(getSuccessRate(currentTest))}
              </div>
              
              {currentTest.realtime_stats && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Realtime Connections</div>
                  <div className="text-2xl font-bold">{getRealtimeSuccessRate(currentTest)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {currentTest.realtime_stats.connections_established} established
                  </div>
                  {getStatusBadge(getRealtimeSuccessRate(currentTest))}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Avg Response Time</div>
                <div className="text-2xl font-bold">{Math.round(currentTest.avg_response_time)}ms</div>
                <div className="text-xs text-muted-foreground">
                  Min: {Math.round(currentTest.min_response_time)}ms | Max: {Math.round(currentTest.max_response_time)}ms
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Errors</div>
                <div className="text-2xl font-bold text-red-600">{currentTest.errors.length}</div>
                <div className="text-xs text-muted-foreground">
                  {currentTest.failed_requests} failed requests
                </div>
              </div>
            </div>
            
            {currentTest.realtime_stats && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Messages Sent</div>
                  <div className="text-lg font-bold">{currentTest.realtime_stats.messages_sent}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Messages Received</div>
                  <div className="text-lg font-bold">{currentTest.realtime_stats.messages_received}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Avg Latency</div>
                  <div className="text-lg font-bold">{Math.round(currentTest.realtime_stats.avg_latency)}ms</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>Previous stress test results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testHistory.map((test) => (
              <div key={test.test_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">
                      {test.config.concurrent_rides} rides · {test.config.test_duration_minutes}min · {test.config.test_type}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(test.start_time).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {getStatusBadge(getSuccessRate(test))}
                    {test.realtime_stats && (
                      <Badge variant="outline">
                        RT: {getRealtimeSuccessRate(test)}%
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="font-medium">{Math.round(test.avg_response_time)}ms</span>
                    <span className="text-muted-foreground"> avg</span>
                  </div>
                  
                  {test.errors.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {test.errors.length} errors
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Test Errors</DialogTitle>
                          <DialogDescription>Errors from test {test.test_id}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          {test.errors.map((error, index) => (
                            <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="text-sm font-medium">{error.request_type}</div>
                              <div className="text-xs text-muted-foreground">{error.timestamp}</div>
                              <div className="text-sm">{error.error}</div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
            
            {testHistory.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No stress tests have been run yet. Start your first test above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}