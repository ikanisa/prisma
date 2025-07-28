import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Bot, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CleanupStats {
  agents_count: number;
  configs_count: number;
  skills_count: number;
  conversations_migrated: boolean;
}

export function SystemCleanupStatus() {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchCleanupStats();
  }, []);

  const fetchCleanupStats = async () => {
    try {
      const [agentsResult, configsResult, skillsResult, messagesResult] = await Promise.all([
        supabase.from('agents').select('id', { count: 'exact' }),
        supabase.from('agent_configs').select('id', { count: 'exact' }),
        supabase.from('omni_agent_skills').select('id', { count: 'exact' }),
        supabase.from('conversation_messages').select('id').contains('metadata', { agent_type: 'omni-agent' }).limit(1)
      ]);

      setStats({
        agents_count: agentsResult.count || 0,
        configs_count: configsResult.count || 0,
        skills_count: skillsResult.count || 0,
        conversations_migrated: (messagesResult.data?.length || 0) > 0
      });
    } catch (error) {
      console.error('Error fetching cleanup stats:', error);
    }
  };

  const runVerification = async () => {
    setVerifying(true);
    try {
      const { data } = await supabase.functions.invoke('system-cleanup', {
        body: { action: 'verify_cleanup' }
      });
      console.log('Verification results:', data);
      await fetchCleanupStats();
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading cleanup status...</div>
        </CardContent>
      </Card>
    );
  }

  const isOptimalState = stats.agents_count === 1 && stats.configs_count === 1 && stats.skills_count === 6;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Cleanup Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Agents</span>
            </div>
            <div className="text-2xl font-bold">{stats.agents_count}</div>
            <Badge variant={stats.agents_count === 1 ? "default" : "destructive"}>
              {stats.agents_count === 1 ? "Optimal" : "Needs Cleanup"}
            </Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Configs</span>
            </div>
            <div className="text-2xl font-bold">{stats.configs_count}</div>
            <Badge variant={stats.configs_count === 1 ? "default" : "destructive"}>
              {stats.configs_count === 1 ? "Optimal" : "Needs Cleanup"}
            </Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Skills</span>
            </div>
            <div className="text-2xl font-bold">{stats.skills_count}</div>
            <Badge variant={stats.skills_count === 6 ? "default" : "destructive"}>
              {stats.skills_count === 6 ? "Complete" : "Incomplete"}
            </Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Migration</span>
            </div>
            <div className="text-lg font-bold">
              {stats.conversations_migrated ? "✓" : "✗"}
            </div>
            <Badge variant={stats.conversations_migrated ? "default" : "destructive"}>
              {stats.conversations_migrated ? "Migrated" : "Pending"}
            </Badge>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOptimalState ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {isOptimalState ? "System Fully Optimized" : "Cleanup in Progress"}
              </span>
            </div>
            <Button 
              onClick={runVerification}
              disabled={verifying}
              variant="outline"
              size="sm"
            >
              {verifying ? "Verifying..." : "Verify Status"}
            </Button>
          </div>
          
          {isOptimalState && (
            <div className="mt-3 text-sm text-muted-foreground">
              ✅ Database structure optimized for Omni Agent architecture
              <br />
              ✅ Legacy multi-agent complexity eliminated
              <br />
              ✅ Skills-based routing active
              <br />
              ✅ Unified conversation tracking enabled
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}