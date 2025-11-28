import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, AlertCircle, Plus, Filter, Search } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { DataCard } from '@/components/ui/DataCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { staggerContainer, staggerItem } from '@/lib/animations';

const tasks = [
  {
    id: '1',
    title: 'Review Q4 Financial Statements',
    agent: 'Financial Statements Specialist',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-12-01',
  },
  {
    id: '2',
    title: 'Complete Tax Compliance Check',
    agent: 'EU Corporate Tax Specialist',
    status: 'pending',
    priority: 'high',
    dueDate: '2024-11-30',
  },
  {
    id: '3',
    title: 'Generate Audit Report',
    agent: 'Audit Report Specialist',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-11-28',
  },
  {
    id: '4',
    title: 'Document Classification Batch',
    agent: 'Document Classification Agent',
    status: 'in-progress',
    priority: 'low',
    dueDate: '2024-12-05',
  },
];

export function TasksPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <AnimatedPage className="min-h-screen">
      <Container size="lg" className="py-8">
        <Stack direction="vertical" gap="lg">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Tasks
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage and track all agent tasks
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>

          {/* Stats */}
          <Grid cols={4} gap="md">
            <DataCard hoverable onClick={() => setFilter('all')}>
              <DataCard.Metric
                label="Total Tasks"
                value={tasks.length}
                trend="neutral"
              />
            </DataCard>
            <DataCard hoverable onClick={() => setFilter('pending')}>
              <DataCard.Metric
                label="Pending"
                value={pendingCount}
                trend={pendingCount > 0 ? 'up' : 'neutral'}
              />
            </DataCard>
            <DataCard hoverable onClick={() => setFilter('in-progress')}>
              <DataCard.Metric
                label="In Progress"
                value={inProgressCount}
                trend="up"
              />
            </DataCard>
            <DataCard hoverable onClick={() => setFilter('completed')}>
              <DataCard.Metric
                label="Completed"
                value={completedCount}
                trend="up"
                trendValue="+2 today"
              />
            </DataCard>
          </Grid>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <div className="flex-1" />
            <div className="flex gap-2">
              {['all', 'pending', 'in-progress', 'completed'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(f as any)}
                >
                  {f.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Task List */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <Stack direction="vertical" gap="md">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks found"
                  description={`No ${filter} tasks at the moment.`}
                  action={{
                    label: 'Create New Task',
                    onClick: () => console.log('Create task'),
                  }}
                />
              ) : (
                filteredTasks.map((task) => (
                  <motion.div key={task.id} variants={staggerItem}>
                    <DataCard hoverable>
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 h-10 w-10 rounded-lg flex items-center justify-center ${
                          task.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : task.status === 'in-progress'
                            ? 'bg-blue-100 dark:bg-blue-900/20'
                            : 'bg-orange-100 dark:bg-orange-900/20'
                        }`}>
                          {task.status === 'completed' ? (
                            <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : task.status === 'in-progress' ? (
                            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin-slow" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {task.title}
                            </h3>
                            <Badge
                              variant={
                                task.priority === 'high'
                                  ? 'error'
                                  : task.priority === 'medium'
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              Assigned to: <span className="font-medium">{task.agent}</span>
                            </span>
                            <span>•</span>
                            <span>Due: {task.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    </DataCard>
                  </motion.div>
                ))
              )}
            </Stack>
          </motion.div>
        </Stack>
      </Container>
    </AnimatedPage>
  );
}
