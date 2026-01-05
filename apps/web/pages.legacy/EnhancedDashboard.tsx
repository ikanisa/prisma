/**
 * Enhanced Dashboard
 * 
 * Redesigned dashboard using ChatKit widgets with animations and responsive design
 */

'use client';

import { motion } from 'framer-motion';
import { useOrganizations } from '@/hooks/use-organizations';
import { useClients } from '@/hooks/use-clients';
import { useEngagements } from '@/hooks/use-engagements';
import { useTasks } from '@/hooks/use-tasks';
import { AnimatedPage } from '@/components/ui/animated';
import { EnhancedWidgetRenderer } from '@/components/features/chatkit/EnhancedWidgetRenderer';
import {
  createCard,
  createTitle,
  createText,
  createButton,
  createChart,
  createBadge,
  createListView,
  createListViewItem,
  createBox,
  createRow,
  createCol,
  createSpacer,
  type WidgetComponent,
} from '@prisma/lib/openai/chatkit/widgets-complete';
import { useChatKitTheme } from '@/lib/theme';

export default function EnhancedDashboard() {
  const { currentOrg } = useOrganizations();
  const activeOrgId = currentOrg?.id ?? null;
  const { data: clients = [], isLoading: clientsLoading } = useClients(activeOrgId ?? undefined);
  const { data: engagements = [], isLoading: engagementsLoading } = useEngagements(activeOrgId ?? undefined);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(activeOrgId ?? undefined);
  const { theme } = useChatKitTheme();

  const isBusy = clientsLoading || engagementsLoading || tasksLoading;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;

  // Create widget-based stats
  const statsWidgets: WidgetComponent[] = [
    createCard({
      children: [
        createTitle({ value: 'Active Clients', size: 'sm' }),
        createText({ 
          value: isBusy ? '—' : clients.length.toString(), 
          size: 'xl', 
          weight: 'bold' 
        }),
        createBadge({ label: '+12%', color: 'success', variant: 'soft' }),
      ],
      padding: 4,
    }),
    createCard({
      children: [
        createTitle({ value: 'Engagements', size: 'sm' }),
        createText({ 
          value: isBusy ? '—' : engagements.length.toString(), 
          size: 'xl', 
          weight: 'bold' 
        }),
        createBadge({ label: '+8%', color: 'success', variant: 'soft' }),
      ],
      padding: 4,
    }),
    createCard({
      children: [
        createTitle({ value: 'Completed Tasks', size: 'sm' }),
        createText({ 
          value: isBusy ? '—' : completedTasks.toString(), 
          size: 'xl', 
          weight: 'bold' 
        }),
        createBadge({ label: '+23%', color: 'success', variant: 'soft' }),
      ],
      padding: 4,
    }),
    createCard({
      children: [
        createTitle({ value: 'Revenue', size: 'sm' }),
        createText({ 
          value: '$124K', 
          size: 'xl', 
          weight: 'bold' 
        }),
        createBadge({ label: '+15%', color: 'success', variant: 'soft' }),
      ],
      padding: 4,
    }),
  ];

  // Chart data
  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'TODO').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length },
    { name: 'Review', value: tasks.filter(t => t.status === 'REVIEW').length },
    { name: 'Completed', value: completedTasks },
  ];

  const monthlyRevenueData = [
    { month: 'Jul', revenue: 85000 },
    { month: 'Aug', revenue: 95000 },
    { month: 'Sep', revenue: 110000 },
    { month: 'Oct', revenue: 105000 },
    { month: 'Nov', revenue: 120000 },
    { month: 'Dec', revenue: 124000 },
  ];

  // Create chart widget
  const revenueChartWidget = createChart({
    data: monthlyRevenueData,
    series: [
      { type: 'bar', dataKey: 'revenue', label: 'Revenue', color: theme.color.accent.primary },
    ],
    xAxis: 'month',
    showYAxis: true,
    showLegend: true,
    showTooltip: true,
    height: 240,
  });

  // Recent activity list
  const activityItems = [
    {
      children: [
        createText({ value: `${overdueTasks} overdue tasks`, size: 'sm', weight: 'medium' }),
        createText({ value: 'Review and update task deadlines', size: 'xs', color: 'secondary' }),
      ],
      onClickAction: {
        type: 'navigate',
        payload: { path: '/tasks' },
      },
    },
    {
      children: [
        createText({ value: `${completedTasks} tasks completed this month`, size: 'sm', weight: 'medium' }),
        createText({ value: 'Great progress on your goals', size: 'xs', color: 'secondary' }),
      ],
    },
    {
      children: [
        createText({ value: `${clients.length} active clients`, size: 'sm', weight: 'medium' }),
        createText({ value: 'All client relationships are up to date', size: 'xs', color: 'secondary' }),
      ],
    },
  ].filter(item => item.children[0].value !== '0 overdue tasks' || overdueTasks > 0);

  const activityListWidget = createListView({
    children: activityItems.map((item, index) =>
      createListViewItem({
        id: `activity-${index}`,
        children: item.children,
        onClickAction: item.onClickAction,
      })
    ),
    status: { text: 'Recent Activity', icon: 'calendar' },
  });

  return (
    <AnimatedPage className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <EnhancedWidgetRenderer
          widget={createTitle({ 
            value: 'Dashboard', 
            size: '3xl',
            weight: 'bold',
          })}
        />
        <EnhancedWidgetRenderer
          widget={createText({ 
            value: 'Welcome back to Prisma Glow', 
            size: 'md',
            color: 'secondary',
          })}
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {statsWidgets.map((widget, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <EnhancedWidgetRenderer widget={widget} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts and Activity Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-6 md:grid-cols-2"
      >
        {/* Revenue Chart */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="rounded-lg border bg-card p-4"
        >
          <EnhancedWidgetRenderer
            widget={createCard({
              children: [
                createTitle({ value: 'Monthly Revenue', size: 'lg' }),
                revenueChartWidget,
              ],
              padding: 0,
            })}
          />
        </motion.div>

        {/* Activity List */}
        <motion.div
          whileHover={{ scale: 1.01 }}
        >
          <EnhancedWidgetRenderer widget={activityListWidget} />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <EnhancedWidgetRenderer
          widget={createCard({
            children: [
              createTitle({ value: 'Quick Actions', size: 'lg' }),
              createRow({
                gap: 3,
                children: [
                  createButton({
                    label: 'New Engagement',
                    iconStart: 'plus',
                    color: 'primary',
                    onClickAction: {
                      type: 'navigate',
                      payload: { path: '/engagements/new' },
                    },
                  }),
                  createButton({
                    label: 'Add Client',
                    iconStart: 'user',
                    color: 'secondary',
                    onClickAction: {
                      type: 'navigate',
                      payload: { path: '/clients/new' },
                    },
                  }),
                  createButton({
                    label: 'View Tasks',
                    iconStart: 'check-square',
                    color: 'info',
                    onClickAction: {
                      type: 'navigate',
                      payload: { path: '/tasks' },
                    },
                  }),
                ],
              }),
            ],
            padding: 4,
          })}
        />
      </motion.div>
    </AnimatedPage>
  );
}

