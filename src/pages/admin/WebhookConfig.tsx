import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, CheckCircle, XCircle, TestTube } from 'lucide-react';

interface WebhookStatus {
  configured: boolean;
  status: string;
  webhookUrl: string;
  challengeResponse?: string;
}

export default function WebhookConfig() {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testChallenge, setTestChallenge] = useState('test_challenge_12345');
  const { toast } = useToast();

  useEffect(() => {
    checkWebhookStatus();
  }, []);

  const checkWebhookStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('webhook-verify-test', {
        body: { testChallenge }
      });

      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Failed to check webhook status:', error);
      toast({
        title: "Error",
        description: "Failed to check webhook configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhookVerification = async () => {
    try {
      setTesting(true);
      await checkWebhookStatus();
      toast({
        title: "Test Complete",
        description: "Webhook verification test completed",
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed",
        description: "Webhook verification test failed",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Webhook Configuration</h1>
        <p className="text-muted-foreground">
          Manage and test your WhatsApp webhook verification settings
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.configured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Verification Token Status
          </CardTitle>
          <CardDescription>
            META_WABA_VERIFY_TOKEN configuration status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={status?.configured ? "default" : "destructive"}>
              {status?.configured ? "✅ Configured" : "❌ Missing"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Status: {status?.status}
            </span>
          </div>

          {!status?.configured && (
            <div className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
              <p className="text-sm font-medium">Action Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Set META_WABA_VERIFY_TOKEN in Supabase Dashboard → Settings → Config → Variables
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
          <CardDescription>
            Use this URL in your Meta for Developers webhook configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={status?.webhookUrl || ''}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(status?.webhookUrl || '', 'Webhook URL')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Webhook Verification
          </CardTitle>
          <CardDescription>
            Test the webhook verification flow with a sample challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testChallenge">Test Challenge</Label>
            <Input
              id="testChallenge"
              value={testChallenge}
              onChange={(e) => setTestChallenge(e.target.value)}
              placeholder="Enter test challenge string"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testWebhookVerification}
              disabled={testing || !status?.configured}
              variant="outline"
            >
              {testing ? 'Testing...' : 'Test Verification'}
            </Button>
            <Button
              onClick={checkWebhookStatus}
              disabled={loading}
              variant="secondary"
            >
              Refresh Status
            </Button>
          </div>

          {status?.challengeResponse && (
            <div className="mt-4 p-4 bg-muted rounded">
              <p className="text-sm font-medium">Expected Response:</p>
              <code className="text-xs">{status.challengeResponse}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            How to configure the webhook in Meta for Developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Generate Verify Token (if needed)</h4>
            <p className="text-sm text-muted-foreground">
              Use a random 32-48 character string. Example: openssl rand -base64 32 | tr -d '=+/'
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Set Environment Variable</h4>
            <p className="text-sm text-muted-foreground">
              Go to Supabase Dashboard → Settings → Config → Variables → Add META_WABA_VERIFY_TOKEN
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Configure Meta Webhook</h4>
            <p className="text-sm text-muted-foreground">
              Meta for Developers → Your App → WhatsApp → Configuration → Edit webhook URL & token
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Test Verification</h4>
            <p className="text-sm text-muted-foreground">
              Meta will send a GET request with hub.challenge. Your webhook should return the challenge value.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}