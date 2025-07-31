import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  user_id?: string;
  phone_number?: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  expires_at?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, ...payload } = await req.json();

    switch (action) {
      case "create": {
        const notification: NotificationPayload = payload;
        
        const { data, error } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: notification.user_id || null,
            phone_number: notification.phone_number || null,
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            priority: notification.priority || 'normal',
            metadata: notification.metadata || {},
            expires_at: notification.expires_at || null
          })
          .select()
          .single();

        if (error) throw error;

        // Send real-time notification
        await supabaseClient.channel('notifications')
          .send({
            type: 'broadcast',
            event: 'new_notification',
            payload: data
          });

        return new Response(JSON.stringify({
          success: true,
          notification: data
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "mark_read": {
        const { notification_id } = payload;
        
        const { data, error } = await supabaseClient
          .from('notifications')
          .update({
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('id', notification_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          notification: data
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "mark_all_read": {
        const { user_id, phone_number } = payload;
        
        let query = supabaseClient
          .from('notifications')
          .update({
            status: 'read',
            read_at: new Date().toISOString()
          });

        if (user_id) {
          query = query.eq('user_id', user_id);
        } else if (phone_number) {
          query = query.eq('phone_number', phone_number);
        } else {
          throw new Error('Either user_id or phone_number is required');
        }

        const { data, error } = await query
          .eq('status', 'unread')
          .select();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          updated_count: data.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_notifications": {
        const { user_id, phone_number, status, limit = 50, offset = 0 } = payload;
        
        let query = supabaseClient
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (user_id) {
          query = query.eq('user_id', user_id);
        } else if (phone_number) {
          query = query.eq('phone_number', phone_number);
        } else {
          throw new Error('Either user_id or phone_number is required');
        }

        if (status) {
          query = query.eq('status', status);
        }

        // Filter out expired notifications
        query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        const { data, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          notifications: data
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "delete": {
        const { notification_id } = payload;
        
        const { error } = await supabaseClient
          .from('notifications')
          .delete()
          .eq('id', notification_id);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          message: 'Notification deleted successfully'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "cleanup_expired": {
        // Delete expired notifications
        const { data, error } = await supabaseClient
          .from('notifications')
          .delete()
          .lt('expires_at', new Date().toISOString())
          .select();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          deleted_count: data.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Notification manager error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});