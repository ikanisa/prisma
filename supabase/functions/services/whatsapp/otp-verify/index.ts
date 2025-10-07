import { createSupabaseClientWithAuth } from '../../_shared/supabase-client.ts';

const MAX_ATTEMPTS = 3;
const LOCKOUT_EXTENSION_SECONDS = 600;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const userId = String(payload.userId ?? '').trim();
  const orgId = String(payload.orgId ?? '').trim();
  const code = String(payload.code ?? '').trim();

  if (!userId || !orgId || !code) {
    return jsonResponse(400, { error: 'missing_fields' });
  }

  if (!/^[0-9]{4,8}$/.test(code)) {
    return jsonResponse(400, { error: 'invalid_code' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'missing_authorization' });
  }

  const supabase = await createSupabaseClientWithAuth(authHeader);
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser?.user?.id) {
    return jsonResponse(401, { error: 'invalid_token' });
  }
  if (authUser.user.id !== userId) {
    return jsonResponse(403, { error: 'forbidden' });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError) {
    console.error('mfa.verify_membership_failed', membershipError);
    return jsonResponse(502, { error: 'membership_lookup_failed' });
  }
  if (!membership) {
    return jsonResponse(403, { error: 'not_a_member' });
  }

  const { data: challenges, error: challengeError } = await supabase
    .from('mfa_challenges')
    .select('id, code_hash, expires_at, attempts, consumed, created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('channel', 'WHATSAPP')
    .order('created_at', { ascending: false })
    .limit(1);
  if (challengeError) {
    console.error('mfa.challenge_fetch_failed', challengeError);
    return jsonResponse(502, { error: 'challenge_lookup_failed' });
  }
  if (!challenges?.length) {
    return jsonResponse(404, { error: 'challenge_not_found' });
  }

  const challenge = challenges[0];
  if (challenge.consumed) {
    return jsonResponse(409, { error: 'challenge_consumed' });
  }

  const now = new Date();
  const expiresAt = challenge.expires_at ? new Date(challenge.expires_at) : null;
  if (expiresAt && expiresAt < now) {
    return jsonResponse(410, { error: 'challenge_expired' });
  }

  const hash = await hashCode(code);
  if (hash !== challenge.code_hash) {
    const newAttempts = (challenge.attempts ?? 0) + 1;
    let updateExpires: string | undefined;
    let consumed = false;
    if (newAttempts >= MAX_ATTEMPTS) {
      updateExpires = new Date(Date.now() + LOCKOUT_EXTENSION_SECONDS * 1000).toISOString();
      consumed = false;
    }
    const updatePayload: Record<string, unknown> = { attempts: newAttempts };
    if (updateExpires) {
      updatePayload.expires_at = updateExpires;
    }
    const { error: updateError } = await supabase
      .from('mfa_challenges')
      .update(updatePayload)
      .eq('id', challenge.id);
    if (updateError) {
      console.error('mfa.challenge_attempt_update_failed', updateError);
    }
    if (newAttempts >= MAX_ATTEMPTS) {
      return jsonResponse(429, { error: 'otp_locked' });
    }
    return jsonResponse(400, { error: 'invalid_code' });
  }

  const { error: consumeError } = await supabase
    .from('mfa_challenges')
    .update({ consumed: true, attempts: (challenge.attempts ?? 0) + 1 })
    .eq('id', challenge.id);
  if (consumeError) {
    console.error('mfa.challenge_consume_failed', consumeError);
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ whatsapp_verified: true })
    .eq('id', userId);
  if (profileError) {
    console.error('mfa.profile_verify_update_failed', profileError);
  }

  const nowIso = now.toISOString();
  const activityPayloads = [
    {
      org_id: orgId,
      user_id: userId,
      action: 'MFA_OTP_VERIFIED',
      entity_type: 'IAM',
      entity_id: challenge.id,
      metadata: { channel: 'WHATSAPP' },
      created_at: nowIso,
    },
    {
      org_id: orgId,
      user_id: userId,
      action: 'WHATSAPP_LINKED',
      entity_type: 'IAM',
      entity_id: userId,
      metadata: { channel: 'WHATSAPP' },
      created_at: nowIso,
    },
  ];
  const { error: activityError } = await supabase.from('activity_log').insert(activityPayloads);
  if (activityError) {
    console.error('mfa.verify_activity_failed', activityError);
  }

  return jsonResponse(200, { success: true });
});
