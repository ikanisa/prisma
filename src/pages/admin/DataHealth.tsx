import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Activity, Users, MessageSquare, Brain } from "lucide-react";

interface TableCount {
  table: string;
  count: number;
  category: string;
}

export default function DataHealth() {
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  const tables = [
    { name: 'users', category: 'Core' },
    { name: 'contacts', category: 'Core' },
    { name: 'conversations', category: 'Messaging' },
    { name: 'agent_memory', category: 'AI' },
    { name: 'agent_memory_enhanced', category: 'AI' },
    { name: 'agent_tool_calls', category: 'AI' },
    { name: 'agent_skills', category: 'AI' },
    { name: 'agent_learning', category: 'AI' },
    { name: 'automated_tasks', category: 'Tasks' },
    { name: 'agent_tasks', category: 'Tasks' },
    { name: 'memory_consolidation_log', category: 'Analytics' },
    { name: 'mcp_model_registry', category: 'Config' },
  ];

  const fetchTableCounts = async () => {
    setLoading(true);
    const counts: TableCount[] = [];

    for (const table of tables) {
      try {
        const { count } = await supabase
          .from(table.name as any)
          .select('*', { count: 'exact', head: true });
        
        counts.push({
          table: table.name,
          count: count || 0,
          category: table.category
        });
      } catch (error) {
        console.error(`Error fetching count for ${table.name}:`, error);
        counts.push({
          table: table.name,
          count: 0,
          category: table.category
        });
      }
    }

    setTableCounts(counts);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Core': return <Users className="h-4 w-4" />;
      case 'Messaging': return <MessageSquare className="h-4 w-4" />;
      case 'AI': return <Brain className="h-4 w-4" />;
      case 'Tasks': return <Activity className="h-4 w-4" />;
      case 'Analytics': return <Database className="h-4 w-4" />;
      case 'Config': return <Database className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Core': return 'bg-blue-100 text-blue-800';
      case 'Messaging': return 'bg-green-100 text-green-800';
      case 'AI': return 'bg-purple-100 text-purple-800';
      case 'Tasks': return 'bg-orange-100 text-orange-800';
      case 'Analytics': return 'bg-gray-100 text-gray-800';
      case 'Config': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedTables = tableCounts.reduce((acc, table) => {
    if (!acc[table.category]) {
      acc[table.category] = [];
    }
    acc[table.category].push(table);
    return acc;
  }, {} as Record<string, TableCount[]>);

  const totalRecords = tableCounts.reduce((sum, table) => sum + table.count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data health...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Health Overview</h1>
          <p className="text-muted-foreground">
            Monitor database table counts and system health
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Records</div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedTables).map(([category, tables]) => (
          <Card key={category}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-4">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(category)}
                <CardTitle className="text-lg">{category}</CardTitle>
              </div>
              <Badge className={getCategoryColor(category)}>
                {tables.reduce((sum, t) => sum + t.count, 0)} records
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <div
                    key={table.table}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{table.table}</div>
                      <div className="text-xs text-muted-foreground">records</div>
                    </div>
                    <div className="text-lg font-bold">
                      {table.count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <button
              onClick={fetchTableCounts}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Data
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}