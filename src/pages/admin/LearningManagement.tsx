import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, TrendingUp, ArrowLeft, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LearningEntry {
  id: string;
  timestamp: string;
  type: 'improvement' | 'feedback' | 'adaptation' | 'error';
  description: string;
  skill_area: string;
  impact_score: number;
  status: 'applied' | 'pending' | 'rejected';
}

interface LearningMetric {
  skill_name: string;
  accuracy_score: number;
  improvement_rate: number;
  total_interactions: number;
  last_updated: string;
}

export default function LearningManagement() {
  const [learningEntries, setLearningEntries] = useState<LearningEntry[]>([]);
  const [metrics, setMetrics] = useState<LearningMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    try {
      // Mock data for demonstration
      const mockEntries: LearningEntry[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          type: 'improvement',
          description: 'Improved payment flow response accuracy by analyzing user feedback patterns',
          skill_area: 'PaymentSkill',
          impact_score: 85,
          status: 'applied'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'feedback',
          description: 'User requested more detailed transport estimates',
          skill_area: 'TransportSkill',
          impact_score: 72,
          status: 'pending'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          type: 'adaptation',
          description: 'Adapted response style for better local cultural context',
          skill_area: 'CommerceSkill',
          impact_score: 90,
          status: 'applied'
        }
      ];

      const mockMetrics: LearningMetric[] = [
        {
          skill_name: 'PaymentSkill',
          accuracy_score: 92,
          improvement_rate: 15,
          total_interactions: 1250,
          last_updated: new Date().toISOString()
        },
        {
          skill_name: 'TransportSkill',
          accuracy_score: 88,
          improvement_rate: 12,
          total_interactions: 980,
          last_updated: new Date().toISOString()
        },
        {
          skill_name: 'CommerceSkill',
          accuracy_score: 85,
          improvement_rate: 18,
          total_interactions: 750,
          last_updated: new Date().toISOString()
        }
      ];

      setLearningEntries(mockEntries);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'improvement': return <TrendingUp className="h-4 w-4" />;
      case 'feedback': return <Brain className="h-4 w-4" />;
      case 'adaptation': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'improvement': return 'bg-green-500';
      case 'feedback': return 'bg-blue-500';
      case 'adaptation': return 'bg-purple-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/omni-agent')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Learning Management</h1>
            <p className="text-muted-foreground">Monitor and manage agent learning progress</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Learning Overview</TabsTrigger>
          <TabsTrigger value="entries">Learning Log</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Learning Entries</p>
                    <p className="text-2xl font-bold">{learningEntries.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Applied Improvements</p>
                    <p className="text-2xl font-bold">
                      {learningEntries.filter(e => e.status === 'applied').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Impact Score</p>
                    <p className="text-2xl font-bold">
                      {Math.round(learningEntries.reduce((sum, e) => sum + e.impact_score, 0) / learningEntries.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Learning Progress by Skill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.skill_name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{metric.skill_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {metric.accuracy_score}% accuracy
                      </span>
                    </div>
                    <Progress value={metric.accuracy_score} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{metric.total_interactions} interactions</span>
                      <span>+{metric.improvement_rate}% improvement</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Learning Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(entry.type)}>
                          {getTypeIcon(entry.type)}
                          <span className="ml-1 capitalize">{entry.type}</span>
                        </Badge>
                        <Badge variant="outline">{entry.skill_area}</Badge>
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm mb-2">{entry.description}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Impact Score: {entry.impact_score}/100</span>
                      <Progress value={entry.impact_score} className="w-24 h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.skill_name}>
                <CardHeader>
                  <CardTitle>{metric.skill_name} Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Accuracy Score</span>
                      <span className="font-medium">{metric.accuracy_score}%</span>
                    </div>
                    <Progress value={metric.accuracy_score} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Improvement Rate</p>
                      <p className="text-lg font-semibold text-green-600">+{metric.improvement_rate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Interactions</p>
                      <p className="text-lg font-semibold">{metric.total_interactions.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-2">
                    Last updated: {new Date(metric.last_updated).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}