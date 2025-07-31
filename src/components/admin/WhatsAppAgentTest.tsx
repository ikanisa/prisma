import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"

export function WhatsAppAgentTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const fetchStats = async () => {
    try {
      const [incomingRes, outgoingRes, cronRes] = await Promise.all([
        supabase.from('incoming_messages').select('status').order('created_at', { ascending: false }).limit(10),
        supabase.from('outgoing_messages').select('status').order('created_at', { ascending: false }).limit(10),
        supabase.rpc('admin_exists') // Just to test DB connectivity
      ])
      
      setStats({
        incoming: incomingRes.data || [],
        outgoing: outgoingRes.data || [],
        dbConnected: !incomingRes.error
      })
    } catch (err) {
      console.error('Stats error:', err)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const testEnvironment = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('test-whatsapp-agent')
      
      if (error) {
        setResult({ success: false, error: error.message })
      } else {
        setResult(data)
      }
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const processMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('process-incoming-messages')
      
      if (error) {
        setResult({ success: false, error: error.message })
      } else {
        setResult(data)
        fetchStats() // Refresh stats after processing
      }
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const testSendMessage = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to_number: '16315551181', // Test number
          message_text: 'Test message from WhatsApp Agent Test Interface'
        }
      })
      
      if (error) {
        setResult({ success: false, error: error.message })
      } else {
        setResult(data)
      }
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">WhatsApp Agent Integration Test</h2>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded">
            <h3 className="font-medium">Incoming Messages</h3>
            <p className="text-2xl font-bold">{stats?.incoming?.length || 0}</p>
            <p className="text-sm text-muted-foreground">
              {stats?.incoming?.filter(m => m.status === 'received').length || 0} pending
            </p>
          </div>
          <div className="p-4 bg-muted rounded">
            <h3 className="font-medium">Outgoing Messages</h3>
            <p className="text-2xl font-bold">{stats?.outgoing?.length || 0}</p>
            <p className="text-sm text-muted-foreground">
              {stats?.outgoing?.filter(m => m.status === 'sent').length || 0} sent
            </p>
          </div>
          <div className="p-4 bg-muted rounded">
            <h3 className="font-medium">System Status</h3>
            <p className="text-2xl font-bold">{stats?.dbConnected ? '✅' : '❌'}</p>
            <p className="text-sm text-muted-foreground">Database</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button 
            onClick={testEnvironment} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Testing...' : 'Test Environment'}
          </Button>
          
          <Button 
            onClick={processMessages} 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Process Messages'}
          </Button>
          
          <Button 
            onClick={testSendMessage} 
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Sending...' : 'Test Send Message'}
          </Button>
        </div>
        
        <Button 
          onClick={fetchStats} 
          variant="ghost" 
          size="sm"
          className="mb-4"
        >
          🔄 Refresh Stats
        </Button>
        
        {/* Results Section */}
        {result && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Latest Result:</h3>
            <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </Card>
      
      {/* Implementation Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">✅ Implementation Status</h3>
        <div className="space-y-2 text-sm">
          <div>✅ <strong>WhatsApp Webhook:</strong> Enhanced with multi-message type support</div>
          <div>✅ <strong>Message Processing:</strong> OpenAI Assistant integration</div>
          <div>✅ <strong>Outbound Messages:</strong> WhatsApp send function</div>
          <div>✅ <strong>Database Schema:</strong> All required tables created</div>
          <div>✅ <strong>Automated Processing:</strong> Cron job running every minute</div>
          <div>✅ <strong>Error Handling:</strong> Comprehensive logging</div>
        </div>
      </Card>
    </div>
  )
}