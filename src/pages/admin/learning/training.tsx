// src/pages/admin/learning/training.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, StopCircle, TrendingUp, Zap,
  BarChart3, Settings, Download, Upload,
  ChevronRight, AlertCircle, CheckCircle2,
  Clock, Database, Sparkles, FlaskConical
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Stack } from '@/components/layout/Stack';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useTrainingRuns,
  useCreateTrainingRun,
  useExperiments,
  useCreateExperiment,
  useStartExperiment,
  useLearningStats
} from '@/hooks/learning/useFeedback';

export default function TrainingPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);
  const [showNewExperimentDialog, setShowNewExperimentDialog] = useState(false);

  const { data: trainingRuns, isLoading: runsLoading } = useTrainingRuns(
    selectedAgent === 'all' ? undefined : selectedAgent
  );
  const { data: experiments, isLoading: experimentsLoading } = useExperiments(
    selectedAgent === 'all' ? undefined : selectedAgent
  );
  const { data: stats } = useLearningStats();

  const createTrainingRun = useCreateTrainingRun();
  const createExperiment = useCreateExperiment();
  const startExperiment = useStartExperiment();

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Training & Experiments</h1>
            <p className="text-muted-foreground">
              Manage agent training runs and A/B experiments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {/* Dynamic agent list */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {trainingRuns?.filter((r: any) => r.status === 'running').length || 0}
                </span>
                <Play className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {stats?.annotatedThisWeek || 0}
                </span>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Experiments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {experiments?.filter((e: any) => e.status === 'running').length || 0}
                </span>
                <FlaskConical className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {((stats?.avgQualityScore || 0) * 100).toFixed(0)}%
                </span>
                <TrendingUp className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="runs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="runs" className="gap-2">
              <Zap className="w-4 h-4" />
              Training Runs
            </TabsTrigger>
            <TabsTrigger value="experiments" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              A/B Experiments
            </TabsTrigger>
            <TabsTrigger value="datasets" className="gap-2">
              <Database className="w-4 h-4" />
              Datasets
            </TabsTrigger>
          </TabsList>

          {/* Training Runs Tab */}
          <TabsContent value="runs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Training Runs</h2>
              <Dialog open={showNewRunDialog} onOpenChange={setShowNewRunDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Play className="w-4 h-4" />
                    New Training Run
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Training Run</DialogTitle>
                    <DialogDescription>
                      Configure a new training run to improve agent performance
                    </DialogDescription>
                  </DialogHeader>
                  <NewTrainingRunForm
                    onCreate={(data) => {
                      createTrainingRun.mutate(data, {
                        onSuccess: () => setShowNewRunDialog(false),
                      });
                    }}
                    isCreating={createTrainingRun.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {runsLoading ? (
              <div className="text-center py-12">Loading training runs...</div>
            ) : trainingRuns && trainingRuns.length > 0 ? (
              <div className="space-y-3">
                {trainingRuns.map((run: any) => (
                  <TrainingRunCard key={run.id} run={run} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No training runs yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your first training run to improve agent performance
                  </p>
                  <Button onClick={() => setShowNewRunDialog(true)} className="gap-2">
                    <Play className="w-4 h-4" />
                    Create Training Run
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">A/B Experiments</h2>
              <Dialog open={showNewExperimentDialog} onOpenChange={setShowNewExperimentDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <FlaskConical className="w-4 h-4" />
                    New Experiment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create A/B Experiment</DialogTitle>
                    <DialogDescription>
                      Test improvements against the current version
                    </DialogDescription>
                  </DialogHeader>
                  <NewExperimentForm
                    onCreate={(data) => {
                      createExperiment.mutate(data, {
                        onSuccess: () => setShowNewExperimentDialog(false),
                      });
                    }}
                    isCreating={createExperiment.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {experimentsLoading ? (
              <div className="text-center py-12">Loading experiments...</div>
            ) : experiments && experiments.length > 0 ? (
              <div className="space-y-3">
                {experiments.map((experiment: any) => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    onStart={(id) => startExperiment.mutate(id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No experiments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Run A/B tests to validate improvements before deploying
                  </p>
                  <Button onClick={() => setShowNewExperimentDialog(true)} className="gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Create Experiment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets">
            <Card>
              <CardHeader>
                <CardTitle>Training Datasets</CardTitle>
                <CardDescription>
                  Manage curated datasets for agent training
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Dataset management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Stack>
    </Container>
  );
}

// ============================================
// TRAINING RUN CARD
// ============================================

function TrainingRunCard({ run }: { run: any }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    running: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    cancelled: { icon: StopCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  };

  const config = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{run.name}</h3>
              <Badge variant="outline" className={`${config.color} ${config.bg}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {run.status}
              </Badge>
              <Badge variant="outline">{run.training_type.replace('_', ' ')}</Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Started {new Date(run.created_at).toLocaleDateString()}
              </span>
              {run.completed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed {new Date(run.completed_at).toLocaleDateString()}
                </span>
              )}
              <span>by {run.created_by_email}</span>
            </div>

            {run.status === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-mono">{run.progress_percentage}%</span>
                </div>
                <Progress value={run.progress_percentage} />
              </div>
            )}

            {run.metrics && Object.keys(run.metrics).length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {Object.entries(run.metrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-lg font-semibold">
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm">
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// EXPERIMENT CARD
// ============================================

function ExperimentCard({ experiment, onStart }: { experiment: any; onStart: (id: string) => void }) {
  const statusConfig = {
    draft: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    running: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    paused: { icon: Pause, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    cancelled: { icon: StopCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  };

  const config = statusConfig[experiment.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{experiment.name}</h3>
              <Badge variant="outline" className={`${config.color} ${config.bg}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {experiment.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {experiment.description}
            </p>
            <p className="text-xs text-muted-foreground italic">
              Hypothesis: {experiment.hypothesis}
            </p>
          </div>

          {experiment.status === 'draft' && (
            <Button onClick={() => onStart(experiment.id)} className="gap-2">
              <Play className="w-4 h-4" />
              Start Experiment
            </Button>
          )}
        </div>

        {experiment.status === 'running' && (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                Control (A)
                <Badge variant="outline">
                  {experiment.current_control_samples} samples
                </Badge>
              </h4>
              {experiment.control_metrics && (
                <div className="space-y-2">
                  {Object.entries(experiment.control_metrics).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono">
                        {typeof value === 'number' ? value.toFixed(4) : value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4 bg-primary/5">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                Treatment (B)
                <Badge variant="outline">
                  {experiment.current_treatment_samples} samples
                </Badge>
              </h4>
              {experiment.treatment_metrics && (
                <div className="space-y-2">
                  {Object.entries(experiment.treatment_metrics).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono font-semibold">
                        {typeof value === 'number' ? value.toFixed(4) : value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {experiment.winner && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <p className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Winner: {experiment.winner === 'A' ? 'Control' : 'Treatment'}
            </p>
            {experiment.statistical_significance && (
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                Statistical significance: {(experiment.statistical_significance * 100).toFixed(2)}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// FORMS (Simplified)
// ============================================

function NewTrainingRunForm({ onCreate, isCreating }: any) {
  const [name, setName] = useState('');
  const [trainingType, setTrainingType] = useState('prompt_optimization');

  return (
    <div className="space-y-4">
      <div>
        <Label>Run Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Prompt optimization v2"
        />
      </div>
      <div>
        <Label>Training Type</Label>
        <Select value={trainingType} onValueChange={setTrainingType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prompt_optimization">Prompt Optimization</SelectItem>
            <SelectItem value="rag_tuning">RAG Tuning</SelectItem>
            <SelectItem value="fine_tuning">Fine-Tuning</SelectItem>
            <SelectItem value="rlhf">RLHF</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={() => onCreate({ name, trainingType, config: {}, agentId: '', datasetId: '' })}
          disabled={isCreating || !name}
        >
          {isCreating ? 'Creating...' : 'Create Run'}
        </Button>
      </div>
    </div>
  );
}

function NewExperimentForm({ onCreate, isCreating }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <Label>Experiment Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., New prompt vs current"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you testing?"
          rows={2}
        />
      </div>
      <div>
        <Label>Hypothesis</Label>
        <Textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="What outcome do you expect?"
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          onClick={() => onCreate({
            name,
            description,
            hypothesis,
            agentId: '',
            controlConfig: {},
            treatmentConfig: {}
          })}
          disabled={isCreating || !name}
        >
          {isCreating ? 'Creating...' : 'Create Experiment'}
        </Button>
      </div>
    </div>
  );
}
