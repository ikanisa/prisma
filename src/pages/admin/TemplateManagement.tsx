import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, BarChart3, Play, Settings } from 'lucide-react';
import TemplateManagementDashboard from '@/components/admin/TemplateManagementDashboard';
import TemplatePerformanceDashboard from '@/components/admin/TemplatePerformanceDashboard';
import TemplateAnalytics from '@/components/admin/TemplateAnalytics';

export default function TemplateManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management System</h1>
          <p className="text-muted-foreground">
            Comprehensive WhatsApp template management, analytics, and testing platform
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Phase 5: Template Management Dashboard
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Template Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Template Management Dashboard
              </CardTitle>
              <CardDescription>
                Manage templates, create new ones, and monitor their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateManagementDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Template Analytics
              </CardTitle>
              <CardDescription>
                View engagement patterns, performance insights, and user behavior analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateAnalytics />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Dashboard
              </CardTitle>
              <CardDescription>
                Advanced performance metrics, trends, and comparative analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePerformanceDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Template Testing
                </CardTitle>
                <CardDescription>
                  Test templates before deployment with real WhatsApp preview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4" />
                  <p>Template testing functionality is available in the main dashboard</p>
                  <p className="text-sm mt-2">Switch to the Template Dashboard tab to access testing features</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Testing Configuration
                </CardTitle>
                <CardDescription>
                  Configure testing environments and parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Testing Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Real-time WhatsApp preview</li>
                      <li>• Variable substitution testing</li>
                      <li>• Template validation</li>
                      <li>• Send test messages</li>
                      <li>• Performance tracking</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Best Practices</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Always test with real phone numbers</li>
                      <li>• Verify variable substitution</li>
                      <li>• Check button functionality</li>
                      <li>• Test across different languages</li>
                      <li>• Monitor delivery rates</li>
                    </ul>
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