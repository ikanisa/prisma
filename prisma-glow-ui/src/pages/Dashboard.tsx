import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, CheckSquare, FileText, TrendingUp,
  ArrowRight, Plus, Clock, Users
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuickActions } from '@/components/smart/QuickActions';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useResponsive } from '@/hooks/useResponsive';

export function DashboardPage() {
  const { isMobile } = useResponsive();
  const [stats] = useState({
    activeEngagements: 12,
    pendingTasks: 28,
    documents: 156,
    teamMembers: 8,
  });

  return (
    <AnimatedPage className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Container size="lg" className="py-8">
        <Stack direction="vertical" gap="lg">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Welcome back 👋
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Here's what's happening with your work today
            </p>
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Stats Grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <Grid cols={4} gap="md">
              <motion.div variants={staggerItem}>
                <DataCard hoverable>
                  <DataCard.Metric
                    label="Active Engagements"
                    value={stats.activeEngagements}
                    trend="up"
                    trendValue="+2 this week"
                  />
                  <DataCard.Footer>
                    <a href="/engagements" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </DataCard.Footer>
                </DataCard>
              </motion.div>

              <motion.div variants={staggerItem}>
                <DataCard hoverable>
                  <DataCard.Metric
                    label="Pending Tasks"
                    value={stats.pendingTasks}
                    trend="down"
                    trendValue="-5 from yesterday"
                  />
                  <DataCard.Footer>
                    <a href="/tasks" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </DataCard.Footer>
                </DataCard>
              </motion.div>

              <motion.div variants={staggerItem}>
                <DataCard hoverable>
                  <DataCard.Metric
                    label="Documents"
                    value={stats.documents}
                    trend="up"
                    trendValue="+12 this month"
                  />
                  <DataCard.Footer>
                    <a href="/documents" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </DataCard.Footer>
                </DataCard>
              </motion.div>

              <motion.div variants={staggerItem}>
                <DataCard hoverable>
                  <DataCard.Metric
                    label="Team Members"
                    value={stats.teamMembers}
                    trend="neutral"
                  />
                  <DataCard.Footer>
                    <a href="/team" className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </DataCard.Footer>
                </DataCard>
              </motion.div>
            </Grid>
          </motion.div>

          {/* Recent Activity & Upcoming */}
          <Grid cols={2} gap="md">
            <DataCard>
              <DataCard.Header>Recent Activity</DataCard.Header>
              <DataCard.Content>
                <Stack direction="vertical" gap="md">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          Document updated: Q4 Report
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          2 hours ago
                        </p>
                      </div>
                    </div>
                  ))}
                </Stack>
              </DataCard.Content>
            </DataCard>

            <DataCard>
              <DataCard.Header>Upcoming Deadlines</DataCard.Header>
              <DataCard.Content>
                <Stack direction="vertical" gap="md">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700 last:border-0 last:pb-0">
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          Review client proposal
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Due in 2 days
                        </p>
                      </div>
                    </div>
                  ))}
                </Stack>
              </DataCard.Content>
            </DataCard>
          </Grid>
        </Stack>
      </Container>
    </AnimatedPage>
  );
}
