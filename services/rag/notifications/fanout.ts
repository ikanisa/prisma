import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../../supabase/src/integrations/supabase/types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type DispatchInsert = Database['public']['Tables']['notification_dispatch_queue']['Insert'];
type DispatchRow = Database['public']['Tables']['notification_dispatch_queue']['Row'];
type UserPreferenceRow = Database['public']['Tables']['user_notification_preferences']['Row'];
type AppUserRow = Database['public']['Tables']['app_users']['Row'];

type LogInfo = (message: string, meta?: Record<string, unknown>) => void;
type LogError = (message: string, error: unknown, meta?: Record<string, unknown>) => void;

interface FanoutSchedulerOptions {
  supabase: SupabaseClient<Database>;
  orgId: string;
  notifications: Array<Pick<NotificationRow, 'id' | 'user_id' | 'org_id'>>;
  title: string;
  message: string;
  link: string | null;
  kind: string;
  urgent: boolean;
  logInfo: LogInfo;
  logError: LogError;
}

interface FanoutWorkerOptions {
  supabase: SupabaseClient<Database>;
  logInfo: LogInfo;
  logError: LogError;
}

type DispatchPayload = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  title: string;
  message: string;
  link: string | null;
  kind: string;
  orgId: string;
  notificationId: string;
};

const DEFAULT_BATCH_SIZE = Number(process.env.NOTIFY_USER_DISPATCH_BATCH ?? '25');
const DEFAULT_INTERVAL_MS = Number(process.env.NOTIFY_USER_DISPATCH_INTERVAL_MS ?? '5000');
const MAX_ATTEMPTS = Number(process.env.NOTIFY_USER_DISPATCH_MAX_ATTEMPTS ?? '5');
const RETRY_BASE_MS = Number(process.env.NOTIFY_USER_DISPATCH_RETRY_BASE_MS ?? '30000');
const EMAIL_WEBHOOK_URL = process.env.NOTIFY_USER_EMAIL_WEBHOOK ?? '';
const EMAIL_WEBHOOK_AUTH = process.env.NOTIFY_USER_EMAIL_WEBHOOK_AUTH ?? '';
const SMS_WEBHOOK_URL = process.env.NOTIFY_USER_SMS_WEBHOOK ?? '';
const SMS_WEBHOOK_AUTH = process.env.NOTIFY_USER_SMS_WEBHOOK_AUTH ?? '';

let workerStarted = false;
let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

export async function scheduleUrgentNotificationFanout(options: FanoutSchedulerOptions): Promise<void> {
  const { supabase, orgId, notifications, title, message, link, kind, urgent, logInfo, logError } = options;

  if (!urgent || notifications.length === 0) {
    return;
  }

  const userIds = notifications.map((row) => row.user_id);
  const { data: users, error: usersError } = await supabase
    .from('app_users')
    .select('user_id, email, full_name')
    .in('user_id', userIds);

  if (usersError) {
    logError('notification_fanout.users_fetch_failed', usersError, { orgId, userIds: userIds.length });
    return;
  }

  const { data: preferences, error: preferencesError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, org_id, email_enabled, email_override, sms_enabled, sms_number')
    .eq('org_id', orgId)
    .in('user_id', userIds);

  if (preferencesError) {
    logError('notification_fanout.preferences_fetch_failed', preferencesError, { orgId, userIds: userIds.length });
    return;
  }

  const userMap = new Map<string, AppUserRow>();
  for (const user of users ?? []) {
    userMap.set(user.user_id, user);
  }

  const preferenceMap = new Map<string, UserPreferenceRow>();
  for (const preference of preferences ?? []) {
    preferenceMap.set(preference.user_id, preference);
  }

  const queueRows: DispatchInsert[] = [];
  for (const notification of notifications) {
    const user = userMap.get(notification.user_id);
    const preference = preferenceMap.get(notification.user_id);

    const payload: DispatchPayload = {
      title,
      message,
      link,
      kind,
      orgId,
      notificationId: notification.id,
      email: preference?.email_override ?? user?.email ?? null,
      name: user?.full_name ?? null,
      phone: preference?.sms_number ?? null,
    };

    const emailEnabled = preference ? preference.email_enabled : true;
    const targetEmail = payload.email;
    if (emailEnabled && targetEmail) {
      queueRows.push({
        org_id: orgId,
        notification_id: notification.id,
        user_id: notification.user_id,
        channel: 'email',
        payload: payload as Json,
      });
    }

    if (preference?.sms_enabled && preference.sms_number) {
      queueRows.push({
        org_id: orgId,
        notification_id: notification.id,
        user_id: notification.user_id,
        channel: 'sms',
        payload: payload as Json,
      });
    }
  }

  if (queueRows.length === 0) {
    logInfo('notification_fanout.no_channels', { orgId, recipients: notifications.length });
    return;
  }

  const { error: insertError } = await supabase.from('notification_dispatch_queue').insert(queueRows);
  if (insertError) {
    logError('notification_fanout.queue_insert_failed', insertError, { orgId, queueCount: queueRows.length });
    return;
  }

  logInfo('notification_fanout.queued', {
    orgId,
    queueCount: queueRows.length,
    notificationCount: notifications.length,
  });
}

export function startNotificationFanoutWorker(options: FanoutWorkerOptions): void {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  const interval = Number.isFinite(DEFAULT_INTERVAL_MS) && DEFAULT_INTERVAL_MS > 0 ? DEFAULT_INTERVAL_MS : 5000;

  const run = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await processPendingDispatches(options);
    } finally {
      workerRunning = false;
    }
  };

  workerTimer = setInterval(() => {
    void run();
  }, interval);

  void run();
}

