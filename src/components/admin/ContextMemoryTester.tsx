import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, CheckCircle, XCircle, Loader2, Database, Zap, Search } from "lucide-react";
import { testContextMemoryV3, testMemoryDatabase } from "@/utils/testContextMemory";

export function ContextMemoryTester() {
  const [isTestingMemory, setIsTestingMemory] = useState(false);
  const [isTestingDatabase, setIsTestingDatabase] = useState(false);
  const [memoryTestResult, setMemoryTestResult] = useState<boolean | null>(null);
  const [databaseTestResult, setDatabaseTestResult] = useState<boolean | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setTestLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleTestMemoryAPI = async () => {
    setIsTestingMemory(true);
    setMemoryTestResult(null);
    setTestLogs([]);
    
    addLog('Starting Context Memory V3 API tests...');
    
    // Override console.log to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      addLog(args.join(' '));
      originalLog(...args);
    };
    
    console.error = (...args) => {
      addLog(`ERROR: ${args.join(' ')}`);
      originalError(...args);
    };

    try {
      const result = await testContextMemoryV3();
      setMemoryTestResult(result);
      
      if (result) {
        addLog('✅ All Context Memory V3 tests completed successfully!');
      } else {
        addLog('❌ Some Context Memory V3 tests failed. Check logs above.');
      }
    } catch (error) {
      addLog(`💥 Test suite crashed: ${error}`);
      setMemoryTestResult(false);
    } finally {
      // Restore original console functions
      console.log = originalLog;
      console.error = originalError;
      setIsTestingMemory(false);
    }
  };

  const handleTestDatabase = async () => {
    setIsTestingDatabase(true);
    setDatabaseTestResult(null);
    
    try {
      const result = await testMemoryDatabase();
      setDatabaseTestResult(result);
    } catch (error) {
      setDatabaseTestResult(false);
    } finally {
      setIsTestingDatabase(false);
    }
  };

  const getStatusIcon = (result: boolean | null, isLoading: boolean) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (result === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (result === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getStatusBadge = (result: boolean | null, isLoading: boolean) => {
    if (isLoading) return <Badge variant="secondary">Testing...</Badge>;
    if (result === true) return <Badge variant="default" className="bg-green-500">Passed</Badge>;
    if (result === false) return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline">Not Tested</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Context Memory V3 System Verification</CardTitle>
          </div>
          <CardDescription>
            Test and verify the Context Memory V3 implementation is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Database Connectivity Test */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-medium">Database Connectivity</h3>
                <p className="text-sm text-muted-foreground">Test connection to memory tables</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(databaseTestResult, isTestingDatabase)}
              <Button
                onClick={handleTestDatabase}
                disabled={isTestingDatabase}
                variant="outline"
                size="sm"
              >
                {getStatusIcon(databaseTestResult, isTestingDatabase)}
                Test DB
              </Button>
            </div>
          </div>

          {/* Memory API Test */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <h3 className="font-medium">Memory API Operations</h3>
                <p className="text-sm text-muted-foreground">Test store, retrieve, and predict operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(memoryTestResult, isTestingMemory)}
              <Button
                onClick={handleTestMemoryAPI}
                disabled={isTestingMemory}
                variant="outline"
                size="sm"
              >
                {getStatusIcon(memoryTestResult, isTestingMemory)}
                Test API
              </Button>
            </div>
          </div>

          {/* Test Logs */}
          {testLogs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Test Logs
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-60 overflow-y-auto">
                <code className="text-xs">
                  {testLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </code>
              </div>
            </div>
          )}

          {/* Status Summary */}
          {(memoryTestResult !== null || databaseTestResult !== null) && (
            <Alert>
              <AlertDescription>
                {memoryTestResult === true && databaseTestResult === true && (
                  "🎉 All tests passed! Context Memory V3 system is working correctly."
                )}
                {(memoryTestResult === false || databaseTestResult === false) && (
                  "⚠️ Some tests failed. Check the logs above for details and verify your Supabase connection."
                )}
                {(memoryTestResult === null && databaseTestResult === true) && (
                  "✅ Database connected. Run the API test to verify full functionality."
                )}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Memory Tables:</strong> 
              <span className={databaseTestResult === true ? "text-green-600" : "text-gray-500"}>
                {databaseTestResult === true ? " Connected" : " Unknown"}
              </span>
            </div>
            <div>
              <strong>API Functions:</strong>
              <span className={memoryTestResult === true ? "text-green-600" : "text-gray-500"}>
                {memoryTestResult === true ? " Working" : " Unknown"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}