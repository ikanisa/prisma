/**
 * Feedback Collector Component
 * Collects user feedback on agent executions with multiple feedback types
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, ThumbsDown, Star, MessageSquare, 
  Edit, AlertTriangle, Check, X, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSubmitFeedback } from '@/hooks/useLearning';

interface FeedbackCollectorProps {
  executionId: string;
  agentId: string;
  agentOutput: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackCollector({
  executionId,
  agentId,
  agentOutput,
  onFeedbackSubmitted
}: FeedbackCollectorProps) {
  const [feedbackType, setFeedbackType] = useState<'quick' | 'detailed' | 'correction' | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<'up' | 'down' | null>(null);
  const [detailedFeedback, setDetailedFeedback] = useState('');
  const [correction, setCorrection] = useState(agentOutput);
  const [issueCategories, setIssueCategories] = useState<string[]>([]);
  const [showDetailedDialog, setShowDetailedDialog] = useState(false);
  
  const submitFeedback = useSubmitFeedback();

  const [dimensionRatings, setDimensionRatings] = useState({
    accuracy: 0,
    helpfulness: 0,
    clarity: 0,
    completeness: 0,
  });

  const handleQuickFeedback = async (type: 'up' | 'down') => {
    setThumbs(type);
    await submitFeedback.mutateAsync({
      executionId,
      agentId,
      feedbackType: type === 'up' ? 'thumbs_up' : 'thumbs_down',
      rating: type === 'up' ? 5 : 1,
    });
    onFeedbackSubmitted?.();
    
    if (type === 'down') {
      setShowDetailedDialog(true);
    }
  };

  const handleDetailedSubmit = async () => {
    await submitFeedback.mutateAsync({
      executionId,
      agentId,
      feedbackType: correction !== agentOutput ? 'correction' : 'detailed_feedback',
      rating,
      feedbackText: detailedFeedback,
      correctionText: correction !== agentOutput ? correction : undefined,
      issueCategories,
      dimensions: {
        accuracy: dimensionRatings.accuracy,
        helpfulness: dimensionRatings.helpfulness,
        clarity: dimensionRatings.clarity,
        completeness: dimensionRatings.completeness,
      }
    });
    
    setShowDetailedDialog(false);
    onFeedbackSubmitted?.();
  };

  const issueOptions = [
    { id: 'incorrect', label: 'Incorrect information', icon: AlertTriangle },
    { id: 'incomplete', label: 'Missing information', icon: AlertTriangle },
    { id: 'unclear', label: 'Unclear explanation', icon: AlertTriangle },
    { id: 'hallucination', label: 'Made up information', icon: AlertTriangle },
    { id: 'outdated', label: 'Outdated information', icon: AlertTriangle },
    { id: 'formatting', label: 'Formatting issues', icon: AlertTriangle },
    { id: 'tone', label: 'Inappropriate tone', icon: AlertTriangle },
    { id: 'other', label: 'Other issue', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Feedback */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        
        <div className="flex items-center gap-2">
          <Button
            variant={thumbs === 'up' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFeedback('up')}
            disabled={submitFeedback.isPending}
            className="gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            Yes
          </Button>
          
          <Button
            variant={thumbs === 'down' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleQuickFeedback('down')}
            disabled={submitFeedback.isPending}
            className="gap-2"
          >
            <ThumbsDown className="w-4 h-4" />
            No
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetailedDialog(true)}
          className="gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Give detailed feedback
        </Button>
      </div>

      {/* Detailed Feedback Dialog */}
      <Dialog open={showDetailedDialog} onOpenChange={setShowDetailedDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Help improve this agent
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Overall Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating && star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension Ratings */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Rate specific aspects</label>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries({
                  accuracy: 'Accuracy',
                  helpfulness: 'Helpfulness',
                  clarity: 'Clarity',
                  completeness: 'Completeness',
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">{label}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setDimensionRatings(prev => ({ ...prev, [key]: star }))}
                          className="p-0.5"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              dimensionRatings[key as keyof typeof dimensionRatings] >= star
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue Categories */}
            {(rating && rating <= 3) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">What was wrong? (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {issueOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setIssueCategories(prev =>
                          prev.includes(option.id)
                            ? prev.filter(id => id !== option.id)
                            : [...prev, option.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        issueCategories.includes(option.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Feedback Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional comments</label>
              <Textarea
                value={detailedFeedback}
                onChange={(e) => setDetailedFeedback(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={3}
              />
            </div>

            {/* Correction Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Provide a correction (optional)</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCorrection(agentOutput)}
                  className="text-xs"
                >
                  Reset to original
                </Button>
              </div>
              <Textarea
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Edit the response to show what it should have been..."
                rows={6}
                className="font-mono text-sm"
              />
              {correction !== agentOutput && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  You've made changes - this will be used for training
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDetailedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDetailedSubmit} disabled={submitFeedback.isPending}>
              {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
