import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Pill, ShoppingCart, CreditCard, Truck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoadTestConfig {
  concurrent_orders: number;
  test_duration_minutes: number;
  ramp_up_seconds: number;
}

interface LoadTestResults {
  test_id: string;
  total_orders_attempted: number;
  successful_orders: number;
  failed_orders: number;
  payment_successes: number;
  payment_failures: number;
  courier_assignments: number;
  courier_assignment_failures: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  orders_per_second: number;
  success_rate: number;
  payment_success_rate: number;
  courier_assignment_rate: number;
  total_duration_ms: number;
  error_details: string[];
}

const PharmacyLoadTest = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<LoadTestConfig>({
    concurrent_orders: 1000,
    test_duration_minutes: 5,
    ramp_up_seconds: 30
  });
  const [results, setResults] = useState<LoadTestResults | null>(null);

  const runLoadTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    try {
      toast({
        title: "Starting Pharmacy Load Test",
        description: `Testing ${config.concurrent_orders} concurrent orders`,
      });

      // Simulate progress during test
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (config.test_duration_minutes * 60)) * 2;
          return Math.min(newProgress, 95);
        });
      }, 2000);

      const { data, error } = await supabase.functions.invoke('pharmacy-load-test', {
        body: config
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setResults(data.summary);
        toast({
          title: "Load Test Completed",
          description: `${data.summary.success_rate.toFixed(1)}% success rate`,
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }

    } catch (error) {
      console.error('Load test error:', error);
      toast({
        title: "Load Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (rate >= 80) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pharmacy Load Testing</h1>
        <p className="text-muted-foreground">Test concurrent pharmacy orders: cart → pay → courier assignment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="concurrent_orders">Concurrent Orders</Label>
              <Input
                id="concurrent_orders"
                type="number"
                value={config.concurrent_orders}
                onChange={(e) => setConfig(prev => ({ ...prev, concurrent_orders: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="1"
                max="5000"
              />
              <p className="text-xs text-muted-foreground">Number of simultaneous orders to process</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_duration">Test Duration (minutes)</Label>
              <Input
                id="test_duration"
                type="number"
                value={config.test_duration_minutes}
                onChange={(e) => setConfig(prev => ({ ...prev, test_duration_minutes: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="1"
                max="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ramp_up">Ramp Up (seconds)</Label>
              <Input
                id="ramp_up"
                type="number"
                value={config.ramp_up_seconds}
                onChange={(e) => setConfig(prev => ({ ...prev, ramp_up_seconds: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="1"
                max="300"
              />
              <p className="text-xs text-muted-foreground">Time to gradually increase load</p>
            </div>

            <Button 
              onClick={runLoadTest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Running Test...' : 'Start Load Test'}
            </Button>

            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Test Process Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">1. Create Cart & Order</p>
                  <p className="text-sm text-muted-foreground">Generate random medication orders</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">2. Process Payment</p>
                  <p className="text-sm text-muted-foreground">Simulate MoMo payment flow</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Truck className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">3. Assign Courier</p>
                  <p className="text-sm text-muted-foreground">Auto-assign delivery driver</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Pill className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">4. Track Metrics</p>
                  <p className="text-sm text-muted-foreground">Monitor success rates & performance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{results.total_orders_attempted}</div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold ${getStatusColor(results.success_rate)}`}>
                  {results.success_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{results.orders_per_second.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Orders/Second</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{results.avg_response_time.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  {getStatusIcon(results.success_rate)}
                  <span>Order Processing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Successful</span>
                    <span className="font-medium text-green-600">{results.successful_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Failed</span>
                    <span className="font-medium text-red-600">{results.failed_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <Badge className={getStatusColor(results.success_rate)}>
                      {results.success_rate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  {getStatusIcon(results.payment_success_rate)}
                  <span>Payment Processing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Successful</span>
                    <span className="font-medium text-green-600">{results.payment_successes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Failed</span>
                    <span className="font-medium text-red-600">{results.payment_failures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <Badge className={getStatusColor(results.payment_success_rate)}>
                      {results.payment_success_rate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  {getStatusIcon(results.courier_assignment_rate)}
                  <span>Courier Assignment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Assigned</span>
                    <span className="font-medium text-green-600">{results.courier_assignments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Failed</span>
                    <span className="font-medium text-red-600">{results.courier_assignment_failures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Assignment Rate</span>
                    <Badge className={getStatusColor(results.courier_assignment_rate)}>
                      {results.courier_assignment_rate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Min Response Time</p>
                  <p className="text-lg font-medium">{results.min_response_time.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Response Time</p>
                  <p className="text-lg font-medium">{results.max_response_time.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                  <p className="text-lg font-medium">{(results.total_duration_ms / 1000).toFixed(1)}s</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Throughput</p>
                  <p className="text-lg font-medium">{results.orders_per_second.toFixed(2)} orders/s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.error_details.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Errors detected during testing:</p>
                <ul className="mt-2 space-y-1">
                  {results.error_details.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-sm">• {error}</li>
                  ))}
                </ul>
                {results.error_details.length > 5 && (
                  <p className="text-sm mt-2">... and {results.error_details.length - 5} more errors</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default PharmacyLoadTest;