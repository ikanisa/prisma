import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useState } from "react"

export function WhatsAppAgentTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAgent = async () => {
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
      }
    } catch (err) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">WhatsApp Agent Test</h2>
      
      <div className="space-y-4">
        <Button 
          onClick={testAgent} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Environment & Agent'}
        </Button>
        
        <Button 
          onClick={processMessages} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? 'Processing...' : 'Process Pending Messages'}
        </Button>
        
        {result && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  )
}