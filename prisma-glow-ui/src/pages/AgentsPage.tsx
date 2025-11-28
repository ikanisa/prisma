import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { DataCard } from '@/components/ui/DataCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { staggerContainer, staggerItem } from '@/lib/animations';

const agentCategories = [
  {
    name: 'Orchestrators',
    count: 3,
    color: 'purple',
    agents: [
      { id: '001', name: 'Master Orchestrator', status: 'active', tasks: 15 },
      { id: '002', name: 'Engagement Orchestrator', status: 'active', tasks: 8 },
      { id: '003', name: 'Compliance Orchestrator', status: 'idle', tasks: 0 },
    ],
  },
  {
    name: 'Accounting',
    count: 8,
    color: 'blue',
    agents: [
      { id: '004', name: 'Financial Statements Specialist', status: 'active', tasks: 3 },
      { id: '005', name: 'Revenue Recognition Specialist', status: 'idle', tasks: 0 },
      { id: '006', name: 'Lease Accounting Specialist', status: 'idle', tasks: 0 },
    ],
  },
  {
    name: 'Audit',
    count: 10,
    color: 'green',
    agents: [
      { id: '012', name: 'Audit Planning Specialist', status: 'pending', tasks: 5 },
      { id: '013', name: 'Risk Assessment Specialist', status: 'active', tasks: 7 },
    ],
  },
  {
    name: 'Tax',
    count: 12,
    color: 'orange',
    agents: [
      { id: '022', name: 'EU Corporate Tax Specialist', status: 'active', tasks: 12 },
      { id: '023', name: 'US Corporate Tax Specialist', status: 'active', tasks: 9 },
    ],
  },
  {
    name: 'Corporate Services',
    count: 6,
    color: 'pink',
    agents: [
      { id: '034', name: 'Company Formation Specialist', status: 'active', tasks: 4 },
      { id: '035', name: 'Corporate Governance Specialist', status: 'idle', tasks: 0 },
    ],
  },
];

export function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const totalAgents = agentCategories.reduce((sum, cat) => sum + cat.count, 0);
  const activeAgents = agentCategories.reduce((sum, cat) => {
    return sum + cat.agents.filter(a => a.status === 'active').length;
  }, 0);

  return (
    <AnimatedPage className="min-h-screen">
      <Container size="lg" className="py-8">
        <Stack direction="vertical" gap="lg">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              AI Agent Ecosystem
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              47 specialized agents across 5 professional service domains
            </p>
          </div>

          {/* Stats */}
          <Grid cols={4} gap="md">
            <DataCard>
              <DataCard.Metric
                label="Total Agents"
                value={totalAgents}
                trend="neutral"
              />
            </DataCard>
            <DataCard>
              <DataCard.Metric
                label="Active Now"
                value={activeAgents}
                trend="up"
                trendValue="+3 since yesterday"
              />
            </DataCard>
            <DataCard>
              <DataCard.Metric
                label="Tasks Running"
                value={68}
                trend="up"
              />
            </DataCard>
            <DataCard>
              <DataCard.Metric
                label="Completion Rate"
                value="94%"
                trend="up"
              />
            </DataCard>
          </Grid>

          {/* Agent Categories */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Agent Categories
            </h2>
            <Stack direction="vertical" gap="md">
              {agentCategories.map((category) => (
                <motion.div key={category.name} variants={staggerItem}>
                  <DataCard hoverable onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? null : category.name
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg bg-${category.color}-100 dark:bg-${category.color}-900/20 flex items-center justify-center`}>
                          <Bot className={`h-6 w-6 text-${category.color}-600 dark:text-${category.color}-400`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {category.name}
                          </h3>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {category.count} agents
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="default">
                          {category.agents.filter(a => a.status === 'active').length} active
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-neutral-400" />
                      </div>
                    </div>

                    {/* Expanded Agent List */}
                    {selectedCategory === category.name && (
                      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <Stack direction="vertical" gap="sm">
                          {category.agents.map((agent) => (
                            <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                                  {agent.id}
                                </span>
                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {agent.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {agent.tasks > 0 && (
                                  <Badge variant="info" size="sm">
                                    {agent.tasks} tasks
                                  </Badge>
                                )}
                                {agent.status === 'active' && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                {agent.status === 'idle' && (
                                  <Clock className="h-4 w-4 text-neutral-400" />
                                )}
                                {agent.status === 'pending' && (
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </Stack>
                      </div>
                    )}
                  </DataCard>
                </motion.div>
              ))}
            </Stack>
          </motion.div>

          {/* Quick Actions */}
          <DataCard>
            <DataCard.Header>Quick Actions</DataCard.Header>
            <DataCard.Content>
              <Grid cols={3} gap="sm">
                <Button variant="default">
                  <Sparkles className="h-4 w-4" />
                  Deploy New Agent
                </Button>
                <Button variant="outline">
                  View Analytics
                </Button>
                <Button variant="ghost">
                  Agent Documentation
                </Button>
              </Grid>
            </DataCard.Content>
          </DataCard>
        </Stack>
      </Container>
    </AnimatedPage>
  );
}
