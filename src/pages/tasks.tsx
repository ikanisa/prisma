import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore, TaskStatus, TaskPriority } from '@/stores/mock-data';
import { useCrud } from '@/hooks/use-crud';
import { TaskForm } from '@/components/forms/task-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusColors = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800', 
  REVIEW: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800', 
  URGENT: 'bg-red-100 text-red-800',
};

export function Tasks() {
  const { currentOrg, getOrgTasks, users } = useAppStore();
  const { updateTask, loading } = useCrud();
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  
  const tasks = getOrgTasks(currentOrg?.id || '');
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your work items</p>
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
                onSuccess={() => setTaskDialogOpen(false)}
                onCancel={() => setTaskDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task, index) => (
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
                      <p className="text-sm text-muted-foreground font-normal">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                      disabled={loading}
                    >
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {task.dueDate}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{getUserName(task.assigneeId)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {filter === 'all' ? 'No tasks yet' : `No ${filter.toLowerCase().replace('_', ' ')} tasks`}
          </h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all' 
              ? 'Create your first task to get started' 
              : 'Try changing the filter to see other tasks'
            }
          </p>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      )}
    </motion.div>
  );
}