/**
 * Learning Dashboard
 * Overview of the learning system metrics and statistics
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Edit,
  CheckCircle,
  Clock,
  Users,
  Sparkles
} from 'lucide-react';
import { useLearningStats, useFeedbackStats } from '@/hooks/useLearning';

interface LearningDashboardProps {
  agentId?: string;
}

export function LearningDashboard({ agentId }: LearningDashboardProps) {
  const { data: stats, isLoading: statsLoading } = useLearningStats();
  const { data: feedbackStats, isLoading: feedbackLoading } = useFeedbackStats(agentId || '');

  if (statsLoading || feedbackLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading learning metrics...</p>
        </div>
      </div>
    );
  }

  const feedbackRate = feedbackStats 
    ? (feedbackStats.total_feedback / 100) * 100 // Assuming 100 total executions for demo
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Learning System
          </h2>
          <p className="text-muted-foreground">
            Continuous improvement through user feedback and expert annotations
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Active
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pending Annotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Annotations
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAnnotations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting expert review
            </p>
          </CardContent>
        </Card>

        {/* Approved Examples */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Examples
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedExamples || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for training
            </p>
          </CardContent>
        </Card>

        {/* Collected Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collected Today
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.collectedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              New examples
            </p>
          </CardContent>
        </Card>

        {/* Annotated Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Annotated Today
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.annotatedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Expert reviewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Feedback Stats */}
      {agentId && feedbackStats && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Feedback Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback Overview</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Rating</span>
                  <span className="text-2xl font-bold">{feedbackStats.avg_rating.toFixed(1)}/5.0</span>
                </div>
                <Progress value={(feedbackStats.avg_rating / 5) * 100} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{feedbackStats.thumbs_up}</p>
                    <p className="text-xs text-muted-foreground">Positive</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{feedbackStats.thumbs_down}</p>
                    <p className="text-xs text-muted-foreground">Negative</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Edit className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{feedbackStats.corrections}</p>
                  <p className="text-xs text-muted-foreground">Corrections submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Dimensions</CardTitle>
              <CardDescription>Average scores by dimension</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries({
                accuracy: 'Accuracy',
                helpfulness: 'Helpfulness',
                clarity: 'Clarity',
                completeness: 'Completeness',
              }).map(([key, label]) => {
                const score = feedbackStats.dimensions[key as keyof typeof feedbackStats.dimensions];
                const percentage = (score / 5) * 100;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{score.toFixed(1)}/5.0</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback Collection Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Collection</CardTitle>
          <CardDescription>
            Percentage of executions with user feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collection Rate</span>
              <span className="text-lg font-bold">{feedbackRate.toFixed(1)}%</span>
            </div>
            <Progress value={feedbackRate} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Target: 20% | Current: {feedbackRate.toFixed(1)}%
              {feedbackRate >= 20 ? ' ✓' : ' - Needs improvement'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
