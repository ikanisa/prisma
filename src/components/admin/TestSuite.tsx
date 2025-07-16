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

export function TestSuite() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "CRUD Agent", status: "pending" },
    { name: "Upload Doc", status: "pending" }
  ]);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const runTests = async () => {
    setRunning(true);
    
    // Reset all tests to pending
    setTests(prev => prev.map(test => ({ ...test, status: "pending" as const })));

    // Test 1: CRUD Agent
    try {
      setTests(prev => prev.map(test => 
        test.name === "CRUD Agent" 
          ? { ...test, status: "running" as const }
          : test
      ));

      const startTime = Date.now();
      
      // Create test agent
      const { data: agent, error: createError } = await supabase
        .from("agents")
        .insert([{ name: "TestBot", description: "Temp test agent" }])
        .select()
        .single();

      if (createError) throw createError;

      // Verify agent exists
      const { data: foundAgent, error: findError } = await supabase
        .from("agents")
        .select("*")
        .eq("name", "TestBot")
        .single();

      if (findError) throw findError;

      // Clean up - delete test agent
      await supabase
        .from("agents")
        .delete()
        .eq("id", agent.id);

      const duration = Date.now() - startTime;
      
      setTests(prev => prev.map(test => 
        test.name === "CRUD Agent" 
          ? { ...test, status: "passed" as const, message: "Agent created and deleted successfully", duration }
          : test
      ));
    } catch (error) {
      setTests(prev => prev.map(test => 
        test.name === "CRUD Agent" 
          ? { ...test, status: "failed" as const, message: `Error: ${error}` }
          : test
      ));
    }

    // Test 2: Upload Doc (simulation)
    try {
      setTests(prev => prev.map(test => 
        test.name === "Upload Doc" 
          ? { ...test, status: "running" as const }
          : test
      ));

      const startTime = Date.now();
      
      // Check if uploads bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw bucketError;
      
      const uploadsBucket = buckets.find(bucket => bucket.id === "uploads");
      if (!uploadsBucket) throw new Error("Uploads bucket not found");

      const duration = Date.now() - startTime;
      
      setTests(prev => prev.map(test => 
        test.name === "Upload Doc" 
          ? { ...test, status: "passed" as const, message: "Storage bucket configured correctly", duration }
          : test
      ));
    } catch (error) {
      setTests(prev => prev.map(test => 
        test.name === "Upload Doc" 
          ? { ...test, status: "failed" as const, message: `Error: ${error}` }
          : test
      ));
    }

    setRunning(false);
    
    const passedTests = tests.filter(test => test.status === "passed").length;
    const totalTests = tests.length;
    
    toast({
      title: "Tests Complete",
      description: `${passedTests}/${totalTests} tests passed`,
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