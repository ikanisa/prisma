import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Send, Bot } from 'lucide-react';

export function MessageProcessingTest() {
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('+250795467385');
  const [testMessage, setTestMessage] = useState('Hello, I need help with payments');
  const [result, setResult] = useState<any>(null);

  const insertAndProcessMessage = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Step 1: Insert test message
      console.log('Step 1: Inserting test message...');
      const { data: insertData, error: insertError } = await supabase
        .from('incoming_messages')
        .insert({
          phone_number: testPhone,
          message: testMessage,
          status: 'new'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      toast.success('Test message inserted');
      
      // Step 2: Wait a moment then process
      console.log('Step 2: Processing message with AI...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: processData, error: processError } = await supabase.functions.invoke('process-incoming-messages');
      
      if (processError) throw processError;
      
      setResult({
        insert: insertData,
        process: processData,
        success: true
      });
      
      if (processData?.success) {
        toast.success('✅ Message processed and WhatsApp reply sent!');
      } else {
        toast.info('No new messages found to process');
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      setResult({
        error: error.message,
        success: false
      });
      toast.error('Test failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    setLoading(true);
    try {
      // Test environment variables are set
      const { data, error } = await supabase.functions.invoke('env-check');
      
      if (error) throw error;
      
      toast.success('Credentials check completed');
      setResult(data);
    } catch (error) {
      console.error('Credentials test failed:', error);
      toast.error('Credentials test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Message Processing Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Phone Number</label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+250795467385"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Message</label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Hello, I need help with payments"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={insertAndProcessMessage}
              disabled={loading}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Testing...' : 'Test Full Flow'}
            </Button>
            
            <Button 
              onClick={testCredentials}
              disabled={loading}
              variant="outline"
            >
              Check Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-3">
                <div>
                  <Badge variant="default" className="mb-2">SUCCESS</Badge>
                  <p className="text-sm text-green-600">
                    ✅ Message inserted → AI processed → WhatsApp reply sent
                  </p>
                </div>
                
                {result.process?.ai_reply && (
                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm font-medium mb-1">AI Reply:</p>
                    <p className="text-sm">{result.process.ai_reply}</p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  <p>Phone: {result.process?.phone_number}</p>
                  <p>Original: {result.process?.original_message}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="destructive" className="mb-2">ERROR</Badge>
                <p className="text-sm text-red-600">{result.error}</p>
                
                <div className="bg-red-50 p-3 rounded text-xs">
                  <p className="font-medium mb-1">Common issues:</p>
                  <ul className="space-y-1">
                    <li>• WhatsApp API credentials not set in Supabase secrets</li>
                    <li>• OpenAI API key not configured</li>
                    <li>• Phone number format issues</li>
                    <li>• Network connectivity</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">WHATSAPP_ACCESS_TOKEN</span>
              <Badge variant="outline">Required in Supabase Secrets</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">WHATSAPP_PHONE_ID</span>
              <Badge variant="outline">561637583695258</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">OPENAI_API_KEY</span>
              <Badge variant="outline">Required in Supabase Secrets</Badge>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
            <p className="font-medium">⚠️ Security Note:</p>
            <p>Never share your API tokens publicly. They should be stored as secrets in Supabase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}