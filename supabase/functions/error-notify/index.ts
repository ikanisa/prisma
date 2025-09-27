import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';

const notifyWebhook = Deno.env.get('ERROR_NOTIFY_WEBHOOK');

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing_authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const supabase = await createSupabaseClientWithAuth<Database>(authHeader);

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const moduleName = String(payload.module ?? 'UNKNOWN');
    const context = payload.context as Record<string, unknown> | undefined;
    const errorMessage = String(payload.error ?? 'Unknown error');

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { user } = userData;
    const orgSlug = typeof payload.orgSlug === 'string' ? payload.orgSlug : null;
    if (!orgSlug) {
      return new Response(JSON.stringify({ error: 'org_slug_required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (orgError) throw orgError;
    if (!org) {
      return new Response(JSON.stringify({ error: 'organization_not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { error: logError } = await supabase.from('telemetry_refusal_events').insert({
      org_id: org.id,
      module: moduleName,
      event: 'EDGE_FUNCTION_ERROR',
      reason: errorMessage,
      severity: 'ERROR',
    });
    if (logError) throw logError;

    if (notifyWebhook) {
      const notificationPayload = {
        text: `⚠️ Error in ${moduleName}\nUser: ${user.email ?? user.id}\nOrg: ${orgSlug}\nMessage: ${errorMessage}\nContext: ${JSON.stringify(context ?? {}, null, 2)}`,
      };

      await fetch(notifyWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload),
      }).catch((webhookError) => {
        console.error('notify_webhook_failed', webhookError);
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('error-notify error', error);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
