import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Edit, 
  Plus, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  MapPin, 
  Activity,
  Bot,
  Zap,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserJourney {
  id: string;
  journey_name: string;
  user_types: string[];
  flow_steps: string[];
  success_criteria: Record<string, any>;
  ai_insights: {
    completion_rate: number;
    success_probability: number;
    optimization_suggestions: string[];
    risk_factors: string[];
  };
  is_active: boolean;
  last_updated: string;
  ai_generated: boolean;
}

interface JourneyTemplate {
  name: string;
  user_type: string;
  steps: string[];
  description: string;
}

export const DynamicUserJourneyManager = () => {
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<UserJourney | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newJourneyDialogOpen, setNewJourneyDialogOpen] = useState(false);
  const { toast } = useToast();

  const journeyTemplates: JourneyTemplate[] = [
    {
      name: "Driver Onboarding Journey",
      user_type: "driver",
      steps: [
        "Initial WhatsApp contact with 'driver on'",
        "Location sharing prompt and validation",
        "Vehicle plate number verification",
        "Driver profile creation with MoMo integration",
        "Status activation and availability setup",
        "Welcome message with instructions"
      ],
      description: "Complete onboarding flow for new drivers"
    },
    {
      name: "Passenger Ride Request",
      user_type: "passenger", 
      steps: [
        "Ride command via WhatsApp",
        "Pickup location sharing",
        "Intent creation and trip matching",
        "Available options presentation",
        "Trip selection and booking",
        "Payment processing"
      ],
      description: "End-to-end passenger booking experience"
    },
    {
      name: "Payment Processing Flow",
      user_type: "all",
      steps: [
        "Payment initiation",
        "MoMo validation",
        "Transaction processing",
        "Confirmation delivery",
        "Receipt generation"
      ],
      description: "Secure payment handling across all user types"
    }
  ];

  useEffect(() => {
    fetchJourneys();
  }, []);

  const fetchJourneys = async () => {
    try {
      // For now, use mock data with AI-enhanced insights
      const mockJourneys: UserJourney[] = journeyTemplates.map((template, index) => ({
        id: `journey_${index + 1}`,
        journey_name: template.name,
        user_types: template.user_type === 'all' ? ['driver', 'passenger', 'farmer'] : [template.user_type],
        flow_steps: template.steps,
        success_criteria: {
          completion_threshold: 0.8,
          satisfaction_target: 4.0,
          time_limit_minutes: 15
        },
        ai_insights: {
          completion_rate: Math.random() * 0.3 + 0.7, // 70-100%
          success_probability: Math.random() * 0.2 + 0.8, // 80-100%
          optimization_suggestions: [
            "Reduce verification time by 30%",
            "Add proactive help messages",
            "Implement smart defaults"
          ],
          risk_factors: [
            "High dropout at verification step",
            "Network connectivity issues"
          ]
        },
        is_active: true,
        last_updated: new Date().toISOString(),
        ai_generated: index > 0 // Mark some as AI-generated
      }));

      setJourneys(mockJourneys);
    } catch (error) {
      console.error('Error fetching journeys:', error);
      toast({
        title: "Error",
        description: "Failed to load user journeys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIJourney = async () => {
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'generate_ai_journey',
          context: {
            existing_journeys: journeys.length,
            user_patterns: 'recent_interactions_analysis',
            business_goals: 'increase_completion_rates'
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        const newJourney: UserJourney = {
          id: `ai_journey_${Date.now()}`,
          journey_name: data.journey.name || 'AI-Generated Journey',
          user_types: data.journey.user_types || ['general'],
          flow_steps: data.journey.flow_steps || [],
          success_criteria: data.journey.success_criteria || {},
          ai_insights: data.journey.insights || {
            completion_rate: 0.85,
            success_probability: 0.9,
            optimization_suggestions: [],
            risk_factors: []
          },
          is_active: true,
          last_updated: new Date().toISOString(),
          ai_generated: true
        };

        setJourneys(prev => [...prev, newJourney]);
        toast({
          title: "AI Journey Generated",
          description: "New user journey created with AI insights"
        });
      }
    } catch (error) {
      console.error('Error generating AI journey:', error);
      toast({
        title: "Error", 
        description: "Failed to generate AI journey",
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const optimizeJourney = async (journeyId: string) => {
    setAiProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'optimize_journey',
          journey_id: journeyId,
          optimization_focus: 'completion_rate'
        }
      });

      if (error) throw error;

      if (data.success) {
        setJourneys(prev => prev.map(j => 
          j.id === journeyId 
            ? { 
                ...j, 
                ai_insights: data.optimized_insights,
                flow_steps: data.optimized_steps || j.flow_steps,
                last_updated: new Date().toISOString()
              }
            : j
        ));

        toast({
          title: "Journey Optimized",
          description: "AI has enhanced the journey flow"
        });
      }
    } catch (error) {
      console.error('Error optimizing journey:', error);
      toast({
        title: "Error",
        description: "Failed to optimize journey", 
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const updateJourneyWithAI = async () => {
    setAiProcessing(true);
    try {
      // Simulate AI analysis of real user interactions
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'update_from_interactions',
          time_window_hours: 24,
          learning_focus: 'pattern_detection'
        }
      });

      if (error) throw error;

      // Update journeys with AI learnings
      if (data.success && data.journey_updates) {
        setJourneys(prev => prev.map(journey => {
          const update = data.journey_updates.find((u: any) => u.journey_name === journey.journey_name);
          return update ? { ...journey, ...update, last_updated: new Date().toISOString() } : journey;
        }));

        toast({
          title: "Journeys Updated",
          description: `Updated ${data.journey_updates.length} journeys with AI insights`
        });
      }
    } catch (error) {
      console.error('Error updating journeys:', error);
      toast({
        title: "Error",
        description: "Failed to update journeys with AI",
        variant: "destructive"
      });
    } finally {
      setAiProcessing(false);
    }
  };

  const saveJourney = async (journey: Partial<UserJourney>) => {
    try {
      if (selectedJourney) {
        // Update existing journey
        setJourneys(prev => prev.map(j => 
          j.id === selectedJourney.id 
            ? { ...j, ...journey, last_updated: new Date().toISOString() }
            : j
        ));
      } else {
        // Create new journey
        const newJourney: UserJourney = {
          id: `manual_journey_${Date.now()}`,
          journey_name: journey.journey_name || 'Untitled Journey',
          user_types: journey.user_types || ['general'],
          flow_steps: journey.flow_steps || [],
          success_criteria: journey.success_criteria || {},
          ai_insights: {
            completion_rate: 0,
            success_probability: 0.5,
            optimization_suggestions: [],
            risk_factors: []
          },
          is_active: true,
          last_updated: new Date().toISOString(),
          ai_generated: false
        };

        setJourneys(prev => [...prev, newJourney]);
      }

      setEditDialogOpen(false);
      setNewJourneyDialogOpen(false);
      setSelectedJourney(null);

      toast({
        title: "Journey Saved",
        description: "User journey has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving journey:', error);
      toast({
        title: "Error",
        description: "Failed to save journey",
        variant: "destructive"
      });
    }
  };

  const deleteJourney = async (journeyId: string) => {
    try {
      setJourneys(prev => prev.filter(j => j.id !== journeyId));
      toast({
        title: "Journey Deleted",
        description: "User journey has been removed"
      });
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast({
        title: "Error",
        description: "Failed to delete journey",
        variant: "destructive"
      });
    }
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getJourneyStatusIcon = (journey: UserJourney) => {
    if (journey.ai_insights.completion_rate >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (journey.ai_insights.risk_factors.length > 0) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    return <Activity className="h-4 w-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dynamic User Journeys</h2>
          <p className="text-muted-foreground">AI-powered journey optimization with real-time updates</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={updateJourneyWithAI} 
            disabled={aiProcessing}
            variant="outline"
          >
            {aiProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Update with AI
          </Button>
          <Button 
            onClick={generateAIJourney}
            disabled={aiProcessing}
            variant="outline"
          >
            <Bot className="h-4 w-4 mr-2" />
            Generate AI Journey
          </Button>
          <Dialog open={newJourneyDialogOpen} onOpenChange={setNewJourneyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Manual Journey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User Journey</DialogTitle>
              </DialogHeader>
              <JourneyEditor
                journey={null}
                onSave={saveJourney}
                onCancel={() => setNewJourneyDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Journey Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {journeys.map((journey) => (
          <Card key={journey.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getJourneyStatusIcon(journey)}
                  <CardTitle className="text-lg">{journey.journey_name}</CardTitle>
                  {journey.ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => optimizeJourney(journey.id)}
                    disabled={aiProcessing}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Dialog open={editDialogOpen && selectedJourney?.id === journey.id} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedJourney(journey)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit User Journey</DialogTitle>
                      </DialogHeader>
                      <JourneyEditor
                        journey={selectedJourney}
                        onSave={saveJourney}
                        onCancel={() => {
                          setEditDialogOpen(false);
                          setSelectedJourney(null);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteJourney(journey.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Types */}
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {journey.user_types.map((type, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className={`text-lg font-semibold ${getSuccessColor(journey.ai_insights.completion_rate)}`}>
                    {(journey.ai_insights.completion_rate * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${getSuccessColor(journey.ai_insights.success_probability)}`}>
                    {(journey.ai_insights.success_probability * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Probability</p>
                </div>
              </div>

              {/* Flow Steps Preview */}
              <div>
                <p className="text-sm font-medium mb-2">Journey Steps ({journey.flow_steps.length})</p>
                <div className="space-y-1">
                  {journey.flow_steps.slice(0, 3).map((step, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      {index + 1}. {step.length > 50 ? `${step.substring(0, 50)}...` : step}
                    </div>
                  ))}
                  {journey.flow_steps.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{journey.flow_steps.length - 3} more steps
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions */}
              {journey.ai_insights.optimization_suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">AI Suggestions</p>
                  <div className="space-y-1">
                    {journey.ai_insights.optimization_suggestions.slice(0, 2).map((suggestion, index) => (
                      <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {journey.ai_insights.risk_factors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Risk Factors</p>
                  <div className="flex flex-wrap gap-1">
                    {journey.ai_insights.risk_factors.slice(0, 2).map((risk, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {risk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(journey.last_updated).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface JourneyEditorProps {
  journey: UserJourney | null;
  onSave: (journey: Partial<UserJourney>) => void;
  onCancel: () => void;
}

const JourneyEditor: React.FC<JourneyEditorProps> = ({ journey, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    journey_name: journey?.journey_name || '',
    user_types: journey?.user_types || ['general'],
    flow_steps: journey?.flow_steps || [''],
    success_criteria: journey?.success_criteria || {}
  });

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      flow_steps: [...prev.flow_steps, '']
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      flow_steps: prev.flow_steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      flow_steps: prev.flow_steps.map((step, i) => i === index ? value : step)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="journey_name">Journey Name</Label>
        <Input
          id="journey_name"
          value={formData.journey_name}
          onChange={(e) => setFormData(prev => ({ ...prev, journey_name: e.target.value }))}
          placeholder="Enter journey name"
          required
        />
      </div>

      <div>
        <Label>User Types</Label>
        <Select 
          value={formData.user_types[0]} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, user_types: [value] }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="passenger">Passenger</SelectItem>
            <SelectItem value="farmer">Farmer</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Journey Steps</Label>
          <Button type="button" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        </div>
        <div className="space-y-2">
          {formData.flow_steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm font-medium w-6">{index + 1}.</span>
              <Input
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder="Describe this step"
                className="flex-1"
              />
              {formData.flow_steps.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeStep(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Journey
        </Button>
      </div>
    </form>
  );
};