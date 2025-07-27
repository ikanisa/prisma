import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Brain, Database, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIReviewResult {
  aiResponses: Array<{
    model: string;
    analysis: string;
    issues: Array<{
      type: 'error' | 'warning' | 'suggestion';
      severity: 'critical' | 'high' | 'medium' | 'low';
      file?: string;
      line?: number;
      description: string;
      fix?: string;
    }>;
    recommendations: string[];
    score: number;
  }>;
  consolidatedIssues: any[];
  overallScore: number;
  projectAnalysis: any;
  criticalIssues: number;
  totalIssues: number;
  reviewDate: string;
}

export default function AICodeReviewer() {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResults, setReviewResults] = useState<AIReviewResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runFullReview = async () => {
    setIsReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('multi-ai-code-reviewer', {
        body: {
          action: 'full_review',
          files: [] // In production, you'd pass actual file contents
        }
      });

      if (error) throw error;
      
      setReviewResults(data);
      toast.success('Multi-AI code review completed successfully!');
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to complete code review: ' + error.message);
    } finally {
      setIsReviewing(false);
    }
  };

  const runDatabaseCleanup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('multi-ai-code-reviewer', {
        body: { action: 'database_cleanup' }
      });

      if (error) throw error;
      toast.success('Database cleanup completed');
    } catch (error) {
      toast.error('Database cleanup failed: ' + error.message);
    }
  };

  const runSecurityAudit = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('multi-ai-code-reviewer', {
        body: { action: 'security_audit' }
      });

      if (error) throw error;
      toast.success('Security audit completed');
    } catch (error) {
      toast.error('Security audit failed: ' + error.message);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Code Reviewer</h1>
          <p className="text-muted-foreground">
            Multi-AI powered code analysis with GPT-4o, Claude Opus & Gemini 2.5 Pro
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runFullReview} disabled={isReviewing}>
            {isReviewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reviewing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Run Full Review
              </>
            )}
          </Button>
          <Button variant="outline" onClick={runDatabaseCleanup}>
            <Database className="mr-2 h-4 w-4" />
            DB Cleanup
          </Button>
          <Button variant="outline" onClick={runSecurityAudit}>
            <Shield className="mr-2 h-4 w-4" />
            Security Audit
          </Button>
        </div>
      </div>

      {reviewResults && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ai-responses">AI Responses</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(reviewResults.overallScore)}`}>
                    {reviewResults.overallScore}/100
                  </div>
                  <Progress value={reviewResults.overallScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Critical Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {reviewResults.criticalIssues}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reviewResults.totalIssues}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all severity levels
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">
                    GPT-4o, Claude, Gemini
                  </p>
                </CardContent>
              </Card>
            </div>

            {reviewResults.criticalIssues > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have {reviewResults.criticalIssues} critical issues that require immediate attention.
                  Please review the Issues tab for details.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="ai-responses" className="space-y-4">
            {reviewResults.aiResponses.map((response, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {response.model}
                    <Badge variant="outline" className={getScoreColor(response.score)}>
                      Score: {response.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {response.analysis}
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Key Issues Found:</h4>
                    {response.issues.slice(0, 3).map((issue, issueIndex) => (
                      <div key={issueIndex} className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <span className="text-sm">{issue.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            {reviewResults.consolidatedIssues.map((issue, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">
                          {issue.type}
                        </Badge>
                        {issue.file && (
                          <Badge variant="secondary">
                            {issue.file}:{issue.line}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{issue.description}</p>
                      {issue.fix && (
                        <div className="mt-2 p-3 bg-muted rounded">
                          <p className="text-sm">
                            <strong>Suggested Fix:</strong> {issue.fix}
                          </p>
                        </div>
                      )}
                    </div>
                    {issue.severity === 'critical' ? (
                      <XCircle className="h-5 w-5 text-red-500 mt-1" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consolidated Recommendations</CardTitle>
                <CardDescription>
                  Based on analysis from all three AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewResults.aiResponses.flatMap(response => response.recommendations)
                    .filter((rec, index, self) => self.indexOf(rec) === index)
                    .map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!reviewResults && !isReviewing && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Review Results</h3>
                <p className="text-muted-foreground">
                  Run a full review to analyze your codebase with multiple AI models
                </p>
              </div>
              <Button onClick={runFullReview}>
                Start AI Code Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}