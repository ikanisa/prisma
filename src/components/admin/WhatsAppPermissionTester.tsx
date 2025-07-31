import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PermissionTestResult {
  success: boolean;
  statusCode: number;
  data: any;
  url: string;
  error?: string;
  details?: string;
}

export const WhatsAppPermissionTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PermissionTestResult | null>(null);

  const testPermissions = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-permission-test', {
        body: {}
      });

      if (error) {
        setResult({
          success: false,
          statusCode: 500,
          data: null,
          url: '',
          error: 'Function invocation failed',
          details: error.message
        });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({
        success: false,
        statusCode: 500,
        data: null,
        url: '',
        error: 'Network error',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnsupportedPostError = result?.data?.error?.message?.includes('Unsupported post request') ||
    result?.data?.error?.code === 100;

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (!result) return <Shield className="h-4 w-4" />;
    if (result.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (!result) return null;
    if (result.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          WhatsApp Permission Tester
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Test your WhatsApp Business API permissions and phone number configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testPermissions} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Permissions...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Test WhatsApp Permissions
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">API Response</h4>
              <div className="bg-muted p-3 rounded-lg overflow-auto text-xs">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Request Details</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Status Code: {result.statusCode}</div>
                <div>URL: {result.url}</div>
              </div>
            </div>

            {hasUnsupportedPostError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Permission Issues Detected</div>
                    <div className="text-sm">Please check the following:</div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Check system user permissions in Meta Business Manager</li>
                      <li>• Ensure your app is connected to WhatsApp Business Account (WABA)</li>
                      <li>• Verify you're using the correct phone number ID</li>
                      <li>• Add recipient as a tester or put your app Live in production</li>
                      <li>• Regenerate token with whatsapp_business_messaging & whatsapp_business_management permissions</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.error && !hasUnsupportedPostError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{result.error}</div>
                    {result.details && <div className="text-sm">{result.details}</div>}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};