import { Calculator, DollarSign, TrendingUp, FileSpreadsheet, Calendar } from 'lucide-react';

const stats = [
  { label: 'Revenue YTD', value: '$1.2M', change: '+12%', icon: DollarSign },
  { label: 'Expenses YTD', value: '$890K', change: '+8%', icon: TrendingUp },
  { label: 'Open Invoices', value: '23', change: '-5%', icon: FileSpreadsheet },
];

const closingTasks = [
  { id: 1, title: 'Bank Reconciliation', dueDate: 'Dec 31, 2024', status: 'in_progress' },
  { id: 2, title: 'Accounts Receivable Review', dueDate: 'Dec 28, 2024', status: 'pending' },
  { id: 3, title: 'Payroll Processing', dueDate: 'Dec 25, 2024', status: 'completed' },
  { id: 4, title: 'Expense Report Review', dueDate: 'Dec 30, 2024', status: 'pending' },
];

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Accounting
          </h2>
          <p className="text-muted-foreground">
            Manage financial operations and month-end close
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Calculator className="h-4 w-4" />
          New Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change.startsWith('+');
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Month-End Close Tasks */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">Month-End Close</h3>
          <span className="text-sm text-muted-foreground">December 2024</span>
        </div>
        <div className="divide-y divide-border">
          {closingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  readOnly
                  className="h-4 w-4 rounded border-border"
                />
                <div>
                  <h4 className="font-medium text-foreground">{task.title}</h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
