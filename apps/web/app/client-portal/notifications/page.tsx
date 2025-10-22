'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clientEnv } from '@/src/env.client';

type PreferenceResponse = {
  preference: {
    orgId: string;
    userId: string;
    emailEnabled: boolean;
    emailOverride: string | null;
    smsEnabled: boolean;
    smsNumber: string | null;
    updatedAt: string | null;
    resolvedEmail: string | null;
  };
  defaults?: {
    email: string | null;
    fullName: string | null;
  };
};

const DEFAULT_ORG = clientEnv.NEXT_PUBLIC_DEMO_ORG_ID ?? '';
const DEFAULT_USER = clientEnv.NEXT_PUBLIC_DEMO_USER_ID ?? '';

export default function NotificationPreferencesPage() {
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG);
  const [userId, setUserId] = useState<string>(DEFAULT_USER);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [emailOverride, setEmailOverride] = useState<string>('');
  const [smsEnabled, setSmsEnabled] = useState<boolean>(false);
  const [smsNumber, setSmsNumber] = useState<string>('');
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [defaultEmail, setDefaultEmail] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const canSubmit = useMemo(() => {
    if (!orgId.trim() || !userId.trim()) return false;
    if (smsEnabled && smsNumber.trim().length === 0) return false;
    return true;
  }, [orgId, userId, smsEnabled, smsNumber]);

  const loadPreferences = useCallback(async () => {
    if (!orgId.trim() || !userId.trim()) {
      return;
    }

    setLoading(true);
    setStatus('');
    setError('');

    try {
      const params = new URLSearchParams({ orgId: orgId.trim() });
      const response = await fetch(`/api/notifications/preferences?${params.toString()}`, {
        headers: { 'x-user-id': userId.trim() },
      });
      const body = (await response.json()) as PreferenceResponse & { error?: string };

      if (!response.ok) {
        setError(body.error ?? 'Failed to fetch notification preferences.');
        return;
      }

      setEmailEnabled(body.preference.emailEnabled);
      setEmailOverride(body.preference.emailOverride ?? '');
      setSmsEnabled(body.preference.smsEnabled);
      setSmsNumber(body.preference.smsNumber ?? '');
      setResolvedEmail(body.preference.resolvedEmail ?? null);
      setLastUpdated(body.preference.updatedAt ?? null);
      setDefaultEmail(body.defaults?.email ?? null);
      setDefaultName(body.defaults?.fullName ?? null);
      setStatus('Preferences loaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while fetching preferences.');
    } finally {
      setLoading(false);
    }
  }, [orgId, userId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setStatus('');
    setError('');

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId.trim(),
        },
        body: JSON.stringify({
          orgId: orgId.trim(),
          emailEnabled,
          emailOverride: emailOverride.trim() || null,
          smsEnabled,
          smsNumber: smsNumber.trim() || null,
        }),
      });

      const body = (await response.json()) as PreferenceResponse & { error?: string };
      if (!response.ok) {
        setError(body.error ?? 'Failed to update notification preferences.');
        return;
      }

      setResolvedEmail(body.preference.resolvedEmail ?? null);
      setLastUpdated(body.preference.updatedAt ?? new Date().toISOString());
      setStatus('Notification preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while saving preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-8 p-6" aria-labelledby="notification-preferences-heading">
      <header className="space-y-2">
        <h1 id="notification-preferences-heading" className="text-2xl font-semibold">
          Notification Preferences
        </h1>
        <p className="text-sm text-muted-foreground">
          Control where urgent agent notifications are delivered. Email remains active by default; add an override or opt in to SMS alerts per organisation.
        </p>
      </header>

      <section aria-labelledby="notification-context" className="rounded-lg border p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 id="notification-context" className="text-lg font-semibold">
              Audience Context
            </h2>
            <p className="text-sm text-muted-foreground">
              Provide the organisation and actor identifiers used when calling the <code className="rounded bg-muted px-1 py-0.5 text-xs">notify.user</code> tool. Preferences are stored per user and organisation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPreferences()}
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="org-id-input">
            Organisation Identifier
            <input
              id="org-id-input"
              type="text"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="org-uuid"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="user-id-input">
            Actor Identifier
            <input
              id="user-id-input"
              type="text"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="user-uuid"
            />
          </label>
        </div>
        {defaultEmail || defaultName ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Default contact: {defaultName ? `${defaultName} – ` : ''}
            {defaultEmail ?? 'No email registered'}
          </p>
        ) : null}
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border p-4"
        aria-labelledby="preference-form-heading"
      >
        <div className="space-y-2">
          <h2 id="preference-form-heading" className="text-lg font-semibold">
            Delivery Channels
          </h2>
          <p className="text-sm text-muted-foreground">
            Enable or disable channels used by the urgent notification dispatcher. Email stays enabled unless explicitly turned off.
          </p>
        </div>

        <fieldset className="space-y-4" aria-describedby="email-channel-help">
          <legend className="text-sm font-semibold">Email</legend>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(event) => setEmailEnabled(event.target.checked)}
            />
            Enable email alerts
          </label>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="email-override-input">
              Email override (optional)
            </label>
            <input
              id="email-override-input"
              type="email"
              value={emailOverride}
              onChange={(event) => setEmailOverride(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="analyst@example.com"
              aria-describedby="email-channel-help"
              disabled={!emailEnabled}
            />
            <p id="email-channel-help" className="text-xs text-muted-foreground">
              Leave blank to use the default address {defaultEmail ? `(${defaultEmail})` : ''}. Overrides apply only to this organisation.
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4" aria-describedby="sms-channel-help">
          <legend className="text-sm font-semibold">SMS</legend>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(event) => setSmsEnabled(event.target.checked)}
            />
            Enable SMS alerts
          </label>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="sms-number-input">
              Mobile number
            </label>
            <input
              id="sms-number-input"
              type="tel"
              value={smsNumber}
              onChange={(event) => setSmsNumber(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="+1 415 555 0100"
              disabled={!smsEnabled}
              aria-describedby="sms-channel-help"
            />
            <p id="sms-channel-help" className="text-xs text-muted-foreground">
              Provide an E.164 formatted number to receive urgent dispatches via the SMS webhook.
            </p>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Effective email target: <span className="font-medium text-foreground">{resolvedEmail ?? defaultEmail ?? 'Not set'}</span>
          </p>
          <p>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Not saved yet'}</p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            disabled={!canSubmit || saving}
            aria-busy={saving}
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {status}
          </p>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
