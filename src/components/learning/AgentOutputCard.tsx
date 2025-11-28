/**
 * Example: Agent Output with Feedback Integration
 * Shows how to integrate the FeedbackCollector with agent responses
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';
import { Bot, Clock } from 'lucide-react';

interface AgentExecution {
  id: string;
  agent_id: string;
  input: string;
  output: string;
  created_at: string;
  agent_name?: string;
}

interface AgentOutputCardProps {
  execution: AgentExecution;
}

export function AgentOutputCard({ execution }: AgentOutputCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          {execution.agent_name || 'AI Agent'}
          <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(execution.created_at).toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Question */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Your question:</p>
          <p className="text-sm">{execution.input}</p>
        </div>

        {/* Agent Response */}
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap">{execution.output}</div>
        </div>

        {/* Feedback Collector */}
        <div className="pt-4 border-t">
          <FeedbackCollector
            executionId={execution.id}
            agentId={execution.agent_id}
            agentOutput={execution.output}
            onFeedbackSubmitted={() => {
              console.log('Feedback submitted for execution:', execution.id);
              // Optional: Show success toast
              // Optional: Track analytics event
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Usage Example:
 * 
 * import { AgentOutputCard } from '@/components/learning/AgentOutputCard';
 * 
 * function ChatInterface() {
 *   const [executions, setExecutions] = useState<AgentExecution[]>([]);
 * 
 *   return (
 *     <div className="space-y-4">
 *       {executions.map(execution => (
 *         <AgentOutputCard key={execution.id} execution={execution} />
 *       ))}
 *     </div>
 *   );
 * }
 */
