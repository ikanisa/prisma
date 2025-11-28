import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  Users,
  Target,
  Activity,
  Award,
  Zap,
  Database,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useLearningStats,
  useTrainingRuns,
  useLearningExperiments,
  useTrainingDatasets,
} from '@/hooks/learning/useFeedback';
import { formatDistanceToNow } from 'date-fns';

export function LearningDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { data: stats } = useLearningStats();
  const { data: trainingRuns } = useTrainingRuns();
  const { data: experiments } = useLearningExperiments();
  const { data: datasets } = useTrainingDatasets();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            Agent Learning System
          </h1>
          <p className="text-muted-foreground mt-2">
            Continuous improvement through feedback, training, and experimentation
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <Zap className="w-4 h-4" />
          Start New Training
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Examples</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalExamples || 0}</div>
            <p className="text-xs text-muted-foreground">
              Learning examples collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingAnnotations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting expert annotation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Experiments</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeExperiments || 0}</div>
            <p className="text-xs text-muted-foreground">
              A/B tests in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annotated Today</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.annotatedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Examples reviewed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training Runs</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Learning Pipeline Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Learning Pipeline
                </CardTitle>
                <CardDescription>Current status of the learning workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Data Collection</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Active
                    </Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Quality Filtering</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Processing
                    </Badge>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Expert Annotation</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">
                      In Progress
                    </Badge>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Model Training</span>
                    <Badge variant="outline">Scheduled</Badge>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Training Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest training and improvements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingRuns?.slice(0, 5).map((run: any) => (
                  <div key={run.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className={`p-2 rounded-lg ${
                      run.status === 'completed' ? 'bg-green-100' :
                      run.status === 'running' ? 'bg-blue-100' :
                      run.status === 'failed' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {run.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-700" />
                      ) : run.status === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-red-700" />
                      ) : (
                        <Activity className="w-4 h-4 text-blue-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{run.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {run.training_type} · {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={
                      run.status === 'completed' ? 'default' :
                      run.status === 'running' ? 'secondary' :
                      'destructive'
                    }>
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Learning Types Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Methods in Use</CardTitle>
              <CardDescription>Different approaches to continuous improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Prompt Learning</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Optimizing instructions and few-shot examples
                  </p>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Continuous
                  </Badge>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">RAG Learning</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Improving retrieval and context selection
                  </p>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Daily
                  </Badge>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Behavior Learning</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Learning from expert demonstrations
                  </p>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    Weekly
                  </Badge>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Fine-Tuning</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Deep model optimization for specialization
                  </p>
                  <Badge variant="outline">
                    Monthly
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Runs Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Runs</CardTitle>
              <CardDescription>History of model training and optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingRuns?.map((run: any) => (
                  <div key={run.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{run.name}</h4>
                        <p className="text-sm text-muted-foreground">{run.description}</p>
                      </div>
                      <Badge variant={
                        run.status === 'completed' ? 'default' :
                        run.status === 'running' ? 'secondary' :
                        run.status === 'failed' ? 'destructive' :
                        'outline'
                      }>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{run.training_type}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}</span>
                      {run.progress_percentage > 0 && (
                        <>
                          <span>·</span>
                          <span>{run.progress_percentage}% complete</span>
                        </>
                      )}
                    </div>
                    {run.status === 'running' && (
                      <Progress value={run.progress_percentage} className="h-2 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiments Tab */}
        <TabsContent value="experiments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>A/B Experiments</CardTitle>
              <CardDescription>Testing improvements before deployment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments?.map((exp: any) => (
                  <div key={exp.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{exp.name}</h4>
                        <p className="text-sm text-muted-foreground">{exp.hypothesis}</p>
                      </div>
                      <Badge variant={exp.status === 'running' ? 'secondary' : 'outline'}>
                        {exp.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Control:</span>
                        <span className="ml-2">{exp.current_control_samples} samples</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Treatment:</span>
                        <span className="ml-2">{exp.current_treatment_samples} samples</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Datasets</CardTitle>
              <CardDescription>Curated collections of learning examples</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {datasets?.map((dataset: any) => (
                  <div key={dataset.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{dataset.name}</h4>
                        <p className="text-sm text-muted-foreground">{dataset.description}</p>
                      </div>
                      <Badge variant="outline">{dataset.version}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{dataset.total_examples} examples</span>
                      <span>·</span>
                      <span>{Math.round(dataset.human_verified_percentage || 0)}% verified</span>
                      <span>·</span>
                      <span>Quality: {(dataset.avg_quality_score * 100).toFixed(0)}%</span>
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
