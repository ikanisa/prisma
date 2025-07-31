import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string;
  duration?: number;
}

const E2E_TEST_SCENARIOS = [
  {
    id: 'e2e-shopper-purchase',
    name: 'E2E: Shopper Purchase Flow',
    description: 'Complete shopper onboarding → browse → payment',
    phone: '+250790000001',
    steps: [
      { action: 'send', message: 'Hi', expected: 'Welcome to easyMO' },
      { action: 'send', message: 'Shopper', expected: 'Great choice' },
      { action: 'send', message: 'browse', expected: 'Available Products' },
      { action: 'send', message: '5000', expected: 'USSD:' }
    ]
  },
  {
    id: 'e2e-farmer-listing',
    name: 'E2E: Farmer Product Listing',
    description: 'Complete farmer onboarding and product listing',
    phone: '+250790000002',
    steps: [
      { action: 'send', message: 'Hi', expected: 'Welcome to easyMO' },
      { action: 'send', message: 'Farmer', expected: 'Great! You can list' },
      { action: 'send', message: 'add beans 30kg 1500', expected: 'beans' }
    ]
  },
  {
    id: 'ai-intent-routing',
    name: 'AI Intent Recognition',
    description: 'Test GPT-4o intent analysis and routing',
    phone: '+250790000004',
    steps: [
      { action: 'send', message: 'I need help with my payment', expected: 'payment' },
      { action: 'send', message: 'Can you show me available products?', expected: 'Products' },
      { action: 'send', message: 'I want to go online as driver', expected: 'location' }
    ]
  },
  {
    id: 'vector-memory-test',
    name: 'Vector Memory Context',
    description: 'Test conversation context and memory',
    phone: '+250790000005',
    steps: [
      { action: 'send', message: 'Hi, I am John', expected: 'Welcome' },
      { action: 'send', message: 'I like tomatoes', expected: 'noted' }
    ]
  },
  {
    id: 'sentiment-routing',
    name: 'Sentiment-Based Routing',
    description: 'Test negative sentiment → support ticket',
    phone: '+250790000006',
    steps: [
      { action: 'send', message: 'This is terrible! Nothing works!', expected: 'Sorry' },
      { action: 'send', message: 'I am very frustrated', expected: 'human will help' }
    ]
  }
];

export function TestSuite() {
  const [tests, setTests] = useState<TestResult[]>(
    E2E_TEST_SCENARIOS.map(scenario => ({
      name: scenario.name,
      status: "pending" as const,
      message: scenario.description
    }))
  );
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  // Test QR generation function directly
  const testQRGeneration = async () => {
    try {
      const response = await fetch('https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/qr-render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs'
        },
        body: JSON.stringify({
          momo_number: '0781234567',
          amount: 1000,
          user_id: 'test_user'
        })
      });

      const result = await response.json();
      console.log('🧪 QR Generation Test:', { status: response.status, result });
      
      if (!response.ok) {
        throw new Error(`QR Generation failed: ${result.error || 'Unknown error'}`);
      }
      
      if (!result.data?.qr_url) {
        throw new Error('QR URL not returned in response');
      }
      
      return { success: true, qr_url: result.data.qr_url };
    } catch (error) {
      console.error('❌ QR Generation Test Failed:', error);
      return { success: false, error: error.message };
    }
  };

  const runTests = async () => {
    setRunning(true);
    
    // Reset all tests to pending
    setTests(prev => prev.map(test => ({ ...test, status: "pending" as const })));

    // First test QR generation directly
    console.log('🧪 Testing QR generation...');
    const qrTest = await testQRGeneration();
    if (!qrTest.success) {
      toast({
        title: "QR Generation Failed",
        description: qrTest.error,
        variant: "destructive"
      });
      setRunning(false);
      return;
    }
    
    console.log('✅ QR Generation test passed:', qrTest.qr_url);

    // Run each E2E test scenario
    for (let i = 0; i < E2E_TEST_SCENARIOS.length; i++) {
      const scenario = E2E_TEST_SCENARIOS[i];
      
      try {
        setTests(prev => prev.map(test => 
          test.name === scenario.name 
            ? { ...test, status: "running" as const, message: `Testing ${scenario.description}...` }
            : test
        ));

        const startTime = Date.now();
        
        // Simulate WhatsApp webhook test by calling the edge function
        let testPassed = true;
        let lastResponse = "";

        for (const step of scenario.steps) {
          if (step.action === 'send') {
            try {
              const response = await fetch(`https://ijblirphkrrsnxazohwt.supabase.co/functions/v1/whatsapp-webhook`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYmxpcnBoa3Jyc254YXpvaHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NDAzMzAsImV4cCI6MjA2ODIxNjMzMH0.gH-rvhmX1RvQSlgwbjqq15bHBgKmlDRkAGyfzFyEeKs'}`
                },
                body: JSON.stringify({
                  From: scenario.phone,
                  Body: step.message,
                  MessageSid: `test_${Date.now()}_${Math.random()}`
                })
              });

              if (response.ok) {
                const responseText = await response.text();
                lastResponse = responseText;
                
                // Check if response contains expected content
                if (!responseText.toLowerCase().includes(step.expected.toLowerCase())) {
                  testPassed = false;
                  break;
                }
              } else {
                testPassed = false;
                lastResponse = `HTTP ${response.status}`;
                break;
              }
            } catch (error) {
              testPassed = false;
              lastResponse = `Network error: ${error}`;
              break;
            }
          }
        }

        const duration = Date.now() - startTime;
        
        setTests(prev => prev.map(test => 
          test.name === scenario.name 
            ? { 
                ...test, 
                status: testPassed ? "passed" as const : "failed" as const,
                message: testPassed 
                  ? `✅ All steps completed successfully` 
                  : `❌ Test failed: ${lastResponse}`,
                duration 
              }
            : test
        ));

      } catch (error) {
        setTests(prev => prev.map(test => 
          test.name === scenario.name 
            ? { ...test, status: "failed" as const, message: `❌ Test error: ${error}` }
            : test
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setRunning(false);
    
    const passedTests = tests.filter(test => test.status === "passed").length;
    const totalTests = tests.length;
    
    toast({
      title: "E2E Tests Complete",
      description: `${passedTests}/${totalTests} scenarios passed`,
      variant: passedTests === totalTests ? "default" : "destructive"
    });
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pending: "secondary",
      running: "default",
      passed: "default",
      failed: "destructive"
    } as const;

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Test Suite</CardTitle>
        <Button onClick={runTests} disabled={running}>
          <Play className="w-4 h-4 mr-2" />
          {running ? "Running..." : "Run Tests"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <div className="font-medium">{test.name}</div>
                  {test.message && (
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {test.duration && (
                  <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                )}
                {getStatusBadge(test.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}