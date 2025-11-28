// src/components/agents/LearningExampleCard.tsx
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Edit, Check, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApproveExample, useRejectExample } from '@/hooks/useAgentLearning';

interface LearningExample {
  id: string;
  agent_id: string;
  agent_name: string;
  example_type: 'positive' | 'negative' | 'correction' | 'demonstration';
  input_text: string;
  expected_output: string;
  actual_output?: string;
  tags: string[];
  importance: number;
  is_approved: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by: string;
  created_at: string;
}

const typeColors = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  correction: 'bg-amber-100 text-amber-800',
  demonstration: 'bg-blue-100 text-blue-800',
};

const typeIcons = {
  positive: ThumbsUp,
  negative: ThumbsDown,
  correction: Edit,
  demonstration: Check,
};

export function LearningExampleCard({
  example,
  index,
}: {
  example: LearningExample;
  index: number;
}) {
  const approveExample = useApproveExample();
  const rejectExample = useRejectExample();

  const Icon = typeIcons[example.example_type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border bg-card p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              typeColors[example.example_type]
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{example.agent_name}</h3>
              <Badge className={typeColors[example.example_type]}>
                {example.example_type}
              </Badge>
              {example.is_approved && (
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3" />
                  Approved
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Added by {example.created_by} · {new Date(example.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <X className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Input */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">INPUT</div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">{example.input_text}</div>
        </div>

        {/* Expected Output */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            EXPECTED OUTPUT
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">{example.expected_output}</div>
        </div>

        {/* Actual Output (if correction) */}
        {example.actual_output && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              ACTUAL OUTPUT (INCORRECT)
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
              {example.actual_output}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          {example.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            Importance: {example.importance}/5
          </Badge>
        </div>

        {!example.is_approved && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => rejectExample.mutate(example.id)}
              className="gap-1"
            >
              <X className="w-3 h-3" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => approveExample.mutate(example.id)}
              className="gap-1"
            >
              <Check className="w-3 h-3" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
