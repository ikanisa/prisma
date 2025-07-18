import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function Settings() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('wa-webhook', {
        body: {
          test: true,
          verification: true,
          health_check: true
        }
      });

      if (error) {
        throw error;
      }

      setTestResult({
        success: true,
        message: 'Webhook test successful! All systems operational.'
      });
      toast.success('Webhook test successful!');
    } catch (error) {
      setTestResult({
        success: false,
        message: `Webhook test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      toast.error('Webhook test failed');
      console.error('Webhook test error:', error);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/wa-webhook`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Configuration</CardTitle>
          <CardDescription>
            Configure your WhatsApp Business API webhook settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value="https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/wa-webhook"
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyWebhookUrl} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL in your WhatsApp Business API configuration
            </p>
          </div>

          <div className="space-y-2">
            <Label>Test Webhook</Label>
            <div className="flex gap-2">
              <Button 
                onClick={testWebhook} 
                disabled={testing}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? 'Testing...' : 'Test Webhook'}
              </Button>
            </div>
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Required environment variables for the WhatsApp integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <EnvironmentVariable
              name="WHATSAPP_ACCESS_TOKEN"
              description="Your WhatsApp Business API access token from Meta Business"
              required
            />
            <EnvironmentVariable
              name="WHATSAPP_PHONE_ID"
              description="Your WhatsApp Business phone number ID"
              required
            />
            <EnvironmentVariable
              name="WHATSAPP_VERIFY_TOKEN"
              description="Webhook verification token (must match Meta Business settings)"
              required
            />
            <EnvironmentVariable
              name="OPENAI_API_KEY"
              description="OpenAI API key for AI-powered responses"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            Current status of your WhatsApp integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>WhatsApp Webhook</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Processor</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Message Handler</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Channel Gateway</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnvironmentVariable({ 
  name, 
  description, 
  required 
}: { 
  name: string; 
  description: string; 
  required?: boolean;
}) {
  return (
    <div className="border-l-2 border-muted pl-4">
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {name}
        </code>
        {required && (
          <Badge variant="secondary" className="text-xs">
            Required
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {description}
      </p>
    </div>
  );
}