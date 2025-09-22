import { motion } from 'framer-motion';
import { BarChart3, Users, Briefcase, CheckSquare, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/mock-data';

export function Dashboard() {
  const { currentOrg, getCurrentUserRole, getOrgClients, getOrgEngagements, getOrgTasks } = useAppStore();
  const userRole = getCurrentUserRole();
  
  const clients = getOrgClients(currentOrg?.id || '');
  const engagements = getOrgEngagements(currentOrg?.id || '');
  const tasks = getOrgTasks(currentOrg?.id || '');

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
  
  const stats = [
    { title: 'Active Clients', value: clients.length, icon: Users, color: 'text-blue-500', trend: '+12%' },
    { title: 'Engagements', value: engagements.length, icon: Briefcase, color: 'text-green-500', trend: '+8%' },
    { title: 'Completed Tasks', value: completedTasks, icon: CheckSquare, color: 'text-purple-500', trend: '+23%' },
    { title: 'Revenue', value: '$124K', icon: TrendingUp, color: 'text-orange-500', trend: '+15%' },
  ];

  // Chart data
  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'TODO').length, color: '#94a3b8' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#3b82f6' },
    { name: 'Review', value: tasks.filter(t => t.status === 'REVIEW').length, color: '#f59e0b' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length, color: '#10b981' },
  ];

  const monthlyRevenueData = [
    { month: 'Jul', revenue: 85000 },
    { month: 'Aug', revenue: 95000 },
    { month: 'Sep', revenue: 110000 },
    { month: 'Oct', revenue: 105000 },
    { month: 'Nov', revenue: 120000 },
    { month: 'Dec', revenue: 124000 },
  ];

  const engagementTypeData = [
    { name: 'Accounting', value: engagements.filter(e => e.type === 'ACCOUNTING').length, color: '#8b5cf6' },
    { name: 'Audit', value: engagements.filter(e => e.type === 'AUDIT').length, color: '#06b6d4' },
    { name: 'Tax', value: engagements.filter(e => e.type === 'TAX').length, color: '#f97316' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to Aurora Advisors</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500 font-medium">{stat.trend}</span>
                  <span className="text-xs text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activity Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5" />
                <span>Task Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed</span>
                  <span className="font-medium">{completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">In Progress</span>
                  <span className="font-medium">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overdue</span>
                  <span className="font-medium text-destructive">{overdueTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Engagement Types</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accounting</span>
                  <span className="font-medium">{engagements.filter(e => e.type === 'ACCOUNTING').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Audit</span>
                  <span className="font-medium">{engagements.filter(e => e.type === 'AUDIT').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tax</span>
                  <span className="font-medium">{engagements.filter(e => e.type === 'TAX').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Monthly Growth</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Revenue</span>
                  <span className="font-medium text-green-600">+15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Clients</span>
                  <span className="font-medium text-green-600">+12%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tasks</span>
                  <span className="font-medium text-green-600">+23%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueTasks > 0 && (
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {overdueTasks} overdue task{overdueTasks > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Review and update task deadlines
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    {completedTasks} tasks completed this month
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Great progress on your goals
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    {clients.length} active clients
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All client relationships are up to date
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}