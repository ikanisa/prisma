import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, FileText, CheckSquare, 
  Upload, Users, Calendar, TrendingUp,
  Clock, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalAI } from '@/hooks/useLocalAI';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  aiRecommended?: boolean;
  frequency?: number;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-document',
    label: 'New Document',
    icon: FileText,
    onClick: () => console.log('Create document'),
  },
  {
    id: 'new-task',
    label: 'New Task',
    icon: CheckSquare,
    onClick: () => console.log('Create task'),
  },
  {
    id: 'upload-file',
    label: 'Upload File',
    icon: Upload,
    onClick: () => console.log('Upload file'),
  },
  {
    id: 'schedule-meeting',
    label: 'Schedule Meeting',
    icon: Calendar,
    onClick: () => console.log('Schedule meeting'),
  },
];

export function QuickActions() {
  const [actions, setActions] = useState<QuickAction[]>(defaultActions);
  const [suggestedActions, setSuggestedActions] = useState<QuickAction[]>([]);
  const { predictAction, isLoading } = useLocalAI();

  useEffect(() => {
    // Load user behavior and predict next actions
    const loadPredictions = async () => {
      const userBehavior = localStorage.getItem('user_actions');
      if (userBehavior) {
        const prediction = await predictAction(JSON.parse(userBehavior));
        if (prediction) {
          // Mark predicted actions as AI recommended
          const updated = actions.map((action) => ({
            ...action,
            aiRecommended: prediction.alternatives.includes(action.id),
          }));
          setActions(updated);
        }
      }
    };

    loadPredictions();
  }, []);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Quick Actions</h3>
        </div>
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-4 w-4 text-purple-500" />
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.slice(0, 4).map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all',
              'hover:border-primary hover:bg-primary/5 hover:shadow-md',
              action.aiRecommended && 'border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20'
            )}
          >
            {action.aiRecommended && (
              <div className="absolute -right-1 -top-1 rounded-full bg-purple-500 p-1">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            )}
            
            <action.icon className={cn(
              'h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary',
              action.aiRecommended && 'text-purple-600'
            )} />
            
            <span className="text-xs font-medium text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>

      {suggestedActions.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-purple-600">
            <Sparkles className="h-3 w-3" />
            Suggested for you
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
