import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { createTask, listTasks, TaskRecord, updateTask } from '@/lib/tasks';
import { TaskForm, EngagementOption, MemberOption } from '@/components/forms/task-form';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/use-i18n';

const statusColors: Record<TaskRecord['status'], string> = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const priorityColors: Record<TaskRecord['priority'], string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function Tasks() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [filter, setFilter] = useState<'all' | TaskRecord['status']>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [engagements, setEngagements] = useState<EngagementOption[]>([]);

  const orgSlug = currentOrg?.slug ?? null;

  useEffect(() => {
    if (!orgSlug) {
      setTasks([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
    const result = await listTasks({ orgSlug });
        setTasks(result);
      } catch (error) {
        toast({
          title: t('tasks.error.loadTitle'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orgSlug, toast, t]);

  useEffect(() => {
    if (!currentOrg) {
      setMembers([]);
      setEngagements([]);
      return;
    }

    const loadOptions = async () => {
      const [{ data: memberRows }, { data: engagementRows }, { data: clientRows }] = await Promise.all([
        supabase
          .from('memberships')
          .select('user_id, role, users(name)')
          .eq('org_id', currentOrg.id),
        supabase
          .from('engagements')
          .select('id, client_id, title, status, period_start')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, name')
          .eq('org_id', currentOrg.id),
      ]);

      const clientsMap = new Map<string, string>((clientRows ?? []).map((client) => [client.id, client.name]));

      setMembers(
        (memberRows ?? []).map((row: any) => ({
          id: row.user_id,
          role: row.role,
          name: row.users?.name ?? 'Unknown',
        })),
      );

      setEngagements(
        (engagementRows ?? []).map((row: any) => ({
          id: row.id,
          label: `${clientsMap.get(row.client_id) ?? 'Client'} • ${row.title ?? row.status}`,
        })),
      );
    };

    void loadOptions();
  }, [currentOrg]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  const handleStatusChange = async (taskId: string, newStatus: TaskRecord['status']) => {
    try {
      const updated = await updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } catch (error) {
      toast({
        title: t('tasks.error.updateTitle'),
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleTaskCreate = async (data: {
    title: string;
    description?: string;
    assigneeId: string;
    status: TaskRecord['status'];
    priority: TaskRecord['priority'];
    engagementId: string;
    dueDate: string;
  }) => {
    if (!orgSlug) throw new Error('Organization not selected');
    setCreating(true);
    try {
      const task = await createTask({ orgSlug, ...data });
      setTasks((prev) => [task, ...prev]);
    } finally {
      setCreating(false);
    }
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    return members.find((member) => member.id === userId)?.name ?? 'Unknown';
  };

  const getDueDate = (dueDate: string | null) => {
    if (!dueDate) return t('tasks.noDueDate');
    return new Date(dueDate).toLocaleDateString();
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('tasks.empty')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">{t('tasks.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REVIEW">Review</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <TaskForm
                members={members}
                engagements={engagements}
                onCreate={handleTaskCreate}
                onSuccess={() => setTaskDialogOpen(false)}
                onCancel={() => setTaskDialogOpen(false)}
                loading={creating}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={`tasks-skeleton-${index}`} className="border-dashed border-border/70 bg-muted/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="h-4 w-80" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-9 w-32 rounded-md" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          : filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift glass">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-lg">{task.title}</span>
                    {task.description && (
                      <p className="text-sm text-muted-foreground font-normal">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                    <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value as TaskRecord['status'])}>
                      <SelectTrigger className="w-32">
                        <Badge className={statusColors[task.status]} variant="outline">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled
                      aria-label="Edit task"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {getDueDate(task.due_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">Assignee:</span>
                      <span>{getUserName(task.assigned_to)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {filter === 'all' ? 'No tasks yet' : `No ${filter.toLowerCase().replace('_', ' ')} tasks`}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all'
              ? 'Create your first task to get started'
              : 'Try changing the filter to see other tasks'}
          </p>
          <Button variant="outline" onClick={() => setTaskDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      )}
    </motion.div>
  );
}
