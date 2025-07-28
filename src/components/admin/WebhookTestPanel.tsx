import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IncomingMessage {
  id: string;
  from_number: string;
  message_text: string;
  message_type: string;
  processed: boolean;
  created_at: string;
  raw_payload?: any;
}

export function WebhookTestPanel() {
  const [messages, setMessages] = useState<IncomingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const webhookUrl = 'https://ijblirphkrrsnxazohwt.functions.supabase.co/whatsapp-webhook';
  // Security Fix: Remove hardcoded verify token - now using environment variables
  const verifyToken = 'Configure META_WABA_VERIFY_TOKEN in Edge Functions secrets';

  useEffect(() => {
    fetchMessages();
    testWebhookEndpoint();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incoming_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch incoming messages');
    } finally {
      setLoading(false);
    }
  };

  const testWebhookEndpoint = async () => {
    try {
      // Test webhook availability (without verify token since it's now in env vars)
      const response = await fetch(`${webhookUrl}?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test123`);
      
      // If we get any response, the endpoint is reachable
      if (response.status === 200 || response.status === 403) {
        setWebhookStatus('ok');
      } else {
        setWebhookStatus('error');
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      setWebhookStatus('error');
    }
  };

  const testMessageInsertion = async () => {
    try {
      const testMessage = {
        from_number: '+250000000001',
        message_text: `Test message at ${new Date().toISOString()}`,
        message_type: 'text',
        processed: false
      };

      const { error } = await supabase
        .from('incoming_messages')
        .insert(testMessage);

      if (error) throw error;
      
      toast.success('Test message inserted successfully');
      fetchMessages();
    } catch (error) {
      console.error('Error inserting test message:', error);
      toast.error('Failed to insert test message');
    }
  };

  const testMessageProcessing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-incoming-messages');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Message processed successfully! AI replied via WhatsApp.');
      } else {
        toast.info('No new messages to process');
      }
      
      await fetchMessages(); // Refresh to show updated status
    } catch (error) {
      console.error('Error processing messages:', error);
      toast.error('Failed to process messages');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (webhookStatus) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Webhook Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            WhatsApp Webhook Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Webhook URL:</span>
              <a 
                href={webhookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            </div>
            <code className="text-xs bg-muted p-2 rounded block">
              {webhookUrl}
            </code>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Verify Token:</span>
              <Badge variant="secondary">Environment Variable</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Set META_WABA_VERIFY_TOKEN in Edge Functions secrets
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testWebhookEndpoint} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Webhook
            </Button>
            <Button onClick={testMessageInsertion} variant="outline" size="sm">
              Insert Test Message
            </Button>
            <Button 
              onClick={testMessageProcessing} 
              variant="secondary" 
              size="sm"
              disabled={loading}
            >
              Process New Messages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Incoming Messages
            <Button onClick={fetchMessages} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages received yet</p>
              <p className="text-xs text-muted-foreground mt-2">
                Send a WhatsApp message to test the webhook
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={message.processed ? 'secondary' : 'default'}>
                        {message.processed ? 'processed' : 'pending'}
                      </Badge>
                      <span className="text-sm font-medium">{message.from_number}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{message.message_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Completed Setup</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• incoming_messages table created</li>
                <li>• RLS policies configured</li>
                <li>• WhatsApp webhook function deployed</li>
                <li>• Verification token configured</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">📋 Next Steps</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Configure Meta App webhook URL</li>
                <li>• Subscribe to message events</li>
                <li>• Send test WhatsApp message</li>
                <li>• Verify messages appear in table</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}