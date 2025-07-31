import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Zap, 
  Monitor, 
  Rocket,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Database,
  Settings,
  Eye,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditResult {
  timestamp: string;
  security: {
    rls_issues: any[];
    function_security: any[];
    policy_gaps: any[];
  };
  performance: {
    slow_queries: any[];
    missing_indexes: any[];
    inefficient_functions: any[];
  };
  code_quality: {
    todo_items: any[];
    console_logs: any[];
    error_handling: any[];
  };
  production_readiness: {
    environment_config: any[];
    monitoring_setup: any[];
    deployment_checklist: any[];
  };
}

interface OptimizationReport {
  timestamp: string;
  optimization_status: string;
  summary: {
    security_fixes: number;
    performance_improvements: number;
    monitoring_components: number;
    deployment_readiness: number;
  };
  next_steps: string[];
}

export default function ProductionReadinessDashboard() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [optimizationReport, setOptimizationReport] = useState<OptimizationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const { toast } = useToast();

  const runSecurityAudit = async () => {
    setLoading(true);
    setActiveProcess('audit');
    try {
      const { data, error } = await supabase.functions.invoke('security-audit-engine', {
        body: { action: 'comprehensive-audit' }
      });

      if (error) throw error;

      setAuditResult(data.audit_results);
      toast({
        title: "Security Audit Completed",
        description: `Found ${data.summary.security_issues} security issues and ${data.summary.performance_issues} performance issues`
      });
    } catch (error) {
      console.error("Security audit error:", error);
      toast({
        title: "Error",
        description: "Failed to run security audit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setActiveProcess(null);
    }
  };

  const runProductionOptimization = async () => {
    setLoading(true);
    setActiveProcess('optimize');
    try {
      const { data, error } = await supabase.functions.invoke('production-optimizer', {
        body: { action: 'full-optimization' }
      });

      if (error) throw error;

      setOptimizationReport(data.report);
      toast({
        title: "Production Optimization Completed",
        description: `Applied ${data.report.summary.security_fixes} security fixes and ${data.report.summary.performance_improvements} performance improvements`
      });
    } catch (error) {
      console.error("Production optimization error:", error);
      toast({
        title: "Error",
        description: "Failed to run production optimization",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setActiveProcess(null);
    }
  };

  const getStatusIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      active: 'secondary', 
      configured: 'default',
      needs_review: 'destructive',
      needs_verification: 'outline',
      pending: 'outline',
      in_progress: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Readiness Dashboard</h1>
          <p className="text-muted-foreground">
            Final system audit and production deployment preparation
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runSecurityAudit} 
            disabled={loading}
            variant="outline"
          >
            <Shield className="w-4 h-4 mr-2" />
            Run Security Audit
          </Button>
          <Button 
            onClick={runProductionOptimization} 
            disabled={loading}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Optimize for Production
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {optimizationReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Fixes</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{optimizationReport.summary.security_fixes}</div>
              <p className="text-xs text-muted-foreground">Applied</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{optimizationReport.summary.performance_improvements}</div>
              <p className="text-xs text-muted-foreground">Improvements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitoring</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{optimizationReport.summary.monitoring_components}</div>
              <p className="text-xs text-muted-foreground">Components</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deployment Ready</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{optimizationReport.summary.deployment_readiness}%</div>
              <Progress value={optimizationReport.summary.deployment_readiness} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Security Audit</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Audit Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResult ? (
                <div className="space-y-4">
                  {/* RLS Issues */}
                  <div>
                    <h3 className="font-semibold mb-2">Row Level Security Issues</h3>
                    {auditResult.security.rls_issues.length > 0 ? (
                      <div className="space-y-2">
                        {auditResult.security.rls_issues.map((issue, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(issue.severity)}
                              <span className="font-medium">{issue.table}</span>
                              <span className="text-sm text-muted-foreground">{issue.issue}</span>
                            </div>
                            <Badge variant="destructive">{issue.severity}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>No RLS issues found</span>
                      </div>
                    )}
                  </div>

                  {/* Function Security */}
                  <div>
                    <h3 className="font-semibold mb-2">Function Security Issues</h3>
                    {auditResult.security.function_security.length > 0 ? (
                      <div className="space-y-2">
                        {auditResult.security.function_security.map((issue, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(issue.severity)}
                              <span className="font-medium">{issue.function}</span>
                              <span className="text-sm text-muted-foreground">{issue.issue}</span>
                            </div>
                            <Badge variant="destructive">{issue.severity}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>No function security issues found</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No audit results</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run a security audit to see results here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResult ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Slow Queries</h3>
                    {auditResult.performance.slow_queries.length > 0 ? (
                      <div className="space-y-2">
                        {auditResult.performance.slow_queries.map((query, index) => (
                          <div key={index} className="p-2 border rounded">
                            <div className="font-medium">Execution Time: {query.execution_time_ms}ms</div>
                            <div className="text-sm text-muted-foreground">{query.issue}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>No slow queries detected</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Inefficient Functions</h3>
                    {auditResult.performance.inefficient_functions.length > 0 ? (
                      <div className="space-y-2">
                        {auditResult.performance.inefficient_functions.map((func, index) => (
                          <div key={index} className="p-2 border rounded">
                            <div className="font-medium">{func.metric}</div>
                            <div className="text-sm text-muted-foreground">
                              Value: {func.value} - {func.issue}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>No inefficient functions detected</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No performance data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run an audit to analyze performance metrics.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Monitoring Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResult ? (
                <div className="space-y-2">
                  {auditResult.production_readiness.monitoring_setup.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{item.item}</span>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No monitoring data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run an audit to check monitoring setup.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Deployment Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResult ? (
                <div className="space-y-2">
                  {auditResult.production_readiness.deployment_checklist.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{item.item}</span>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No deployment data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run an audit to check deployment readiness.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {optimizationReport && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimizationReport.next_steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 p-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">
                {activeProcess === 'audit' ? 'Running security audit...' : 'Optimizing for production...'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}