async function processPendingDispatches(options: FanoutWorkerOptions): Promise<void> {
  const { supabase, logInfo, logError } = options;

  const { data: pending, error } = await supabase
    .from('notification_dispatch_queue')
    .select('id, org_id, user_id, channel, payload, attempts, status, scheduled_at, notification_id')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(Math.max(1, DEFAULT_BATCH_SIZE));

  if (error) {
    logError('notification_fanout.fetch_failed', error, {});
    return;
  }

  if (!pending || pending.length === 0) {
    return;
  }

  for (const dispatch of pending) {
    await processDispatchRow(dispatch, options).catch((err) => {
      logError('notification_fanout.dispatch_unhandled', err, { dispatchId: dispatch.id });
    });
  }

  logInfo('notification_fanout.batch_processed', { processed: pending.length });
}

async function processDispatchRow(dispatch: DispatchRow, options: FanoutWorkerOptions): Promise<void> {
  const { supabase, logInfo, logError } = options;

  const { data: claimed, error: claimError } = await supabase
    .from('notification_dispatch_queue')
    .update({
      status: 'processing',
      attempts: dispatch.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatch.id)
    .eq('status', 'pending')
    .select('id, attempts, channel, payload, org_id, user_id, notification_id')
    .maybeSingle();

  if (claimError) {
    logError('notification_fanout.claim_failed', claimError, { dispatchId: dispatch.id });
    return;
  }

  if (!claimed) {
    return; // already claimed by another worker
  }

  try {
    await dispatchThroughChannel(claimed, options);
    await supabase
      .from('notification_dispatch_queue')
      .update({
        status: 'sent',
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', claimed.id);

    logInfo('notification_fanout.sent', {
      dispatchId: claimed.id,
      notificationId: claimed.notification_id,
      channel: claimed.channel,
    });
  } catch (err) {
    const attempts = claimed.attempts;
    const nextStatus = attempts >= Math.max(1, MAX_ATTEMPTS) ? 'failed' : 'pending';
    const nextSchedule = nextStatus === 'pending' ? nextRetryTimestamp(attempts) : new Date().toISOString();
    await supabase
      .from('notification_dispatch_queue')
      .update({
        status: nextStatus,
        last_error: err instanceof Error ? err.message : String(err),
        processed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
        scheduled_at: nextSchedule,
      })
      .eq('id', claimed.id);

    logError('notification_fanout.dispatch_failed', err, {
      dispatchId: claimed.id,
      notificationId: claimed.notification_id,
      channel: claimed.channel,
      attempts,
    });
  }
}

async function dispatchThroughChannel(dispatch: DispatchRow, options: FanoutWorkerOptions): Promise<void> {
  const { logInfo } = options;
  const payload = (dispatch.payload as DispatchPayload | null) ?? null;

  if (dispatch.channel === 'email') {
    await deliverEmail(payload, dispatch, options);
    return;
  }

  if (dispatch.channel === 'sms') {
    await deliverSms(payload, dispatch, options);
    return;
  }

  logInfo('notification_fanout.unsupported_channel', {
    dispatchId: dispatch.id,
    channel: dispatch.channel,
  });
}

async function deliverEmail(payload: DispatchPayload | null, dispatch: DispatchRow, options: FanoutWorkerOptions) {
  const { logInfo } = options;
  const target = payload?.email;
  if (!target) {
    throw new Error('email_missing_recipient');
  }

  if (!EMAIL_WEBHOOK_URL) {
    logInfo('notification_fanout.email_noop', {
      dispatchId: dispatch.id,
      email: target,
    });
    return;
  }

  const body = {
    to: target,
    subject: payload?.title ?? 'Agent notification',
    message: payload?.message ?? '',
    link: payload?.link ?? null,
    metadata: {
      orgId: payload?.orgId ?? dispatch.org_id,
      notificationId: payload?.notificationId ?? dispatch.notification_id,
      channel: 'email',
    },
    name: payload?.name ?? null,
  } satisfies Record<string, unknown>;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (EMAIL_WEBHOOK_AUTH) {
    headers.Authorization = `Bearer ${EMAIL_WEBHOOK_AUTH}`;
  }

  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`email_webhook_error_${response.status}_${text}`);
  }
}

async function deliverSms(payload: DispatchPayload | null, dispatch: DispatchRow, options: FanoutWorkerOptions) {
  const { logInfo } = options;
  const target = payload?.phone;
  if (!target) {
    throw new Error('sms_missing_recipient');
  }

  if (!SMS_WEBHOOK_URL) {
    logInfo('notification_fanout.sms_noop', {
      dispatchId: dispatch.id,
      phone: target,
    });
    return;
  }

  const body = {
    to: target,
    message: payload?.message ?? '',
    link: payload?.link ?? null,
    metadata: {
      orgId: payload?.orgId ?? dispatch.org_id,
      notificationId: payload?.notificationId ?? dispatch.notification_id,
      channel: 'sms',
    },
  } satisfies Record<string, unknown>;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SMS_WEBHOOK_AUTH) {
    headers.Authorization = `Bearer ${SMS_WEBHOOK_AUTH}`;
  }

  const response = await fetch(SMS_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`sms_webhook_error_${response.status}_${text}`);
  }
}

function nextRetryTimestamp(attempts: number): string {
  const base = Math.max(1000, RETRY_BASE_MS);
  const exponent = Math.min(6, Math.max(0, attempts - 1));
  const delay = base * Math.pow(2, exponent);
  const jitter = Math.floor(Math.random() * Math.min(delay * 0.25, 60000));
  const next = Date.now() + delay + jitter;
  return new Date(next).toISOString();
}

export function stopNotificationFanoutWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  workerStarted = false;
  workerRunning = false;
}
