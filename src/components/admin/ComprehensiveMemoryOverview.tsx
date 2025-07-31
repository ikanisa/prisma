import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Database, 
  Clock, 
  Users,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Zap,
  Search,
  Archive,
  Activity,
  Target
} from 'lucide-react';

interface MemoryStats {
  totalMemoryEntries: number;
  enhancedMemoryEntries: number;
  conversationMemories: number;
  consolidationLogs: number;
  memoryAccessPatterns: number;
  avgConfidenceScore: number;
  memoryUtilization: number;
  lastConsolidation: string;
}

interface MemoryEntry {
  id: string;
  type: string;
  key: string;
  value: any;
  confidenceScore?: number;
  importanceWeight?: number;
  lastAccessed?: string;
  expiresAt?: string;
  userId?: string;
}

interface ConsolidationLog {
  id: string;
  status: string;
  memoriesProcessed: number;
  improvedCount: number;
  timestamp: string;
  performance_metrics: any;
}

export function ComprehensiveMemoryOverview() {
  const [stats, setStats] = useState<MemoryStats>({
    totalMemoryEntries: 0,
    enhancedMemoryEntries: 0,
    conversationMemories: 0,
    consolidationLogs: 0,
    memoryAccessPatterns: 0,
    avgConfidenceScore: 0,
    memoryUtilization: 0,
    lastConsolidation: ''
  });
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [consolidationLogs, setConsolidationLogs] = useState<ConsolidationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComprehensiveMemoryData();
  }, []);

  const fetchComprehensiveMemoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch all memory-related data
      const [
        basicMemoryData,
        enhancedMemoryData,
        conversationMemoryData,
        consolidationData,
        accessPatternsData
      ] = await Promise.all([
        supabase.from('agent_memory').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('agent_memory_enhanced').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('user_memory_enhanced').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('memory_consolidation_log').select('*').order('consolidated_at', { ascending: false }).limit(5),
        supabase.from('memory_access_patterns').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      // Calculate stats
      const totalMemoryEntries = (basicMemoryData.data?.length || 0) + (enhancedMemoryData.data?.length || 0);
      const enhancedMemoryEntries = enhancedMemoryData.data?.length || 0;
      const conversationMemories = conversationMemoryData.data?.length || 0;
      const consolidationLogs = consolidationData.data?.length || 0;
      const memoryAccessPatterns = accessPatternsData.data?.length || 0;

      // Calculate average confidence score from enhanced memory
      const avgConfidenceScore = enhancedMemoryData.data?.length > 0 
        ? Math.round(enhancedMemoryData.data.reduce((sum, entry) => 
            sum + (entry.confidence_score || 0), 0) / enhancedMemoryData.data.length * 100)
        : 0;

      // Calculate memory utilization (simplified)
      const memoryUtilization = Math.min(
        Math.round((totalMemoryEntries / 1000) * 100), 100
      );

      const lastConsolidation = consolidationData.data?.[0]?.consolidated_at || '';

      setStats({
        totalMemoryEntries,
        enhancedMemoryEntries,
        conversationMemories,
        consolidationLogs,
        memoryAccessPatterns,
        avgConfidenceScore,
        memoryUtilization,
        lastConsolidation
      });

      // Combine memory entries from different sources
      const entries: MemoryEntry[] = [
        ...(basicMemoryData.data?.map(entry => ({
          id: entry.id,
          type: 'Basic Memory',
          key: entry.memory_type,
          value: entry.memory_value,
          userId: entry.user_id,
          lastAccessed: entry.updated_at
        })) || []),
        ...(enhancedMemoryData.data?.map(entry => ({
          id: entry.id,
          type: 'Enhanced Memory',
          key: entry.memory_key,
          value: entry.memory_value,
          confidenceScore: entry.confidence_score,
          importanceWeight: entry.importance_weight,
          expiresAt: entry.expires_at,
          userId: entry.user_id,
          lastAccessed: entry.updated_at
        })) || [])
      ];

      setMemoryEntries(entries);
      // Transform consolidation data to match expected interface
      const transformedLogs = (consolidationData.data || []).map(log => ({
        id: log.id,
        status: 'completed',
        memoriesProcessed: 1,
        improvedCount: log.vector_stored ? 1 : 0,
        timestamp: log.consolidated_at,
        performance_metrics: log.key_insights
      }));
      setConsolidationLogs(transformedLogs);

    } catch (error) {
      console.error('Error fetching comprehensive memory data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch memory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerMemoryConsolidation = async () => {
    try {
      setProcessing(true);
      
      // Trigger enhanced memory consolidation
      const response = await supabase.functions.invoke('memory-consolidator-enhanced', {
        body: { 
          user_id: 'system',
          consolidation_type: 'comprehensive',
          include_patterns: true
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Memory Consolidation Started",
        description: "Enhanced memory consolidation is processing all memory entries"
      });

      // Refresh data after processing
      setTimeout(fetchComprehensiveMemoryData, 5000);

    } catch (error) {
      console.error('Error triggering memory consolidation:', error);
      toast({
        title: "Error",
        description: "Failed to start memory consolidation",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const optimizeMemoryAccess = async () => {
    try {
      setProcessing(true);
      
      // Trigger memory optimization through context memory
      const response = await supabase.functions.invoke('context-memory-v3', {
        body: { 
          action: 'optimize',
          scope: 'all_users',
          priority: 'high'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Memory Optimization Started",
        description: "Access patterns and memory efficiency are being optimized"
      });

      setTimeout(fetchComprehensiveMemoryData, 3000);

    } catch (error) {
      console.error('Error optimizing memory:', error);
      toast({
        title: "Error",
        description: "Failed to start memory optimization",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getMemoryTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'basic memory': return 'text-blue-600 bg-blue-50';
      case 'enhanced memory': return 'text-purple-600 bg-purple-50';
      case 'conversation memory': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatMemoryValue = (value: any) => {
    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length > 50 
        ? JSON.stringify(value).substring(0, 50) + '...'
        : JSON.stringify(value);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading comprehensive memory overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Memory System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Agent Memory System</span>
          </CardTitle>
          <CardDescription>
            Comprehensive view of agent memory, learning patterns, and knowledge retention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{stats.avgConfidenceScore}%</div>
              <div className="text-sm text-blue-700">Avg Confidence</div>
              <Progress value={stats.avgConfidenceScore} className="mt-2 h-2" />
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{stats.memoryUtilization}%</div>
              <div className="text-sm text-green-700">Memory Utilization</div>
              <Progress value={stats.memoryUtilization} className="mt-2 h-2" />
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{stats.totalMemoryEntries}</div>
              <div className="text-sm text-purple-700">Total Memories</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">
                {stats.lastConsolidation ? new Date(stats.lastConsolidation).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm text-orange-700">Last Consolidation</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              onClick={triggerMemoryConsolidation} 
              disabled={processing}
              variant="outline"
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Consolidate Memory
            </Button>
            
            <Button 
              onClick={optimizeMemoryAccess} 
              disabled={processing}
              variant="outline"
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Target className="h-4 w-4 mr-2" />
              )}
              Optimize Access
            </Button>

            <Button 
              onClick={fetchComprehensiveMemoryData} 
              disabled={processing}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enhanced Memory</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enhancedMemoryEntries}</div>
            <p className="text-xs text-muted-foreground">
              High-confidence structured memories with metadata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversation Memory</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversationMemories}</div>
            <p className="text-xs text-muted-foreground">
              User-specific conversation context and history
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Patterns</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memoryAccessPatterns}</div>
            <p className="text-xs text-muted-foreground">
              Memory retrieval and usage analytics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consolidation Runs</CardTitle>
            <Archive className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consolidationLogs}</div>
            <p className="text-xs text-muted-foreground">
              Memory optimization and cleanup operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Cache</CardTitle>
            <Database className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Fast-access memory cache for real-time responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">High</div>
            <p className="text-xs text-muted-foreground">
              Active learning and memory formation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Memory Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Memory Entries</CardTitle>
            <CardDescription>Latest memories across all types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memoryEntries.slice(0, 8).map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={getMemoryTypeColor(entry.type)}>
                    {entry.type}
                  </Badge>
                  {entry.confidenceScore && (
                    <Badge variant="outline">
                      {Math.round(entry.confidenceScore * 100)}% confidence
                    </Badge>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium">{entry.key}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMemoryValue(entry.value)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {entry.userId ? `User: ${entry.userId.substring(0, 8)}...` : 'System'}
                  </span>
                  <span>
                    {entry.lastAccessed ? new Date(entry.lastAccessed).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consolidation History</CardTitle>
            <CardDescription>Recent memory optimization runs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {consolidationLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                    {log.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Processed:</span>
                    <span className="ml-1 font-medium">{log.memoriesProcessed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Improved:</span>
                    <span className="ml-1 font-medium">{log.improvedCount}</span>
                  </div>
                </div>

                {log.performance_metrics && (
                  <div className="text-xs bg-muted p-2 rounded">
                    Efficiency: {log.performance_metrics.efficiency_score || 'N/A'}%
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}