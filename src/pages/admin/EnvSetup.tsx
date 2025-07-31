/**
 * Environment Variables Setup & Status Page
 * Admin-only page to check environment configuration status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnvStatus {
  status: Record<string, boolean>;
  summary: {
    total: number;
    configured: number;
    missing: number;
    isValid: boolean;
  };
  missing: string[];
}

const ENV_VAR_DESCRIPTIONS = {
  'META_WABA_PHONE_ID': 'WhatsApp Business Phone Number ID from Meta Developer Console',
  'META_WABA_BUSINESS_ID': 'WhatsApp Business Account ID from Meta Developer Console', 
  'META_WABA_TOKEN': 'WhatsApp Business API Access Token (permanent token)',
  'META_WABA_VERIFY_TOKEN': 'Webhook verification token for WhatsApp webhooks',
  'OPENAI_API_KEY': 'OpenAI API key for AI agent processing',
  'OPENAI_ASSISTANT_ID': 'OpenAI Assistant ID for the main easyMO agent',
  'SUPABASE_URL': 'Supabase project URL (auto-configured)',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key (auto-configured)'
};

export default function EnvSetup() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchEnvStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('env-check');
      
      if (error) {
        throw error;
      }
      
      setEnvStatus(data);
    } catch (error) {
      console.error('Failed to fetch environment status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch environment status. Please check your admin permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEnvStatus();
  };

  useEffect(() => {
    fetchEnvStatus();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Environment Setup</h1>
          <p className="text-muted-foreground">
            Configuration status for easyMO WhatsApp + AI Agent system
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {envStatus && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {envStatus.summary.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                Configuration Summary
              </CardTitle>
              <CardDescription>
                Overall status of required environment variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {envStatus.summary.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Variables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {envStatus.summary.configured}
                  </div>
                  <div className="text-sm text-muted-foreground">Configured</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {envStatus.summary.missing}
                  </div>
                  <div className="text-sm text-muted-foreground">Missing</div>
                </div>
                <div className="text-center">
                  <Badge 
                    variant={envStatus.summary.isValid ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {envStatus.summary.isValid ? "All Set" : "Action Required"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Variables Alert */}
          {envStatus.summary.missing > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{envStatus.summary.missing} environment variable(s) missing:</strong>{' '}
                {envStatus.missing.join(', ')}. 
                Please configure these in your Supabase project settings.
              </AlertDescription>
            </Alert>
          )}

          {/* Environment Variables List */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Required configuration for WhatsApp Business API and OpenAI integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(envStatus.status).map(([varName, isConfigured]) => (
                  <div 
                    key={varName}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {varName}
                        </code>
                        {isConfigured ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ENV_VAR_DESCRIPTIONS[varName as keyof typeof ENV_VAR_DESCRIPTIONS] || 
                         'Environment variable description not available'}
                      </p>
                    </div>
                    <Badge variant={isConfigured ? "default" : "destructive"}>
                      {isConfigured ? "Configured" : "Missing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Instructions</CardTitle>
              <CardDescription>
                How to set up missing environment variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Supabase Project Variables</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Go to your Supabase project settings to configure environment variables:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://supabase.com/dashboard/project/ijblirphkrrsnxazohwt/settings/functions', '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Supabase Functions Settings
                </Button>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. WhatsApp Business API Setup</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Get your WhatsApp Business API credentials from Meta Developer Console:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Meta Developer Console
                </Button>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. OpenAI API Setup</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Get your OpenAI API key and create an assistant:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  OpenAI API Keys
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}