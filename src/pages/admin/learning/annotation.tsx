/**
 * Expert Annotation Page
 * Interface for experts to review and annotate learning examples
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, Edit, MessageSquare,
  ChevronLeft, ChevronRight, Filter, Download,
  Sparkles, AlertTriangle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Stack } from '@/components/layout/Stack';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useAnnotationQueue, 
  useSubmitAnnotation,
  useLearningStats 
} from '@/hooks/useLearning';

export default function AnnotationPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({
    domain: 'all',
    agent: 'all',
    status: 'pending',
  });
  
  const { data: queue, isLoading } = useAnnotationQueue(filters);
  const submitAnnotation = useSubmitAnnotation();
  const { data: stats } = useLearningStats();
  
  const currentExample = queue?.[currentIndex];
  
  const [annotation, setAnnotation] = useState({
    technicalAccuracy: 0.8,
    professionalQuality: 0.8,
    completeness: 0.8,
    clarity: 0.8,
    correctedOutput: '',
    notes: '',
    improvementSuggestions: '',
    approved: null as boolean | null,
  });

  useEffect(() => {
    if (currentExample) {
      setAnnotation({
        technicalAccuracy: 0.8,
        professionalQuality: 0.8,
        completeness: 0.8,
        clarity: 0.8,
        correctedOutput: currentExample.expected_output,
        notes: '',
        improvementSuggestions: '',
        approved: null,
      });
    }
  }, [currentExample]);

  const handleSubmit = async (approved: boolean) => {
    if (!currentExample) return;
    
    await submitAnnotation.mutateAsync({
      exampleId: currentExample.id,
      annotation: {
        ...annotation,
        approved,
      },
    });
    
    if (currentIndex < (queue?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < (queue?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (isLoading) {
    return <div>Loading annotation queue...</div>;
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expert Annotation</h1>
            <p className="text-muted-foreground">
              Review and annotate learning examples to improve agent quality
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{stats?.pendingAnnotations || 0}</p>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stats?.annotatedToday || 0}</p>
              <p className="text-xs text-muted-foreground">Completed today</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Queue progress</span>
            <span>{currentIndex + 1} of {queue?.length || 0}</span>
          </div>
          <Progress value={((currentIndex + 1) / (queue?.length || 1)) * 100} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={filters.domain} onValueChange={(v) => setFilters(f => ({ ...f, domain: v }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="accounting">Accounting</SelectItem>
              <SelectItem value="audit">Audit</SelectItem>
              <SelectItem value="tax">Tax</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.agent} onValueChange={(v) => setFilters(f => ({ ...f, agent: v }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Annotation Area */}
        {currentExample ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Example Content */}
            <div className="space-y-4">
              {/* Context */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Input Context
                </h3>
                <div className="p-4 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {currentExample.input_text}
                </div>
              </div>

              {/* Original Output */}
              {currentExample.original_output && (
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Original Agent Output
                  </h3>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm whitespace-pre-wrap">
                    {currentExample.original_output}
                  </div>
                </div>
              )}

              {/* Expected/Corrected Output */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Expected Output (Editable)
                </h3>
                <Textarea
                  value={annotation.correctedOutput}
                  onChange={(e) => setAnnotation(a => ({ ...a, correctedOutput: e.target.value }))}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{currentExample.domain}</Badge>
                <Badge variant="outline">{currentExample.task_type}</Badge>
                <Badge variant="outline">Complexity: {currentExample.complexity}/5</Badge>
                <Badge variant="outline">{currentExample.example_type}</Badge>
              </div>
            </div>

            {/* Right: Annotation Controls */}
            <div className="space-y-4">
              {/* Quality Scores */}
              <div className="rounded-xl border bg-card p-5 space-y-6">
                <h3 className="font-semibold">Quality Assessment</h3>
                
                {/* Technical Accuracy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Technical Accuracy</Label>
                    <span className="text-sm font-mono">
                      {(annotation.technicalAccuracy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[annotation.technicalAccuracy]}
                    onValueChange={([v]) => setAnnotation(a => ({ ...a, technicalAccuracy: v }))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Are the facts, calculations, and references correct?
                  </p>
                </div>

                {/* Professional Quality */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Professional Quality</Label>
                    <span className="text-sm font-mono">
                      {(annotation.professionalQuality * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[annotation.professionalQuality]}
                    onValueChange={([v]) => setAnnotation(a => ({ ...a, professionalQuality: v }))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Does it meet professional standards and tone?
                  </p>
                </div>

                {/* Completeness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Completeness</Label>
                    <span className="text-sm font-mono">
                      {(annotation.completeness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[annotation.completeness]}
                    onValueChange={([v]) => setAnnotation(a => ({ ...a, completeness: v }))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Does it address all aspects of the question?
                  </p>
                </div>

                {/* Clarity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Clarity</Label>
                    <span className="text-sm font-mono">
                      {(annotation.clarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[annotation.clarity]}
                    onValueChange={([v]) => setAnnotation(a => ({ ...a, clarity: v }))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Is it well-organized and easy to understand?
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <h3 className="font-semibold">Reviewer Notes</h3>
                
                <div className="space-y-2">
                  <Label>General Notes</Label>
                  <Textarea
                    value={annotation.notes}
                    onChange={(e) => setAnnotation(a => ({ ...a, notes: e.target.value }))}
                    placeholder="Any observations about this example..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Improvement Suggestions</Label>
                  <Textarea
                    value={annotation.improvementSuggestions}
                    onChange={(e) => setAnnotation(a => ({ ...a, improvementSuggestions: e.target.value }))}
                    placeholder="How could the agent improve on this type of task?"
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => handleSubmit(false)}
                  disabled={submitAnnotation.isPending}
                  className="flex-1 gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => handleSubmit(true)}
                  disabled={submitAnnotation.isPending}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {queue?.length}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentIndex(Math.min((queue?.length || 1) - 1, currentIndex + 1))}
                  disabled={currentIndex >= (queue?.length || 1) - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No examples pending review. Check back later or adjust your filters.
            </p>
          </div>
        )}
      </Stack>
    </Container>
  );
}
