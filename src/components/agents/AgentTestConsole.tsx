/**
 * AgentTestConsole Component
 * 
 * Interactive testing interface for agents.
 * Allows sending test inputs and viewing responses.
 */

import { useState } from 'react';
import { useExecuteAgent, type ExecutionResponse } from '@/hooks/use-agents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Clock, Coins, MessageSquare, Loader2, Copy, Check } from 'lucide-react';
import type { Persona } from '@/hooks/use-agents';

export interface AgentTestConsoleProps {
  agentId: string;
  agentName: string;
  personas?: Persona[];
}

export function AgentTestConsole({
  agentId,
  agentName,
  personas = [],
}: AgentTestConsoleProps) {
  const [inputText, setInputText] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | undefined>();
  const [responses, setResponses] = useState<Array<{
    input: string;
    response: ExecutionResponse;
  }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const executeAgent = useExecuteAgent();

  const handleExecute = async () => {
    if (!inputText.trim()) return;

    try {
      const response = await executeAgent.mutateAsync({
        id: agentId,
        input_text: inputText,
        persona_id: selectedPersonaId,
      });

      setResponses((prev) => [
        { input: inputText, response },
        ...prev,
      ]);
      setInputText('');
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  const handleCopyResponse = async (index: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const activePersona = personas.find((p) => p.is_active);
  const defaultPersonaId = selectedPersonaId || activePersona?.id;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Test Console
          </CardTitle>
          <CardDescription>
            Send test messages to {agentName} and see responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {personas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Persona:</span>
              <Select
                value={defaultPersonaId}
                onValueChange={setSelectedPersonaId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                      {persona.is_active && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Active
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Textarea
            placeholder="Enter your test message here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleExecute();
              }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Press ⌘+Enter to send
            </span>
            <Button
              onClick={handleExecute}
              disabled={!inputText.trim() || executeAgent.isPending}
            >
              {executeAgent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Responses Section */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response History</CardTitle>
            <CardDescription>
              {responses.length} test execution{responses.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {responses.map((item, index) => (
              <div key={index} className="space-y-3">
                {index > 0 && <Separator />}
                
                {/* Input */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="h-3 w-3" />
                    You
                  </div>
                  <p className="text-sm">{item.input}</p>
                </div>

                {/* Response */}
                <div className="bg-primary/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{agentName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleCopyResponse(index, item.response.output_text)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{item.response.output_text}</p>
                  
                  {/* Metrics */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.response.latency_ms}ms
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {new Date(item.response.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AgentTestConsole;
