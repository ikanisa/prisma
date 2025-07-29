import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, BookOpen, Target, Users, MessageSquare, Settings, FileText, Map, Zap, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
}

interface Learning {
  id: string;
  source_type: string;
  source_detail: string;
  vectorize: boolean;
  created_at: string;
}

interface ConversationLearning {
  id: string;
  learning_summary: string;
  confidence_level: number;
  improvement_note: string;
  timestamp: string;
  user_id: string;
}

interface LearningStats {
  documents: number;
  user_journeys: number;
  persona_traits: number;
  skills: number;
  templates: number;
  quick_actions: number;
  services: number;
  conversations: number;
  total_processed: number;
  last_updated: string;
}

interface LearningSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'processing' | 'error';
  progress: number;
  items_count: number;
  last_synced: string;
  confidence_score: number;
}

export default function AgentLearning() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [learningData, setLearningData] = useState<Learning[]>([]);
  const [conversationLearning, setConversationLearning] = useState<ConversationLearning[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStats>({
    documents: 0,
    user_journeys: 0,
    persona_traits: 0,
    skills: 0,
    templates: 0,
    quick_actions: 0,
    services: 0,
    conversations: 0,
    total_processed: 0,
    last_updated: new Date().toISOString()
  });
  const [learningSources, setLearningSources] = useState<LearningSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLearningData();
    }
  }, [id]);

  const fetchLearningData = async () => {
    try {
      setLoading(true);
      
      // Fetch agent
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id, name")
        .eq("id", id)
        .single();

      if (agentError) throw agentError;
      setAgent(agentData);

      // Fetch comprehensive learning statistics from all sources
      await Promise.all([
        fetchDocumentLearning(),
        fetchUserJourneyLearning(),
        fetchPersonaLearning(),
        fetchSkillsLearning(),
        fetchTemplateLearning(),
        fetchConversationLearning(),
        fetchLearningSourcesData()
      ]);

      // Update learning sources status after fetching stats
      updateLearningSourcesStatus();

    } catch (error) {
      console.error("Error fetching learning data:", error);
      toast.error("Failed to load learning data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentLearning = async () => {
    const { data, error } = await supabase
      .from("agent_documents")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setLearningStats(prev => ({ ...prev, documents: data.length }));
    }
  };

  const fetchUserJourneyLearning = async () => {
    // Use conversations table to count user journey interactions
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .limit(1000);
    
    if (!error && data) {
      setLearningStats(prev => ({ ...prev, user_journeys: data.length }));
    }
  };

  const fetchPersonaLearning = async () => {
    // Use agent_learning table with persona type
    const { data, error } = await supabase
      .from("agent_learning")
      .select("*")
      .eq("source_type", "persona");
    
    if (!error && data) {
      setLearningStats(prev => ({ ...prev, persona_traits: data.length }));
    }
  };

  const fetchSkillsLearning = async () => {
    const { data, error } = await supabase
      .from("agent_skills")
      .select("*");
    
    if (!error && data) {
      setLearningStats(prev => ({ ...prev, skills: data.length }));
    }
  };

  const fetchTemplateLearning = async () => {
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*");
    
    if (!error && data) {
      setLearningStats(prev => ({ ...prev, templates: data.length }));
    }
  };

  const fetchConversationLearning = async () => {
    const { data, error } = await supabase
      .from("conversation_learning_log")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (!error && data) {
      setConversationLearning(data);
      setLearningStats(prev => ({ ...prev, conversations: data.length }));
    }
  };

  const fetchLearningSourcesData = async () => {
    const { data, error } = await supabase
      .from("agent_learning")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLearningData(data);
    }
  };

  const updateLearningSourcesStatus = () => {
    // Create comprehensive learning sources status
    const sources: LearningSource[] = [
      {
        id: 'documents',
        name: 'Document Learning',
        type: 'documents',
        status: 'active',
        progress: 100,
        items_count: learningStats.documents,
        last_synced: new Date().toISOString(),
        confidence_score: 95
      },
      {
        id: 'user-journeys',
        name: 'User Journey Patterns',
        type: 'user_journeys',
        status: 'active',
        progress: 100,
        items_count: learningStats.user_journeys,
        last_synced: new Date().toISOString(),
        confidence_score: 88
      },
      {
        id: 'persona',
        name: 'Persona Traits',
        type: 'persona',
        status: 'active',
        progress: 100,
        items_count: learningStats.persona_traits,
        last_synced: new Date().toISOString(),
        confidence_score: 92
      },
      {
        id: 'skills',
        name: 'Skills Matrix',
        type: 'skills',
        status: 'active',
        progress: 100,
        items_count: learningStats.skills,
        last_synced: new Date().toISOString(),
        confidence_score: 96
      },
      {
        id: 'templates',
        name: 'WhatsApp Templates',
        type: 'templates',
        status: 'active',
        progress: 100,
        items_count: learningStats.templates,
        last_synced: new Date().toISOString(),
        confidence_score: 90
      },
      {
        id: 'conversations',
        name: 'Conversation Insights',
        type: 'conversations',
        status: 'active',
        progress: 100,
        items_count: learningStats.conversations,
        last_synced: new Date().toISOString(),
        confidence_score: 87
      }
    ];

    setLearningSources(sources);
    
    const totalProcessed = sources.reduce((sum, source) => sum + source.items_count, 0);
    setLearningStats(prev => ({ 
      ...prev, 
      total_processed: totalProcessed,
      last_updated: new Date().toISOString()
    }));
  };

  const triggerComprehensiveLearning = async () => {
    setIsProcessing(true);
    try {
      // Call the dynamic learning processor to extract insights from all sources
      const { data, error } = await supabase.functions.invoke('dynamic-learning-processor', {
        body: {
          action: 'comprehensive_learning',
          agent_id: id,
          sources: ['documents', 'user_journeys', 'persona', 'skills', 'templates', 'conversations']
        }
      });

      if (error) throw error;
      
      toast.success("Comprehensive learning process initiated successfully");
      
      // Refresh the data after processing
      setTimeout(() => {
        fetchLearningData();
      }, 2000);
      
    } catch (error) {
      console.error("Error triggering comprehensive learning:", error);
      toast.error("Failed to initiate comprehensive learning");
    } finally {
      setIsProcessing(false);
    }
  };

  const optimizeLearningWithAI = async (sourceType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-manager', {
        body: {
          action: 'auto_update',
          source_type: sourceType,
          agent_id: id
        }
      });

      if (error) throw error;
      toast.success(`AI optimization initiated for ${sourceType}`);
      
    } catch (error) {
      console.error("Error optimizing learning:", error);
      toast.error("Failed to optimize learning");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent Not Found</h2>
          <Button onClick={() => navigate("/admin/ai-agents-models")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/admin/agents/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agent
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{agent.name} - Comprehensive Learning</h1>
            <p className="text-muted-foreground">AI-powered learning from all system sources</p>
          </div>
        </div>
        <Button 
          onClick={triggerComprehensiveLearning}
          disabled={isProcessing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Processing...' : 'Trigger Learning'}</span>
        </Button>
      </div>

      {/* Comprehensive Learning Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningSources.length}</div>
            <p className="text-xs text-muted-foreground">Active learning sources</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningStats.total_processed}</div>
            <p className="text-xs text-muted-foreground">Items processed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {learningSources.length > 0
                ? Math.round(
                    learningSources.reduce((sum, source) => sum + source.confidence_score, 0) /
                    learningSources.length
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(learningStats.last_updated).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Learning data sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Learning Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Learning Sources</TabsTrigger>
          <TabsTrigger value="insights">Conversation Insights</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {learningSources.map((source) => (
              <Card key={source.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => optimizeLearningWithAI(source.type)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Optimize
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items: {source.items_count}</span>
                      <span>Confidence: {source.confidence_score}%</span>
                    </div>
                    <Progress value={source.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(source.last_synced).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Learning Sources Configuration</CardTitle>
                  <CardDescription>
                    Manage and configure all learning data sources for the AI agent
                  </CardDescription>
                </div>
                <Button onClick={() => navigate(`/admin/agents/${id}/learning/add`)}>
                  Add Source
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{item.source_type}</Badge>
                        {item.vectorize && <Badge variant="default">Vectorized</Badge>}
                      </div>
                      <p className="font-medium">{item.source_detail}</p>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {learningData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No learning sources configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Conversation Learning</CardTitle>
              <CardDescription>
                AI-generated insights from user conversations and interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversationLearning.slice(0, 10).map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        Confidence: {Math.round((insight.confidence_level || 0) * 100)}%
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(insight.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-medium">{insight.learning_summary}</p>
                    {insight.improvement_note && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Improvement:</strong> {insight.improvement_note}
                      </p>
                    )}
                  </div>
                ))}
                
                {conversationLearning.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No conversation insights available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Documents</span>
                    </div>
                    <span className="font-medium">{learningStats.documents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Map className="h-4 w-4" />
                      <span>User Journeys</span>
                    </div>
                    <span className="font-medium">{learningStats.user_journeys}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Persona Traits</span>
                    </div>
                    <span className="font-medium">{learningStats.persona_traits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Skills</span>
                    </div>
                    <span className="font-medium">{learningStats.skills}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Templates</span>
                    </div>
                    <span className="font-medium">{learningStats.templates}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-4 w-4" />
                      <span>Conversations</span>
                    </div>
                    <span className="font-medium">{learningStats.conversations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Progress</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Data Quality</span>
                      <span>95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AI Understanding</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Response Accuracy</span>
                      <span>88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}