import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Bot, Brain, Activity, MessageSquare, TrendingUp, Settings, FileText, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface OmniAgentSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  usage_count: number;
  last_used_at: string;
  is_active: boolean;
}

interface OmniAgentMetric {
  id: string;
  metric_type: string;
  skill_name: string;
  metric_value: number;
  timestamp: string;
  metadata: any;
}

interface OmniAgentConversation {
  id: string;
  phone_number: string;
  message_text: string;
  sender: string;
  skill_used: string;
  intent_detected: string;
  confidence_score: number;
  created_at: string;
}

export default function OmniAgentDashboard() {
  const [skills, setSkills] = useState<OmniAgentSkill[]>([]);
  const [metrics, setMetrics] = useState<OmniAgentMetric[]>([]);
  const [conversations, setConversations] = useState<OmniAgentConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOmniAgentData();
  }, []);

  const fetchOmniAgentData = async () => {
    try {
      const [skillsResult, metricsResult, conversationsResult] = await Promise.all([
        supabase.from('omni_agent_skills').select('*').order('usage_count', { ascending: false }),
        supabase.from('omni_agent_metrics').select('*').order('timestamp', { ascending: false }).limit(50),
        supabase.from('omni_agent_conversations').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      setSkills(skillsResult.data || []);
      setMetrics(metricsResult.data || []);
      setConversations(conversationsResult.data || []);
    } catch (error) {
      console.error('Error fetching omni-agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillColor = (skillName: string) => {
    const colors = {
      PaymentSkill: 'bg-green-500',
      TransportSkill: 'bg-blue-500',
      ListingsSkill: 'bg-purple-500',
      CommerceSkill: 'bg-orange-500',
      DataSyncSkill: 'bg-yellow-500',
      AdminSupportSkill: 'bg-gray-500'
    };
    return colors[skillName as keyof typeof colors] || 'bg-gray-400';
  };

  const totalConversations = conversations.length;
  const activeSkills = skills.filter(s => s.is_active).length;
  const totalUsage = skills.reduce((sum, skill) => sum + skill.usage_count, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Omni Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Unified AI agent managing all easyMO services
          </p>
        </div>
        <Button onClick={() => navigate('/admin/omni-agent/configure')}>
          <Settings className="mr-2 h-4 w-4" />
          Configure Agent
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Skills</p>
                <p className="text-2xl font-bold">{activeSkills}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {conversations.length > 0 
                    ? Math.round(conversations.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / conversations.length * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList>
          <TabsTrigger value="persona">Omni Agent Persona</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="learning">Omni Agent Learning</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="conversations">Recent Conversations</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="persona">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Omni Agent Persona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">Configure the personality and behavior of your omni-agent.</p>
                <Button onClick={() => navigate('/admin/omni-agent/persona')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Persona
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">Manage documents and knowledge base for agent learning.</p>
                <Button onClick={() => navigate('/admin/omni-agent/documents')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Omni Agent Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">Monitor and manage the agent's learning progress and improvements.</p>
                <Button onClick={() => navigate('/admin/omni-agent/learning')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Learning Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Omni Agent Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <Card 
                    key={skill.id} 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate(`/admin/omni-agent/skill/${skill.id}`)}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Badge className={getSkillColor(skill.skill_name)}>
                          {skill.skill_name.replace('Skill', '')}
                        </Badge>
                        <Badge variant={skill.is_active ? "default" : "secondary"}>
                          {skill.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium">{skill.skill_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {skill.skill_description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage Count</span>
                          <span className="font-medium">{skill.usage_count}</span>
                        </div>
                        <Progress 
                          value={Math.min((skill.usage_count / Math.max(totalUsage, 1)) * 100, 100)} 
                          className="h-2"
                        />
                        {skill.last_used_at && (
                          <div className="text-xs text-muted-foreground">
                            Last used: {new Date(skill.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{conversation.phone_number}</Badge>
                        <Badge variant="secondary">{conversation.sender}</Badge>
                        {conversation.skill_used && (
                          <Badge className={getSkillColor(conversation.skill_used)}>
                            {conversation.skill_used.replace('Skill', '')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{conversation.message_text}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      {conversation.intent_detected && (
                        <span>Intent: {conversation.intent_detected}</span>
                      )}
                      {conversation.confidence_score && (
                        <span>Confidence: {Math.round(conversation.confidence_score * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{metric.metric_type}</div>
                        {metric.skill_name && (
                          <div className="text-sm text-muted-foreground">
                            Skill: {metric.skill_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{metric.metric_value}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}