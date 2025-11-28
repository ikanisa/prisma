// src/pages/admin/agents/learning/index.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  BookOpen,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { DataCard } from '@/components/ui/DataCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLearningExamples, useAgentMetrics } from '@/hooks/useAgentLearning';
import { FeedbackList } from '@/components/agents/FeedbackList';
import { LearningExampleCard } from '@/components/agents/LearningExampleCard';
import { QualityTrendChart } from '@/components/agents/QualityTrendChart';
import { CreateLearningExampleDialog } from '@/components/agents/CreateLearningExampleDialog';

export default function AgentLearningPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [exampleType, setExampleType] = useState<string>('all');
  const [reviewStatus, setReviewStatus] = useState<string>('pending');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: examples, isLoading } = useLearningExamples({
    agentId: selectedAgent === 'all' ? undefined : selectedAgent,
    type: exampleType === 'all' ? undefined : exampleType,
    reviewStatus: reviewStatus === 'all' ? undefined : reviewStatus,
  });

  const { data: metrics } = useAgentMetrics(selectedAgent);

  return (
    <Container size="lg">
      <Stack gap="lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Agent Learning Console
            </h1>
            <p className="text-muted-foreground">
              Improve agent performance through continuous learning and feedback
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Add Example
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        <Grid cols={4} gap="md">
          <DataCard>
            <DataCard.Header icon={MessageSquare} title="Total Feedback" />
            <DataCard.Value value={metrics?.total_feedback || 0} />
            <DataCard.Change value={12} period="vs last week" />
          </DataCard>

          <DataCard>
            <DataCard.Header icon={ThumbsUp} title="Positive Rate" />
            <DataCard.Value
              value={`${metrics?.positive_rate || 0}%`}
              trend={metrics?.positive_rate > 75 ? 'up' : 'down'}
            />
            <DataCard.Change value={5} period="vs last week" />
          </DataCard>

          <DataCard>
            <DataCard.Header icon={Target} title="Avg Quality Score" />
            <DataCard.Value
              value={metrics?.avg_quality_score?.toFixed(2) || '0.00'}
              trend="up"
            />
            <DataCard.Change value={0.12} period="improvement" />
          </DataCard>

          <DataCard>
            <DataCard.Header icon={BookOpen} title="Learning Examples" />
            <DataCard.Value value={examples?.length || 0} />
            <DataCard.Badge
              text={`${metrics?.approved_examples || 0} approved`}
              variant="success"
            />
          </DataCard>
        </Grid>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              <SelectItem value="audit-assistant">Audit Assistant</SelectItem>
              <SelectItem value="tax-specialist">Tax Specialist</SelectItem>
              <SelectItem value="bookkeeper">Bookkeeper</SelectItem>
            </SelectContent>
          </Select>

          <Select value={exampleType} onValueChange={setExampleType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Example type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="correction">Correction</SelectItem>
              <SelectItem value="demonstration">Demonstration</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reviewStatus} onValueChange={setReviewStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Review status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="examples" className="space-y-6">
          <TabsList>
            <TabsTrigger value="examples" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Learning Examples
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              User Feedback
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Quality Trends
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          {/* Learning Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <div className="grid gap-4">
              {examples?.map((example, index) => (
                <LearningExampleCard key={example.id} example={example} index={index} />
              ))}
            </div>

            {examples?.length === 0 && (
              <div className="text-center py-16 rounded-xl border border-dashed">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No learning examples yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start adding examples to help your agents learn and improve
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create First Example
                </Button>
              </div>
            )}
          </TabsContent>

          {/* User Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <FeedbackList agentId={selectedAgent === 'all' ? undefined : selectedAgent} />
          </TabsContent>

          {/* Quality Trends Tab */}
          <TabsContent value="quality" className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Quality Score Over Time</h3>
              <QualityTrendChart agentId={selectedAgent} />
            </div>

            <Grid cols={2} gap="md">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Common Issues</h3>
                <div className="space-y-3">
                  {[
                    { issue: 'Incorrect date formatting', count: 12, severity: 'high' },
                    { issue: 'Missing context in responses', count: 8, severity: 'medium' },
                    { issue: 'Overly verbose answers', count: 5, severity: 'low' },
                  ].map((item) => (
                    <div
                      key={item.issue}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle
                          className={`w-4 h-4 ${
                            item.severity === 'high'
                              ? 'text-red-500'
                              : item.severity === 'medium'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          }`}
                        />
                        <span className="text-sm">{item.issue}</span>
                      </div>
                      <Badge variant="outline">{item.count} occurrences</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Improvement Areas</h3>
                <div className="space-y-3">
                  {[
                    { area: 'Technical accuracy', current: 85, target: 95 },
                    { area: 'Response clarity', current: 78, target: 90 },
                    { area: 'Relevance', current: 92, target: 95 },
                  ].map((item) => (
                    <div key={item.area} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.area}</span>
                        <span className="text-muted-foreground">
                          {item.current}% / {item.target}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(item.current / item.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Grid>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">AI-Generated Insights</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on 1,234 interactions over the past 30 days
                  </p>
                  <div className="space-y-3">
                    <InsightCard
                      type="success"
                      title="Strong Performance in Tax Queries"
                      description="The tax specialist agent maintains 96% accuracy with average response time of 1.2s"
                    />
                    <InsightCard
                      type="warning"
                      title="Audit Templates Need Examples"
                      description="Users frequently ask for examples. Consider adding more demonstration examples."
                    />
                    <InsightCard
                      type="info"
                      title="Peak Usage: 9AM-11AM"
                      description="Consider pre-warming cache during these hours for better performance"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Grid cols={2} gap="md">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Suggested Improvements</h3>
                <div className="space-y-3">
                  <SuggestionCard
                    title="Add more accounting examples"
                    impact="High"
                    effort="Low"
                  />
                  <SuggestionCard
                    title="Refine system prompt for clarity"
                    impact="Medium"
                    effort="Medium"
                  />
                  <SuggestionCard
                    title="Expand tax knowledge base"
                    impact="High"
                    effort="High"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold mb-4">Training Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Examples collected</span>
                    <span className="font-semibold">234 / 500</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '47%' }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    266 more examples needed for next fine-tune cycle
                  </p>
                </div>
              </div>
            </Grid>
          </TabsContent>
        </Tabs>

        {/* Create Learning Example Dialog */}
        <CreateLearningExampleDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          agentId={selectedAgent === 'all' ? undefined : selectedAgent}
        />
      </Stack>
    </Container>
  );
}

function InsightCard({
  type,
  title,
  description,
}: {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}) {
  const icons = {
    success: CheckCircle2,
    warning: AlertCircle,
    info: Sparkles,
  };

  const colors = {
    success: 'text-green-600 bg-green-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-blue-600 bg-blue-100',
  };

  const Icon = icons[type];

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[type]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  impact,
  effort,
}: {
  title: string;
  impact: string;
  effort: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <span className="text-sm">{title}</span>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Impact: {impact}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Effort: {effort}
        </Badge>
      </div>
    </div>
  );
}
