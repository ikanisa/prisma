import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, FileText, CheckSquare, 
  Upload, Users, Calendar, TrendingUp 
} from 'lucide-react';
import { useLocalAI } from '@/hooks/useLocalAI';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
  aiSuggested?: boolean;
}

export function QuickActions() {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const { analyze } = useLocalAI();

  useEffect(() => {
    // Simulate AI-suggested actions based on context
    const baseActions: QuickAction[] = [
      {
        id: 'new-doc',
        title: 'New Document',
        description: 'Create a document',
        icon: FileText,
        color: 'bg-blue-500',
        action: () => console.log('New document'),
      },
      {
        id: 'new-task',
        title: 'New Task',
        description: 'Add a task',
        icon: CheckSquare,
        color: 'bg-green-500',
        action: () => console.log('New task'),
      },
      {
        id: 'upload',
        title: 'Upload File',
        description: 'Upload documents',
        icon: Upload,
        color: 'bg-purple-500',
        action: () => console.log('Upload'),
      },
    ];

    // AI suggests context-aware actions
    const aiSuggestions: QuickAction[] = [
      {
        id: 'review-pending',
        title: 'Review Pending Items',
        description: '3 items need your attention',
        icon: TrendingUp,
        color: 'bg-orange-500',
        action: () => console.log('Review'),
        aiSuggested: true,
      },
      {
        id: 'schedule-meeting',
        title: 'Schedule Meeting',
        description: 'Team sync suggested',
        icon: Calendar,
        color: 'bg-pink-500',
        action: () => console.log('Schedule'),
        aiSuggested: true,
      },
    ];

    setActions([...aiSuggestions, ...baseActions]);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Quick Actions
        </h3>
        <Sparkles className="h-4 w-4 text-purple-500" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.action}
            className={cn(
              'relative group p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 text-left',
              action.aiSuggested && 'ring-2 ring-purple-500/20'
            )}
          >
            {action.aiSuggested && (
              <div className="absolute -top-1.5 -right-1.5">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            )}

            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', action.color)}>
              <action.icon className="h-5 w-5 text-white" />
            </div>

            <div className="space-y-1">
              <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                {action.title}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                {action.description}
              </div>
            </div>

            {action.aiSuggested && (
              <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                AI Suggested
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
