import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PersonaEditor } from '@/components/admin/PersonaEditor';
import { DocumentManager } from '@/components/admin/DocumentManager';
import { LearningComponents } from '@/components/admin/LearningComponents';
import { ComprehensiveUserJourneySystem } from '@/components/admin/ComprehensiveUserJourneySystem';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Zap,
  BarChart3,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
  User,
  Upload,
  BookOpen
} from 'lucide-react';

interface LearningKPI {
  lastAuditDate: string | null;
  openGaps: number;
  avgCoverage: number;
  embeddingsCount: number;
  totalModules: number;
  criticalGaps: number;
}

interface KnowledgeGap {
  id: string;
  gap_type: string;
  impacted_area: string;
  severity_level: string;
  recommended_action: string;
  model_source: string;
  content_excerpt: string;
  fix_suggestion: string;
  status: string;
  created_at: string;
  audit_id?: string;
  assigned_to?: string;
  resolved_at?: string;
}

interface AuditLog {
  id: string;
  run_by: string;
  audit_type: string;
  status: string;
  total_gaps_found: number;
  created_at: string;
  completed_at: string;
  coverage_summary: any;
}

export function LearningDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<LearningKPI>({
    lastAuditDate: null,
    openGaps: 0,
    avgCoverage: 0,
    embeddingsCount: 0,
    totalModules: 0,
    criticalGaps: 0
  });
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [runningAudit, setRunningAudit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch KPIs
      const [auditData, gapsData, modulesData, coverageData] = await Promise.all([
        supabase.from('knowledge_audit_logs').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('knowledge_gaps').select('*').eq('status', 'open'),
        supabase.from('learning_modules').select('id, vector_count'),
        supabase.from('coverage_scores').select('score').order('created_at', { ascending: false }).limit(10)
      ]);

      const lastAudit = auditData.data?.[0];
      const openGaps = gapsData.data?.length || 0;
      const criticalGaps = gapsData.data?.filter(g => g.severity_level === 'critical').length || 0;
      const totalModules = modulesData.data?.length || 0;
      const embeddingsCount = modulesData.data?.reduce((sum, m) => sum + (m.vector_count || 0), 0) || 0;
      const avgCoverage = coverageData.data?.length > 0 
        ? Math.round(coverageData.data.reduce((sum, c) => sum + c.score, 0) / coverageData.data.length)
        : 0;

      setKpis({
        lastAuditDate: lastAudit?.created_at || null,
        openGaps,
        avgCoverage,
        embeddingsCount,
        totalModules,
        criticalGaps
      });

      // Fetch gaps and audits
      const [allGaps, allAudits] = await Promise.all([
        supabase.from('knowledge_gaps').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('knowledge_audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      setGaps(allGaps.data || []);
      setAudits(allAudits.data || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runKnowledgeAudit = async () => {
    try {
      setRunningAudit(true);
      
      const response = await supabase.functions.invoke('knowledge-audit-run', {
        body: {
          auditType: 'comprehensive',
          runBy: 'admin'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Audit Started",
        description: "Knowledge audit is running in the background",
      });

      // Refresh data after a short delay
      setTimeout(fetchDashboardData, 3000);

    } catch (error) {
      console.error('Error running audit:', error);
      toast({
        title: "Error",
        description: "Failed to start knowledge audit",
        variant: "destructive"
      });
    } finally {
      setRunningAudit(false);
    }
  };

  const refreshNamespace = async () => {
    try {
      const response = await supabase.functions.invoke('namespace-refresh', {
        body: {
          namespace: 'general',
          agent_id: 'omni-agent'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Namespace Refresh Started",
        description: "Vector embeddings are being refreshed",
      });

      setTimeout(fetchDashboardData, 2000);

    } catch (error) {
      console.error('Error refreshing namespace:', error);
      toast({
        title: "Error",
        description: "Failed to refresh namespace",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading learning dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learning Management</h1>
          <p className="text-muted-foreground">
            Manage AI agent knowledge, audit gaps, and optimize learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshNamespace}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Vectors
          </Button>
          <Button onClick={runKnowledgeAudit} disabled={runningAudit}>
            {runningAudit ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Run Audit
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openGaps}</div>
            {kpis.criticalGaps > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {kpis.criticalGaps} critical
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgCoverage}%</div>
            <Progress value={kpis.avgCoverage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Modules</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalModules}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.embeddingsCount} embeddings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {kpis.lastAuditDate 
                ? new Date(kpis.lastAuditDate).toLocaleDateString()
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              System analysis
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="journeys">User Journeys</TabsTrigger>
          <TabsTrigger value="comprehensive">All Services</TabsTrigger>
          <TabsTrigger value="audits">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🤖</span>
                  <span>Omni Agent Overview</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive WhatsApp AI agent powering easyMO's super-app ecosystem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-900">💳 Payment Services</div>
                    <div className="text-sm text-blue-700 mt-1">QR code generation, payment requests, bill payments via MoMo</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-900">🏍️ Transport Discovery</div>
                    <div className="text-sm text-green-700 mt-1">Find nearby drivers/passengers, schedule rides, trip coordination</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-900">🛒 Marketplace</div>
                    <div className="text-sm text-purple-700 mt-1">Browse products, farmer listings, business discovery</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium">WhatsApp-First Architecture</div>
                      <div className="text-sm text-muted-foreground">All user interactions happen through WhatsApp chat - no app downloads required</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium">Unified Commerce Platform</div>
                      <div className="text-sm text-muted-foreground">Seamlessly handles payments, transportation, shopping, and services in one conversation</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium">Location-Aware Intelligence</div>
                      <div className="text-sm text-muted-foreground">Contextual recommendations based on user location and preferences</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Capabilities</CardTitle>
                <CardDescription>Key service areas and coverage levels</CardDescription>
              </CardHeader>
             <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Payment & QR Generation</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={95} className="w-20 h-2" />
                      <span className="text-sm font-medium">95%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Transport Discovery</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={88} className="w-20 h-2" />
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marketplace & Listings</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Event Management</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={82} className="w-20 h-2" />
                      <span className="text-sm font-medium">82%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Customer Support</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={90} className="w-20 h-2" />
                      <span className="text-sm font-medium">90%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Onboarding</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={93} className="w-20 h-2" />
                      <span className="text-sm font-medium">93%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Knowledge Gaps</CardTitle>
                <CardDescription>Areas requiring attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {gaps.slice(0, 5).map((gap) => (
                  <div key={gap.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Badge variant={getSeverityBadgeVariant(gap.severity_level)}>
                      {gap.severity_level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{gap.impacted_area}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {gap.gap_type} • {gap.model_source}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <PersonaEditor agentId="omni-agent" />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentManager agentId="omni-agent" />
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <LearningComponents />
        </TabsContent>

        <TabsContent value="journeys" className="space-y-4">
          <ComprehensiveUserJourneySystem />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <ComprehensiveUserJourneySystem />
        </TabsContent>


        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>Past knowledge audits and results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audits.map((audit) => (
                  <div key={audit.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={audit.status === 'completed' ? 'default' : 'secondary'}>
                          {audit.status}
                        </Badge>
                        <span className="font-medium">{audit.audit_type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        by {audit.run_by}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Gaps Found: {audit.total_gaps_found}</span>
                      <span>
                        {new Date(audit.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {audit.coverage_summary && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Overall Score: {audit.coverage_summary.overall_score}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Modules</CardTitle>
              <CardDescription>Manage knowledge sources and content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Module management interface coming soon</p>
                <Button variant="outline" className="mt-4">
                  Upload New Module
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector Management</CardTitle>
              <CardDescription>Search and manage vector embeddings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Vector search interface coming soon</p>
                <Button variant="outline" className="mt-4" onClick={refreshNamespace}>
                  Refresh All Vectors
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}