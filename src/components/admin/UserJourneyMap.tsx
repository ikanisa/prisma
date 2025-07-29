import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Eye, Users, Target, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JourneyPattern {
  id: string;
  pattern_name: string;
  pattern_type: string;
  success_probability: number;
  completion_rate: number;
  steps: string[];
  triggers: any;
  outcomes: any;
  created_at: string;
  updated_at: string;
}

interface DynamicPattern {
  id: string;
  user_phone: string;
  pattern_id: string;
  current_step: string;
  step_data: any;
  completion_percentage: number;
  started_at: string;
  last_activity: string;
  status: string;
}

interface AIInsight {
  type: 'optimization' | 'risk' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

const UserJourneyMap: React.FC = () => {
  const [journeyPatterns, setJourneyPatterns] = useState<JourneyPattern[]>([]);
  const [dynamicPatterns, setDynamicPatterns] = useState<DynamicPattern[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock AI insights for demo (in production, these would come from AI analysis)
  const mockAiInsights: AIInsight[] = [
    {
      type: 'optimization',
      title: 'Payment Flow Bottleneck',
      description: 'Users drop off at the amount entry step. Consider adding quick amount buttons.',
      confidence: 0.87,
      impact: 'high'
    },
    {
      type: 'opportunity',
      title: 'Mobile Money Integration',
      description: 'High success rate for MoMo transactions. Expand mobile payment options.',
      confidence: 0.92,
      impact: 'medium'
    },
    {
      type: 'risk',
      title: 'Location Input Friction',
      description: 'Users struggle with manual location entry. Implement GPS assistance.',
      confidence: 0.78,
      impact: 'high'
    }
  ];

  const patternAnalysis = {
    'payment_success': { 
      successRate: 87, 
      dropoffPoint: 'amount_entry', 
      optimizations: ['Simplify amount input', 'Add quick amount buttons'] 
    },
    'ride_booking': { 
      successRate: 73, 
      dropoffPoint: 'location_selection', 
      optimizations: ['Improve location picker', 'Add GPS assistance'] 
    },
    'product_order': { 
      successRate: 65, 
      dropoffPoint: 'checkout', 
      optimizations: ['Streamline checkout', 'Add guest checkout'] 
    }
  };

  useEffect(() => {
    fetchJourneyData();
  }, []);

  const fetchJourneyData = async () => {
    try {
      setLoading(true);
      
      // Use mock data for now since tables don't exist yet
      const mockPatterns: JourneyPattern[] = [
        {
          id: '1',
          pattern_name: 'Payment QR Generation',
          pattern_type: 'payment_flow',
          success_probability: 0.85,
          completion_rate: 0.78,
          steps: ['greet_user', 'identify_payment_intent', 'collect_amount', 'collect_momo', 'generate_qr', 'confirm_generation'],
          triggers: { keywords: ['get paid', 'receive money', 'qr'], intents: ['get_paid_generate_qr'] },
          outcomes: { success: 'qr_generated', failure: 'abandoned_flow' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          pattern_name: 'Ride Booking',
          pattern_type: 'mobility_flow',
          success_probability: 0.75,
          completion_rate: 0.65,
          steps: ['greet_user', 'identify_ride_intent', 'collect_pickup', 'collect_destination', 'show_drivers', 'confirm_booking'],
          triggers: { keywords: ['ride', 'transport', 'go to'], intents: ['passenger_book_ride'] },
          outcomes: { success: 'ride_booked', failure: 'no_drivers_found' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          pattern_name: 'Product Ordering',
          pattern_type: 'commerce_flow',
          success_probability: 0.68,
          completion_rate: 0.55,
          steps: ['greet_user', 'browse_products', 'select_items', 'add_to_cart', 'checkout', 'payment'],
          triggers: { keywords: ['buy', 'order', 'shop'], intents: ['product_order'] },
          outcomes: { success: 'order_placed', failure: 'cart_abandoned' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const mockDynamics: DynamicPattern[] = [
        {
          id: '1',
          user_phone: '+250788123456',
          pattern_id: '1',
          current_step: 'collect_amount',
          step_data: { partial_amount: '1500' },
          completion_percentage: 60,
          started_at: new Date(Date.now() - 300000).toISOString(),
          last_activity: new Date(Date.now() - 120000).toISOString(),
          status: 'active'
        },
        {
          id: '2',
          user_phone: '+250788654321',
          pattern_id: '2',
          current_step: 'show_drivers',
          step_data: { pickup: 'Kimironko', destination: 'City Plaza' },
          completion_percentage: 80,
          started_at: new Date(Date.now() - 600000).toISOString(),
          last_activity: new Date(Date.now() - 60000).toISOString(),
          status: 'active'
        }
      ];

      setJourneyPatterns(mockPatterns);
      setDynamicPatterns(mockDynamics);
      setAiInsights(mockAiInsights);
    } catch (error) {
      console.error('Error in fetchJourneyData:', error);
      toast.error('Failed to fetch journey data');
    } finally {
      setLoading(false);
    }
  };

  const triggerJourneyAnalysis = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-user-journey-tracker', {
        body: {
          action: 'analyze_journey',
          user_phone: 'system_analysis',
          comprehensive: true
        }
      });

      if (error) {
        toast.error('Failed to run journey analysis');
      } else {
        toast.success('Journey analysis completed');
        fetchJourneyData();
      }
    } catch (error) {
      console.error('Error running journey analysis:', error);
      toast.error('Failed to run journey analysis');
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Target className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'risk': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'opportunity': return 'bg-green-500/10 text-green-700 border-green-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Journey Map</h2>
          <p className="text-muted-foreground">AI-powered journey analysis and optimization insights</p>
        </div>
        <Button onClick={triggerJourneyAnalysis} className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Run Analysis
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Journey Patterns</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="real-time">Real-time Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{journeyPatterns.length}</div>
                <p className="text-xs text-muted-foreground">Journey patterns tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Journeys</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dynamicPatterns.filter(p => p.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">Users in active journeys</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {journeyPatterns.length > 0 ? 
                    Math.round(journeyPatterns.reduce((acc, p) => acc + p.success_probability, 0) / journeyPatterns.length * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Across all patterns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiInsights.length}</div>
                <p className="text-xs text-muted-foreground">Optimization opportunities</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Journey Pattern Performance</CardTitle>
              <CardDescription>Success rates and completion metrics for key user journeys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {journeyPatterns.slice(0, 5).map((pattern) => (
                <div key={pattern.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{pattern.pattern_name}</h4>
                      <Badge variant="outline">{pattern.pattern_type}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Success Probability</span>
                        <span>{Math.round(pattern.success_probability * 100)}%</span>
                      </div>
                      <Progress value={pattern.success_probability * 100} className="h-2" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Journey Patterns</CardTitle>
              <CardDescription>Defined user journey patterns with success metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journeyPatterns.map((pattern) => (
                  <Card key={pattern.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{pattern.pattern_name}</h4>
                        <p className="text-sm text-muted-foreground">{pattern.pattern_type}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{Math.round(pattern.success_probability * 100)}% Success</div>
                        <div className="text-sm text-muted-foreground">{Math.round(pattern.completion_rate * 100)}% Complete</div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="text-sm font-medium mb-2">Journey Steps:</h5>
                      <div className="flex flex-wrap gap-2">
                        {pattern.steps.map((step: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {idx + 1}. {step.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Triggers:</span>
                        <p className="text-muted-foreground">{pattern.triggers?.keywords?.join(', ') || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Outcomes:</span>
                        <p className="text-muted-foreground">{pattern.outcomes?.success || 'N/A'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Journey Insights</CardTitle>
              <CardDescription>Automated analysis and optimization recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiInsights.map((insight, index) => (
                  <Card key={index} className={`p-4 border-l-4 ${getInsightColor(insight.type)}`}>
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <div className="flex gap-2">
                            <Badge variant={getImpactBadgeVariant(insight.impact)}>
                              {insight.impact} impact
                            </Badge>
                            <Badge variant="outline">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Journey Tracking</CardTitle>
              <CardDescription>Active user journeys and current progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dynamicPatterns.slice(0, 10).map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">User: {pattern.user_phone}</span>
                        <Badge variant={pattern.status === 'active' ? 'default' : 'secondary'}>
                          {pattern.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Current Step: {pattern.current_step}</span>
                          <span>{Math.round(pattern.completion_percentage)}% Complete</span>
                        </div>
                        <Progress value={pattern.completion_percentage} className="h-2" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last activity: {new Date(pattern.last_activity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {dynamicPatterns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active journeys found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserJourneyMap;