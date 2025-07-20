import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, BookOpen, Target } from "lucide-react";
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

export default function AgentLearning() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [learningData, setLearningData] = useState<Learning[]>([]);
  const [conversationLearning, setConversationLearning] = useState<ConversationLearning[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch learning sources
      const { data: learningSourcesData, error: learningError } = await supabase
        .from("agent_learning")
        .select("*")
        .eq("agent_id", id)
        .order("created_at", { ascending: false });

      if (learningError) throw learningError;
      setLearningData(learningSourcesData || []);

      // Fetch conversation learning logs
      const { data: conversationLearningData, error: conversationError } = await supabase
        .from("conversation_learning_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (conversationError) throw conversationError;
      setConversationLearning(conversationLearningData || []);

    } catch (error) {
      console.error("Error fetching learning data:", error);
      toast.error("Failed to load learning data");
    } finally {
      setLoading(false);
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
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/admin/agents/${id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agent
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{agent.name} - Learning</h1>
          <p className="text-muted-foreground">Learning sources and conversation insights</p>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Sources</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningData.length}</div>
            <p className="text-xs text-muted-foreground">
              {learningData.filter(l => l.vectorize).length} vectorized
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationLearning.length}</div>
            <p className="text-xs text-muted-foreground">Recent insights</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversationLearning.length > 0
                ? Math.round(
                    conversationLearning.reduce((sum, item) => sum + (item.confidence_level || 0), 0) /
                    conversationLearning.length * 100
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Learning confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Sources */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Learning Sources</CardTitle>
              <CardDescription>
                Data sources the agent learns from
              </CardDescription>
            </div>
            <Button onClick={() => navigate(`/admin/agents/${id}/learning/add`)}>
              Add Learning Source
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

      {/* Conversation Learning */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Learning Insights</CardTitle>
          <CardDescription>
            AI-generated insights from conversation analysis
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
    </div>
  );
}