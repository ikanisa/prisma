import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TestTube,
  Settings,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  last_run_at: string;
  average_duration_ms: number;
}

interface TestRun {
  id: string;
  status: string;
  execution_time_ms: number;
  error_details?: string;
  started_at: string;
  completed_at?: string;
  environment: string;
}

interface QASummary {
  total_tests: number;
  passed: number;
  failed: number;
  errors: number;
  success_rate: number;
  total_execution_time_ms: number;
}

export default function QADashboard() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [summary, setSummary] = useState<QASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch test suites
      const { data: suites, error: suitesError } = await supabase
        .from("qa_test_suites")
        .select("*")
        .order("created_at", { ascending: false });

      if (suitesError) throw suitesError;

      // Fetch recent test runs
      const { data: runs, error: runsError } = await supabase
        .from("qa_test_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (runsError) throw runsError;

      setTestSuites(suites || []);
      setRecentRuns(runs || []);

      // Calculate summary
      if (suites && suites.length > 0) {
        const totalTests = suites.reduce((sum, suite) => sum + (suite.total_tests || 0), 0);
        const passedTests = suites.reduce((sum, suite) => sum + (suite.passed_tests || 0), 0);
        const failedTests = suites.reduce((sum, suite) => sum + (suite.failed_tests || 0), 0);
        
        setSummary({
          total_tests: totalTests,
          passed: passedTests,
          failed: failedTests,
          errors: 0,
          success_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
          total_execution_time_ms: suites.reduce((sum, suite) => sum + (suite.average_duration_ms || 0), 0)
        });
      }

    } catch (error) {
      console.error("Error fetching QA data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch QA dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeQAFramework = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-test-manager', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "QA Framework initialized successfully"
      });

      await fetchData();
    } catch (error) {
      console.error("Error initializing QA framework:", error);
      toast({
        title: "Error",
        description: "Failed to initialize QA framework",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runTestSuite = async (suiteId: string, suiteName: string) => {
    setRunning(suiteId);
    try {
      const { data, error } = await supabase.functions.invoke('qa-execution-engine', {
        body: { 
          suite_id: suiteId,
          environment: 'development',
          parallel: true
        }
      });

      if (error) throw error;

      toast({
        title: "Test Suite Completed",
        description: `${suiteName}: ${data.summary.passed}/${data.summary.total_tests} tests passed (${data.summary.success_rate}%)`
      });

      await fetchData();
    } catch (error) {
      console.error("Error running test suite:", error);
      toast({
        title: "Error",
        description: `Failed to run test suite: ${suiteName}`,
        variant: "destructive"
      });
    } finally {
      setRunning(null);
    }
  };

  const runAllTests = async () => {
    setRunning('all');
    try {
      for (const suite of testSuites) {
        await runTestSuite(suite.id, suite.name);
      }
      
      toast({
        title: "All Tests Completed",
        description: "All test suites have been executed"
      });
    } catch (error) {
      console.error("Error running all tests:", error);
      toast({
        title: "Error",
        description: "Failed to run all test suites",
        variant: "destructive"
      });
    } finally {
      setRunning(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      passed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'integration':
        return <TestTube className="w-5 h-5 text-blue-500" />;
      case 'performance':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'load':
        return <BarChart3 className="w-5 h-5 text-orange-500" />;
      case 'e2e':
        return <Settings className="w-5 h-5 text-purple-500" />;
      default:
        return <TestTube className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading && testSuites.length === 0) {
    return <div className="p-6">Loading QA dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">QA Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing framework for easyMO WhatsApp super-app
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={initializeQAFramework} 
            variant="outline"
            disabled={loading}
          >
            <Settings className="w-4 h-4 mr-2" />
            Initialize Framework
          </Button>
          <Button 
            onClick={runAllTests} 
            disabled={running === 'all' || testSuites.length === 0}
          >
            {running === 'all' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run All Tests
          </Button>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_tests}</div>
              <p className="text-xs text-muted-foreground">
                Across {testSuites.length} suites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.success_rate}%</div>
              <Progress value={summary.success_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed Tests</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
              <p className="text-xs text-muted-foreground">
                {summary.failed} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(summary.total_execution_time_ms / testSuites.length || 0)}ms</div>
              <p className="text-xs text-muted-foreground">
                Per test suite
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="suites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Suites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testSuites.map((suite) => (
                  <div key={suite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getCategoryIcon(suite.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{suite.name}</h3>
                          {getStatusBadge(suite.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suite.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{suite.total_tests || 0} tests</span>
                          <span className="text-green-600">{suite.passed_tests || 0} passed</span>
                          <span className="text-red-600">{suite.failed_tests || 0} failed</span>
                          {suite.last_run_at && (
                            <span>Last run: {new Date(suite.last_run_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {suite.total_tests > 0 && (
                        <div className="text-right mr-4">
                          <div className="text-sm font-medium">
                            {Math.round(((suite.passed_tests || 0) / suite.total_tests) * 100)}% pass rate
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {suite.average_duration_ms}ms avg
                          </div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={() => runTestSuite(suite.id, suite.name)}
                        disabled={running === suite.id || running === 'all'}
                      >
                        {running === suite.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {testSuites.length === 0 && (
                  <div className="text-center py-8">
                    <TestTube className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold">No test suites found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Initialize the QA framework to create test suites.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <div className="font-medium">Test Run #{run.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(run.started_at).toLocaleString()} • {run.environment}
                        </div>
                        {run.error_details && (
                          <div className="text-xs text-red-600 mt-1">{run.error_details}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(run.status)}
                      {run.execution_time_ms && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {run.execution_time_ms}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {recentRuns.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold">No test runs found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Run some tests to see the execution history.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testSuites
                  .filter(suite => suite.category === 'performance')
                  .map((suite) => (
                  <div key={suite.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{suite.name}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Average Duration:</span>
                        <span className="font-medium">{suite.average_duration_ms}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success Rate:</span>
                        <span className={`font-medium ${
                          ((suite.passed_tests || 0) / Math.max(suite.total_tests, 1)) > 0.9 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`}>
                          {Math.round(((suite.passed_tests || 0) / Math.max(suite.total_tests, 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}