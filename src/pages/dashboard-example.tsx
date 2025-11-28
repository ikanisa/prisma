/**
 * EXAMPLE: Refactored Dashboard Page
 * 
 * This demonstrates the new minimalist, responsive, and intelligent design.
 * Use this as a template for refactoring other pages.
 * 
 * Key Features:
 * - Fluid responsive layout (Grid, Stack, Container)
 * - Compound DataCard components
 * - AI-powered QuickActions
 * - Smooth animations
 * - Mobile-first approach
 * - Accessibility features
 */

import { motion } from 'framer-motion';
import { 
  Briefcase, CheckSquare, FileText, TrendingUp, 
  ArrowRight, AlertTriangle, Users, Calendar
} from 'lucide-react';

// Layout components
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { Container } from '@/components/layout/Container';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';

// UI components
import { DataCard } from '@/components/ui/DataCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';

// Smart components
import { QuickActions } from '@/components/smart/QuickActions';
import { FloatingAssistant } from '@/components/smart/FloatingAssistant';

// Hooks
import { useResponsive } from '@/hooks/useResponsive';

// Animation variants
import { staggerContainer, staggerItem } from '@/lib/animations';

export function DashboardExamplePage() {
  const { isMobile } = useResponsive();

  // Mock data - replace with real data
  const metrics = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: '$1,234,567',
      change: '+12.5%',
      trend: 'up' as const,
      icon: TrendingUp,
    },
    {
      id: 'projects',
      title: 'Active Projects',
      value: '24',
      change: '+3',
      trend: 'up' as const,
      icon: Briefcase,
    },
    {
      id: 'tasks',
      title: 'Pending Tasks',
      value: '142',
      change: '-8',
      trend: 'down' as const,
      icon: CheckSquare,
    },
    {
      id: 'documents',
      title: 'New Documents',
      value: '89',
      change: '+15',
      trend: 'up' as const,
      icon: FileText,
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'document',
      title: 'Q4 Financial Report uploaded',
      user: 'John Doe',
      time: '2 hours ago',
    },
    {
      id: '2',
      type: 'task',
      title: 'Compliance review completed',
      user: 'Jane Smith',
      time: '4 hours ago',
    },
    {
      id: '3',
      type: 'project',
      title: 'New audit project created',
      user: 'Mike Johnson',
      time: '6 hours ago',
    },
  ];

  const upcomingDeadlines = [
    {
      id: '1',
      title: 'Tax Filing Deadline',
      date: '2024-01-15',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Quarterly Report',
      date: '2024-01-20',
      priority: 'medium',
    },
  ];

  const handleQuickAction = (actionId: string) => {
    console.log('Quick action triggered:', actionId);
    // Implement actual action handlers
  };

  return (
    <AnimatedPage>
      <Container size="lg" className="py-8">
        <Stack gap="lg">
          {/* Header Section */}
          <Stack direction={isMobile ? 'vertical' : 'horizontal'} justify="between" align="center" gap="md">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's what's happening today.
              </p>
            </div>
            {!isMobile && (
              <Stack direction="horizontal" gap="sm">
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </Stack>
            )}
          </Stack>

          {/* AI Quick Actions */}
          <QuickActions onAction={handleQuickAction} />

          {/* Metrics Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
          >
            <Grid cols={isMobile ? 2 : 4} gap="md">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <motion.div key={metric.id} variants={staggerItem}>
                    <DataCard className="hover:shadow-lg transition-shadow">
                      <DataCard.Header className="flex items-center justify-between">
                        <DataCard.Title>{metric.title}</DataCard.Title>
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </DataCard.Header>
                      <DataCard.Content>
                        <DataCard.Value trend={metric.trend}>
                          {metric.value}
                        </DataCard.Value>
                        <DataCard.Label>
                          {metric.change} from last month
                        </DataCard.Label>
                      </DataCard.Content>
                    </DataCard>
                  </motion.div>
                );
              })}
            </Grid>
          </motion.div>

          {/* Main Content Grid */}
          <Grid cols={isMobile ? 1 : 2} gap="lg">
            {/* Recent Activity */}
            <DataCard>
              <DataCard.Header>
                <DataCard.Title>Recent Activity</DataCard.Title>
              </DataCard.Header>
              <DataCard.Content>
                {recentActivities.length > 0 ? (
                  <Stack gap="sm">
                    {recentActivities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {activity.user} · {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No recent activity"
                    description="Activity will appear here as team members work"
                  />
                )}
              </DataCard.Content>
            </DataCard>

            {/* Upcoming Deadlines */}
            <DataCard>
              <DataCard.Header className="flex items-center justify-between">
                <DataCard.Title>Upcoming Deadlines</DataCard.Title>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </DataCard.Header>
              <DataCard.Content>
                {upcomingDeadlines.length > 0 ? (
                  <Stack gap="sm">
                    {upcomingDeadlines.map((deadline) => (
                      <motion.div
                        key={deadline.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          deadline.priority === 'high' 
                            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' 
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400'
                        }`}>
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{deadline.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(deadline.date).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title="No upcoming deadlines"
                    description="You're all caught up!"
                  />
                )}
              </DataCard.Content>
            </DataCard>
          </Grid>

          {/* Team Performance (Full Width) */}
          <DataCard>
            <DataCard.Header className="flex items-center justify-between">
              <div>
                <DataCard.Title>Team Performance</DataCard.Title>
                <p className="text-sm text-muted-foreground mt-1">
                  Overview of team activity this month
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </DataCard.Header>
            <DataCard.Content>
              {/* This would contain charts/graphs */}
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <p className="text-muted-foreground">
                  Chart component would go here
                </p>
              </div>
            </DataCard.Content>
          </DataCard>
        </Stack>
      </Container>

      {/* Floating AI Assistant */}
      <FloatingAssistant />
    </AnimatedPage>
  );
}
