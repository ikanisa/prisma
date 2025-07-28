import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

export default function AIAgentsModels() {
  const navigate = useNavigate();

  // Redirect to the new Omni Agent Dashboard
  const handleRedirect = () => {
    navigate('/admin/omni-agent');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Legacy AI Agents (Deprecated)</h1>
          <p className="text-muted-foreground">
            This page shows legacy multi-agent data. The system has been upgraded to use a unified Omni Agent.
          </p>
        </div>
        <Button onClick={handleRedirect}>
          <Bot className="mr-2 h-4 w-4" />
          View Omni Agent Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Migration Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">System Upgrade Notice</h3>
            <p className="text-yellow-700 mb-4">
              The easyMO platform has been upgraded from multiple specialized agents to a single, 
              unified Omni Agent that handles all services more efficiently.
            </p>
            <div className="space-y-2 text-sm text-yellow-700">
              <div>✅ Legacy agent data has been cleaned up</div>
              <div>✅ All conversations now route through the Omni Agent</div>
              <div>✅ Skills-based architecture is now active</div>
              <div>✅ Performance metrics are consolidated</div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={handleRedirect} size="lg">
              Access New Omni Agent Dashboard →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}