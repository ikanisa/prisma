import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';

const notifyWebhook = Deno.env.get('ERROR_NOTIFY_WEBHOOK');

export async function logEdgeError(
  client: SupabaseClient<Database>,
  params: {
    module: string;
    message: string;
    orgId?: string | null;
    orgSlug?: string | null;
    context?: Record<string, unknown>;
  },
) {
  try {
    let orgId = params.orgId ?? null;

    if (!orgId && params.orgSlug) {
      const { data, error } = await client
        .from('organizations')
        .select('id')
        .eq('slug', params.orgSlug)
        .maybeSingle();
      if (!error && data) {
        orgId = data.id;
      }
    }

    const reason = params.context
      ? `${params.message} | context=${JSON.stringify(params.context)}`
      : params.message;

    if (orgId) {
      await client.from('telemetry_refusal_events').insert({
        org_id: orgId,
        module: params.module,
        event: 'EDGE_FUNCTION_ERROR',
        reason,
        severity: 'ERROR',
      });
    }

    if (notifyWebhook) {
      await fetch(notifyWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ ${params.module} error: ${reason}`,
        }),
      }).catch((error) => console.error('error-notify-webhook-failed', error));
    }
  } catch (error) {
    console.error('logEdgeError_failed', error);
  }
}
