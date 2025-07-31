import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active WebSocket connections by bar_id
const connections = new Map<string, Set<WebSocket>>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  const url = new URL(req.url);
  const bar_id = url.searchParams.get("bar_id");
  
  if (!bar_id) {
    return new Response("bar_id parameter required", { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Add this connection to the bar's connection set
  if (!connections.has(bar_id)) {
    connections.set(bar_id, new Set());
  }
  connections.get(bar_id)!.add(socket);
  
  console.log(`KDS WebSocket connected for bar ${bar_id}`);

  socket.onopen = () => {
    // Send initial kitchen items when connection opens
    sendKitchenItems(bar_id, socket);
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.action === 'mark_served') {
        await markItemServed(data.item_id, bar_id);
      } else if (data.action === 'refresh') {
        sendKitchenItems(bar_id, socket);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      socket.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  };

  socket.onclose = () => {
    console.log(`KDS WebSocket disconnected for bar ${bar_id}`);
    connections.get(bar_id)?.delete(socket);
    
    // Clean up empty connection sets
    if (connections.get(bar_id)?.size === 0) {
      connections.delete(bar_id);
    }
  };

  socket.onerror = (error) => {
    console.error(`KDS WebSocket error for bar ${bar_id}:`, error);
  };

  return response;
});

async function sendKitchenItems(bar_id: string, socket: WebSocket) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all preparing items for this bar
    const { data: items, error } = await supabase
      .from('tab_items')
      .select(`
        *,
        products:product_id (name, category),
        bar_tabs:tab_id (table_code, created_at)
      `)
      .eq('status', 'preparing')
      .eq('bar_tabs.bar_id', bar_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching kitchen items:', error);
      return;
    }

    // Group items by time buckets (last 5 minutes, 5-15 minutes, etc.)
    const now = new Date();
    const grouped = {
      urgent: [] as any[],      // > 15 minutes
      warning: [] as any[],     // 5-15 minutes  
      normal: [] as any[]       // < 5 minutes
    };

    items?.forEach(item => {
      const itemTime = new Date(item.created_at);
      const minutesAgo = (now.getTime() - itemTime.getTime()) / (1000 * 60);
      
      if (minutesAgo > 15) {
        grouped.urgent.push(item);
      } else if (minutesAgo > 5) {
        grouped.warning.push(item);
      } else {
        grouped.normal.push(item);
      }
    });

    socket.send(JSON.stringify({
      type: 'kitchen_items',
      data: grouped,
      timestamp: now.toISOString()
    }));

  } catch (error) {
    console.error('Error sending kitchen items:', error);
  }
}

async function markItemServed(item_id: string, bar_id: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update item status
    const { data: item, error } = await supabase
      .from('tab_items')
      .update({ 
        status: 'served',
        served_at: new Date().toISOString()
      })
      .eq('id', item_id)
      .select(`
        *,
        bar_tabs:tab_id (patron_id, table_code)
      `)
      .single();

    if (error) throw error;

    // Broadcast update to all connected KDS screens for this bar
    const barConnections = connections.get(bar_id);
    if (barConnections) {
      const message = JSON.stringify({
        type: 'item_served',
        data: item,
        timestamp: new Date().toISOString()
      });

      barConnections.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      });
    }

    // TODO: Send WhatsApp notification to patron
    // This would integrate with the existing WhatsApp webhook system
    console.log(`Item ${item_id} marked as served for table ${item.bar_tabs.table_code}`);

  } catch (error) {
    console.error('Error marking item served:', error);
  }
}

// Export function to broadcast new orders (called from tab-manager)
export async function broadcastNewOrder(bar_id: string, tabItem: any) {
  const barConnections = connections.get(bar_id);
  if (barConnections) {
    const message = JSON.stringify({
      type: 'new_order',
      data: tabItem,
      timestamp: new Date().toISOString()
    });

    barConnections.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  }
}