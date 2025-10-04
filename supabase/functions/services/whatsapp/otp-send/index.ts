import { createSupabaseClientWithAuth } from '../../_shared/supabase-client.ts';

const OTP_DIGITS = 6;
const OTP_TTL_SECONDS = parseInt(Deno.env.get('MFA_OTP_TTL_SECONDS') ?? '300', 10);
const OTP_RESEND_WINDOW_SECONDS = 60;
const PROVIDER = Deno.env.get('WA_PROVIDER') ?? 'stub';
const PROVIDER_BASE = Deno.env.get('WA_API_BASE') ?? 'https://whatsapp.provider.invalid';

function generateOtp(): string {
  const code = Math.floor(Math.random() * 10 ** OTP_DIGITS)
    .toString()
    .padStart(OTP_DIGITS, '0');
  return code;
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  console.log('whatsapp.send', { provider: PROVIDER, base: PROVIDER_BASE, to, preview: message });
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
  const whatsapp = String(payload.whatsappE164 ?? '').trim();

  if (!userId || !orgId || !whatsapp) {
    return jsonResponse(400, { error: 'missing_fields' });
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
    console.error('mfa.lookup_membership_failed', membershipError);
    return jsonResponse(502, { error: 'membership_lookup_failed' });
  }
  if (!membership) {
    return jsonResponse(403, { error: 'not_a_member' });
  }

  const resendThreshold = new Date(Date.now() - OTP_RESEND_WINDOW_SECONDS * 1000).toISOString();
  const { data: existing } = await supabase
    .from('mfa_challenges')
    .select('id, created_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('channel', 'WHATSAPP')
    .order('created_at', { ascending: false })
    .limit(1);
  if (existing && existing.length) {
    const recent = existing[0];
    if (recent.created_at && recent.created_at > resendThreshold) {
      return jsonResponse(429, { error: 'otp_rate_limited' });
    }
  }

  const otpCode = generateOtp();
  const codeHash = await hashCode(otpCode);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { error: challengeError, data: inserted } = await supabase
    .from('mfa_challenges')
    .insert({
      org_id: orgId,
      user_id: userId,
      channel: 'WHATSAPP',
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    .select('id')
    .limit(1);
  if (challengeError) {
    console.error('mfa.challenge_insert_failed', challengeError);
    return jsonResponse(502, { error: 'challenge_create_failed' });
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ whatsapp_e164: whatsapp })
    .eq('id', userId);
  if (profileError) {
    console.error('mfa.profile_update_failed', profileError);
  }

  await sendWhatsAppMessage(whatsapp, `Your Prisma Glow verification code is ${otpCode}. It expires in 5 minutes.`);

  const { error: activityError } = await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action: 'MFA_OTP_SENT',
    entity_type: 'IAM',
    entity_id: inserted?.[0]?.id ?? null,
    metadata: { channel: 'WHATSAPP' },
  });
  if (activityError) {
    console.error('mfa.activity_log_failed', activityError);
  }

  return jsonResponse(200, { success: true, challengeId: inserted?.[0]?.id ?? null });
});
