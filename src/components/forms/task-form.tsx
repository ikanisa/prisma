import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, User } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigneeId: z.string().min(1, 'Assignee is required'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.date({ required_error: 'Due date is required' }),
  engagementId: z.string().min(1, 'Engagement is required'),
});

export type TaskFormData = z.infer<typeof taskSchema>;

export interface MemberOption {
  id: string;
  name: string;
  role: string;
}

export interface EngagementOption {
  id: string;
  label: string;
}

interface TaskFormProps {
  members: MemberOption[];
  engagements: EngagementOption[];
  onCreate: (input: {
    title: string;
    description?: string;
    assigneeId: string;
    status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    engagementId: string;
    dueDate: string;
  }) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function TaskForm({ members, engagements, onCreate, onSuccess, onCancel, loading }: TaskFormProps) {
  const { toast } = useToast();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      engagementId: engagements[0]?.id ?? '',
      assigneeId: members[0]?.id ?? '',
    },
  });

  useEffect(() => {
    if (engagements.length > 0 && !form.getValues('engagementId')) {
      form.setValue('engagementId', engagements[0].id);
    }
    if (members.length > 0 && !form.getValues('assigneeId')) {
      form.setValue('assigneeId', members[0].id);
    }
  }, [engagements, members, form]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      await onCreate({
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        status: data.status,
        priority: data.priority,
        engagementId: data.engagementId,
        dueDate: data.dueDate.toISOString().split('T')[0],
      });
      form.reset();
      toast({ title: 'Task created successfully' });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to create task',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const assigneeOptions = useMemo(() => {
    if (members.length === 0) {
      return [
        <SelectItem key="none" value="">
          No members available
        </SelectItem>,
      ];
    }
    return members.map((member) => (
      <SelectItem key={member.id} value={member.id}>
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4" />
          <span>{member.name}</span>
          <span className="text-xs text-muted-foreground">({member.role})</span>
        </div>
      </SelectItem>
    ));
  }, [members]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter task title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add task description" className="min-h-20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engagementId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Engagement</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {engagements.length === 0 ? (
                      <SelectItem value="__unavailable__" disabled>
                        No engagements available
                      </SelectItem>
                    ) : (
                      engagements.map((engagement) => (
                        <SelectItem key={engagement.id} value={engagement.id}>
                          {engagement.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>{assigneeOptions}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Task'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
