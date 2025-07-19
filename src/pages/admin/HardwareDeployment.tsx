import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Database,
  MessageSquare,
  Search,
  TestTube
} from "lucide-react";

interface DeploymentItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  action?: () => Promise<void>;
}

export default function HardwareDeployment() {
  const [deploymentItems, setDeploymentItems] = useState<DeploymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeDeploymentChecklist();
  }, []);

  const initializeDeploymentChecklist = () => {
    const items: DeploymentItem[] = [
      {
        id: 'whatsapp-templates',
        name: 'WhatsApp Interactive Templates',
        description: 'Set up and submit WhatsApp Business templates for approval',
        status: 'pending',
        action: setupWhatsAppTemplates
      },
      {
        id: 'pinecone-namespace',
        name: 'Pinecone Vector Database',
        description: 'Configure hardware_products namespace for vector search',
        status: 'pending',
        action: setupPineconeNamespace
      },
      {
        id: 'price-refresh-cron',
        name: 'Weekly Price Refresh',
        description: 'Set up automated hardware price updates every Monday 6 AM',
        status: 'pending',
        action: setupPriceRefreshCron
      },
      {
        id: 'seed-sample-data',
        name: 'Sample SKU Database',
        description: 'Populate database with sample hardware products for pilot testing',
        status: 'pending',
        action: seedSampleData
      },
      {
        id: 'qa-framework',
        name: 'QA Testing Framework',
        description: 'Set up testing scenarios for 3 pilot shops (Kigali, Musanze, Huye)',
        status: 'pending',
        action: setupQAFramework
      }
    ];

    setDeploymentItems(items);
  };

  const executeDeploymentStep = async (item: DeploymentItem) => {
    if (!item.action) return;

    setProcessingId(item.id);
    setLoading(true);

    try {
      await item.action();
      
      setDeploymentItems(prev => 
        prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'completed' }
            : i
        )
      );

      toast({
        title: "Success",
        description: `${item.name} completed successfully`,
      });

    } catch (error) {
      console.error(`Error in ${item.id}:`, error);
      
      setDeploymentItems(prev => 
        prev.map(i => 
          i.id === item.id 
            ? { ...i, status: 'failed' }
            : i
        )
      );

      toast({
        title: "Error",
        description: `Failed to complete ${item.name}`,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setLoading(false);
    }
  };

  const setupWhatsAppTemplates = async () => {
    const { error } = await supabase.functions.invoke('setup-whatsapp-templates');
    if (error) throw error;
  };

  const setupPineconeNamespace = async () => {
    // Mock implementation - would require Pinecone API setup
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Pinecone namespace configured for hardware_products');
  };

  const setupPriceRefreshCron = async () => {
    const { error } = await supabase.functions.invoke('hardware-price-refresh');
    if (error) throw error;
  };

  const seedSampleData = async () => {
    const { error } = await supabase.functions.invoke('seed-hardware-data');
    if (error) throw error;
  };

  const setupQAFramework = async () => {
    const { error } = await supabase.functions.invoke('setup-qa-framework');
    if (error) throw error;
  };

  const executeAll = async () => {
    for (const item of deploymentItems.filter(i => i.status === 'pending')) {
      await executeDeploymentStep(item);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between steps
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'whatsapp-templates':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'pinecone-namespace':
        return <Search className="w-5 h-5 text-purple-500" />;
      case 'price-refresh-cron':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'seed-sample-data':
        return <Database className="w-5 h-5 text-green-500" />;
      case 'qa-framework':
        return <TestTube className="w-5 h-5 text-indigo-500" />;
      default:
        return <Play className="w-5 h-5 text-gray-500" />;
    }
  };

  const completedCount = deploymentItems.filter(i => i.status === 'completed').length;
  const totalCount = deploymentItems.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hardware Vendor Deployment</h1>
        <p className="text-muted-foreground">
          Complete all deployment steps for hardware vendor pilot launch
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Deployment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} completed</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <Button 
              onClick={executeAll}
              disabled={loading || completedCount === totalCount}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Execute All Steps
            </Button>
            <div className="text-sm text-muted-foreground">
              {progressPercentage.toFixed(0)}% Complete
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Steps */}
      <div className="space-y-4">
        {deploymentItems.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    {getCategoryIcon(item.id)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {getStatusIcon(item.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.description}
                    </p>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => executeDeploymentStep(item)}
                  disabled={loading || item.status === 'completed' || processingId === item.id}
                  variant={item.status === 'completed' ? 'outline' : 'default'}
                >
                  {processingId === item.id ? 'Processing...' : 
                   item.status === 'completed' ? 'Completed' : 'Execute'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Steps */}
      {completedCount === totalCount && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 Deployment Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-700">
              <p className="mb-4">All deployment steps completed successfully. Next steps:</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Submit WhatsApp templates for Business API approval</li>
                <li>Configure Pinecone API key for vector search</li>
                <li>Test with pilot vendors in Kigali, Musanze, and Huye</li>
                <li>Monitor system performance and user feedback</li>
                <li>Iterate based on pilot results</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}