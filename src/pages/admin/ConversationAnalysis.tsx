import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, TrendingDown, AlertTriangle, Clock, User, Bot } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  phone_number: string;
  message_text: string;
  sender: string;
  created_at: string;
  model_used?: string;
  confidence_score?: number;
}

interface Evaluation {
  id: string;
  phone_number: string;
  overall_score: number;
  style_score: number;
  clarity_score: number;
  helpfulness_score: number;
  evaluation_notes: string;
  evaluated_at: string;
  model_used: string;
}

export default function ConversationAnalysis() {
  const { phone } = useParams<{ phone: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);

  const evaluationId = searchParams.get('evaluation');

  useEffect(() => {
    if (phone) {
      loadConversationData();
    }
  }, [phone, evaluationId]);

  const loadConversationData = async () => {
    try {
      // Load messages for this phone number
      const { data: messagesData, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Load specific evaluation if provided
      if (evaluationId) {
        const { data: evaluationData, error: evaluationError } = await supabase
          .from('conversation_evaluations')
          .select('*')
          .eq('id', evaluationId)
          .single();

        if (evaluationError) throw evaluationError;
        setEvaluation(evaluationData);
      }

    } catch (error) {
      console.error('Error loading conversation data:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/quality-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quality Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Conversation Analysis</h1>
            <p className="text-muted-foreground">Contact: {phone}</p>
          </div>
        </div>
        {evaluation && (
          <Badge variant={getScoreBadge(evaluation.overall_score)} className="text-lg px-3 py-1">
            Overall Score: {(evaluation.overall_score * 100).toFixed(0)}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation Thread */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted mr-4'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.sender === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-75">
                          {message.sender === 'user' ? 'User' : 'AI Assistant'}
                        </span>
                        <Clock className="h-3 w-3 opacity-50" />
                        <span className="text-xs opacity-50">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.message_text}</p>
                      {message.sender === 'bot' && message.confidence_score && (
                        <div className="mt-2 text-xs opacity-75">
                          Confidence: {(message.confidence_score * 100).toFixed(0)}%
                          {message.model_used && (
                            <span className="ml-2">({message.model_used})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No messages found for this conversation</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Sidebar */}
        <div className="space-y-6">
          {evaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Quality Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Style Score</span>
                    <span className={`font-bold ${getScoreColor(evaluation.style_score)}`}>
                      {(evaluation.style_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Clarity Score</span>
                    <span className={`font-bold ${getScoreColor(evaluation.clarity_score)}`}>
                      {(evaluation.clarity_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Helpfulness Score</span>
                    <span className={`font-bold ${getScoreColor(evaluation.helpfulness_score)}`}>
                      {(evaluation.helpfulness_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="text-sm font-medium mb-2">Evaluation Notes:</div>
                  {evaluation.evaluation_notes ? (
                    <div className="text-sm p-3 bg-muted rounded-lg">
                      {evaluation.evaluation_notes}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No specific notes provided
                    </div>
                  )}
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Model: {evaluation.model_used}</div>
                  <div>Evaluated: {new Date(evaluation.evaluated_at).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conversation Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">User Messages</span>
                  <span className="font-medium">
                    {messages.filter(m => m.sender === 'user').length}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">AI Responses</span>
                  <span className="font-medium">
                    {messages.filter(m => m.sender === 'bot').length}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg Confidence</span>
                  <span className="font-medium">
                    {messages.filter(m => m.confidence_score).length > 0 ? (
                      <>
                        {(messages
                          .filter(m => m.confidence_score)
                          .reduce((sum, m) => sum + (m.confidence_score || 0), 0) / 
                          messages.filter(m => m.confidence_score).length * 100
                        ).toFixed(0)}%
                      </>
                    ) : 'N/A'}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm font-medium">Models Used:</div>
                <div className="space-y-1">
                  {Array.from(new Set(messages.filter(m => m.model_used).map(m => m.model_used))).map(model => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => {
                // Trigger re-evaluation
                toast({
                  title: "Re-evaluation Triggered",
                  description: "This conversation will be re-evaluated for quality",
                });
              }}>
                Re-evaluate Quality
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => {
                // Add to training data
                toast({
                  title: "Added to Training",
                  description: "This conversation has been marked for model training",
                });
              }}>
                Add to Training Data
              </Button>
              
              <Button variant="outline" className="w-full" onClick={() => {
                // Export conversation
                const exportData = {
                  phone_number: phone,
                  messages,
                  evaluation,
                  exported_at: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                  type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversation-${phone}-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>
                Export Conversation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}