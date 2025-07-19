import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, User, MessageSquare, CheckCircle } from "lucide-react";

interface Handoff {
  id: string;
  contact_id: string;
  handoff_at: string;
  handoff_reason: string;
  assigned_agent_id?: string;
  status: string;
}

export default function LiveHandoffs() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHandoffs();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('handoffs')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadHandoffs()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadHandoffs() {
    try {
      const { data, error } = await supabase.functions.invoke('human-handoff', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setHandoffs(data.handoffs || []);
    } catch (error) {
      console.error('Error loading handoffs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load handoffs"
      });
    } finally {
      setLoading(false);
    }
  }

  async function claimHandoff(conversationId: string) {
    try {
      const { error } = await supabase.functions.invoke('human-handoff', {
        body: { 
          action: 'claim', 
          conversation_id: conversationId,
          agent_id: 'current-user' // In real app, get from auth
        }
      });

      if (error) throw error;
      
      toast({
        title: "Handoff Claimed",
        description: "You have been assigned to this conversation"
      });
      
      loadHandoffs();
    } catch (error) {
      console.error('Error claiming handoff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to claim handoff"
      });
    }
  }

  async function resolveHandoff(conversationId: string) {
    try {
      const { error } = await supabase.functions.invoke('human-handoff', {
        body: { 
          action: 'resolve', 
          conversation_id: conversationId,
          agent_id: 'current-user'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Handoff Resolved",
        description: "Conversation has been returned to AI"
      });
      
      loadHandoffs();
    } catch (error) {
      console.error('Error resolving handoff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve handoff"
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Live Handoffs</h1>
        <Badge variant="secondary">
          {handoffs.length} active handoffs
        </Badge>
      </div>

      {handoffs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No handoffs pending</h3>
            <p className="text-muted-foreground text-center">
              When customers request human help, they'll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {handoffs.map((handoff) => (
            <Card key={handoff.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Contact: {handoff.contact_id}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      {new Date(handoff.handoff_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!handoff.assigned_agent_id ? (
                      <Button 
                        size="sm" 
                        onClick={() => claimHandoff(handoff.id)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Claim
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveHandoff(handoff.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Reason:</span> {handoff.handoff_reason}
                  </div>
                  {handoff.assigned_agent_id && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Assigned to: {handoff.assigned_agent_id}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}