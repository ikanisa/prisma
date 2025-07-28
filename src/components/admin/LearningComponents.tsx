import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BookOpen,
  MessageSquare,
  Database
} from 'lucide-react';

interface LearningModule {
  id: string;
  title: string;
  content: string;
  summary: string;
  auto_tags: string[];
  relevance_score: number;
  vector_count: number;
  created_at: string;
  updated_at: string;
}

interface ConversationLearning {
  id: string;
  user_id: string;
  learning_summary: string;
  confidence_level: number;
  improvement_note: string;
  timestamp: string;
}

interface LearningStats {
  totalModules: number;
  avgRelevance: number;
  totalVectors: number;
  conversationInsights: number;
  lastLearningUpdate: string;
}

export function LearningComponents() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [conversations, setConversations] = useState<ConversationLearning[]>([]);
  const [stats, setStats] = useState<LearningStats>({
    totalModules: 0,
    avgRelevance: 0,
    totalVectors: 0,
    conversationInsights: 0,
    lastLearningUpdate: ''
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    try {
      setLoading(true);
      
      const [modulesData, conversationsData] = await Promise.all([
        supabase.from('learning_modules').select('*').order('updated_at', { ascending: false }).limit(10),
        supabase.from('conversation_learning_log').select('*').order('timestamp', { ascending: false }).limit(10)
      ]);

      if (modulesData.error) throw modulesData.error;
      if (conversationsData.error) throw conversationsData.error;

      setModules(modulesData.data || []);
      setConversations(conversationsData.data || []);

      // Calculate stats
      const totalModules = modulesData.data?.length || 0;
      const avgRelevance = totalModules > 0 
        ? Math.round(modulesData.data.reduce((sum, m) => sum + (m.relevance_score || 0), 0) / totalModules)
        : 0;
      const totalVectors = modulesData.data?.reduce((sum, m) => sum + (m.vector_count || 0), 0) || 0;
      const conversationInsights = conversationsData.data?.length || 0;
      const lastUpdate = modulesData.data?.[0]?.updated_at || '';

      setStats({
        totalModules,
        avgRelevance,
        totalVectors,
        conversationInsights,
        lastLearningUpdate: lastUpdate
      });

    } catch (error) {
      console.error('Error fetching learning data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch learning data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const ingestAndTag = async (moduleId: string) => {
    try {
      setProcessing(true);
      
      // Process document through dynamic learning processor
      const learningResponse = await supabase.functions.invoke('dynamic-learning-processor', {
        body: { 
          documentId: moduleId,
          action: 'extract_skills',
          priority: 'high'
        }
      });

      if (learningResponse.error) throw learningResponse.error;

      // Tag the module
      const tagResponse = await supabase.functions.invoke('ingest-tag', {
        body: { module_id: moduleId }
      });

      if (tagResponse.error) throw tagResponse.error;

      // Generate summary
      const summaryResponse = await supabase.functions.invoke('ingest-summary', {
        body: { module_id: moduleId }
      });

      if (summaryResponse.error) throw summaryResponse.error;

      // Create embeddings
      const embedResponse = await supabase.functions.invoke('ingest-embed', {
        body: { module_id: moduleId }
      });

      if (embedResponse.error) throw embedResponse.error;

      toast({
        title: "Dynamic Learning Complete",
        description: `Module processed with ${learningResponse.data?.skills_extracted || 0} skills extracted and embedded`
      });

      // Refresh data
      await fetchLearningData();

    } catch (error) {
      console.error('Error processing module:', error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process module",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const consolidateMemory = async () => {
    try {
      setProcessing(true);
      
      // Enhanced memory consolidation with dynamic learning
      const response = await supabase.functions.invoke('memory-consolidator-enhanced', {
        body: { 
          user_id: 'system',
          consolidation_type: 'full'
        }
      });

      if (response.error) throw response.error;

      // Trigger dynamic learning update
      await supabase.functions.invoke('dynamic-learning-processor', {
        body: { 
          action: 'enhance_capabilities',
          priority: 'medium'
        }
      });

      toast({
        title: "Enhanced Memory Consolidation Started",
        description: "Agent memory and capabilities are being dynamically optimized"
      });

      // Refresh after a delay
      setTimeout(fetchLearningData, 3000);

    } catch (error) {
      console.error('Error consolidating memory:', error);
      toast({
        title: "Error",
        description: "Failed to start memory consolidation",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const reinforceLearning = async () => {
    try {
      setProcessing(true);
      
      const response = await supabase.functions.invoke('memory-reinforcement', {
        body: { 
          phone_number: 'system',
          reinforcement_type: 'pattern_analysis'
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Learning Reinforcement Started",
        description: "Analyzing patterns and reinforcing learning"
      });

      setTimeout(fetchLearningData, 3000);

    } catch (error) {
      console.error('Error reinforcing learning:', error);
      toast({
        title: "Error",
        description: "Failed to start learning reinforcement",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading learning components...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Modules</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalVectors} vectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRelevance}%</div>
            <Progress value={stats.avgRelevance} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversation Insights</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversationInsights}</div>
            <p className="text-xs text-muted-foreground">
              Recent learnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats.lastLearningUpdate 
                ? new Date(stats.lastLearningUpdate).toLocaleDateString()
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Learning refresh
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Operations</CardTitle>
          <CardDescription>
            Manage AI learning processes and memory optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={consolidateMemory} 
              disabled={processing}
              variant="outline"
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Consolidate Memory
            </Button>
            
            <Button 
              onClick={reinforceLearning} 
              disabled={processing}
              variant="outline"
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Reinforce Learning
            </Button>
            
            <Button 
              onClick={fetchLearningData} 
              disabled={processing}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Learning Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Learning Modules</CardTitle>
            <CardDescription>Latest knowledge modules and processing status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modules.map((module) => (
              <div key={module.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{module.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant={module.relevance_score > 80 ? 'default' : 'secondary'}>
                      {module.relevance_score}% relevant
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ingestAndTag(module.id)}
                      disabled={processing}
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {module.auto_tags && module.auto_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {module.auto_tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{module.vector_count || 0} vectors</span>
                  <span>{new Date(module.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Learning</CardTitle>
            <CardDescription>Insights gained from user interactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.map((conv) => (
              <div key={conv.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">User Interaction</span>
                  <Badge variant={conv.confidence_level > 0.8 ? 'default' : 'secondary'}>
                    {Math.round(conv.confidence_level * 100)}% confidence
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {conv.learning_summary}
                </p>
                
                {conv.improvement_note && (
                  <div className="text-xs bg-muted p-2 rounded">
                    <strong>Improvement:</strong> {conv.improvement_note}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {new Date(conv.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}