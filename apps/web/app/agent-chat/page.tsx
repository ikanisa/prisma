"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? '';

interface StreamMessage {
  type: string;
  data?: unknown;
}

type ChatkitSessionRow = {
  id: string;
  agent_session_id: string;
  chatkit_session_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export default function AgentChat() {
  const [question, setQuestion] = useState('Summarise ISA 315 key requirements for a senior manager.');
  const [orgSlug, setOrgSlug] = useState('demo');
  const [agentType, setAgentType] = useState<'AUDIT' | 'FINANCE' | 'TAX'>('AUDIT');
  const [engagementId, setEngagementId] = useState('');
  const [context, setContext] = useState('');
  const [events, setEvents] = useState<StreamMessage[]>([]);
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<'plain' | 'tools'>('plain');
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [realtimeSession, setRealtimeSession] = useState<{
    clientSecret: string;
    sessionId?: string | null;
    expiresAt?: string | null;
    turnServers?: Array<{ urls: string; username?: string; credential?: string }>;
  } | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeVoice, setRealtimeVoice] = useState('verse');
  const [chatkitSession, setChatkitSession] = useState<ChatkitSessionRow | null>(null);
  const [chatkitLoading, setChatkitLoading] = useState(false);
  const [chatkitMessage, setChatkitMessage] = useState<string | null>(null);
  const [chatkitError, setChatkitError] = useState<string | null>(null);
  const [chatkitActionInFlight, setChatkitActionInFlight] = useState<'cancel' | 'resume' | null>(null);
  const [resumeNote, setResumeNote] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const startAgentSession = useCallback(async () => {
    const trimmedOrg = orgSlug.trim();
    if (!trimmedOrg) {
      setSessionError('Organisation slug is required to start a session.');
      return;
    }
    setStartingSession(true);
    setSessionError(null);
    setSessionMessage(null);
    setRealtimeError(null);
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const payload: Record<string, unknown> = {
        orgSlug: trimmedOrg,
        agentType,
      };
      const trimmedEngagement = engagementId.trim();
      if (trimmedEngagement) {
        payload.engagementId = trimmedEngagement;
      }

      const res = await fetch(`${API_BASE}/api/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to start agent session (${res.status})`);
      }

      const body = (await res.json()) as { sessionId: string };
      setAgentSessionId(body.sessionId);
      setSessionMessage(`Agent session ${body.sessionId} started.`);
      setRealtimeSession(null);
      setChatkitSession(null);
      setResumeNote('');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start agent session');
    } finally {
      setStartingSession(false);
    }
  }, [agentType, engagementId, orgSlug]);

  const loadChatkitSession = useCallback(async (sessionId: string) => {
    setChatkitLoading(true);
    setChatkitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load ChatKit session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow };
      setChatkitSession(body.session);
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to load ChatKit session');
      setChatkitSession(null);
    } finally {
      setChatkitLoading(false);
    }
  }, []);

  const startStream = (mode: 'plain' | 'tools' = 'plain') => {
    if (!question.trim()) return;

    eventSourceRef.current?.close();
    setEvents([]);
    setOutput('');
    setStreaming(true);
    setStreamMode(mode);

    const params = new URLSearchParams({
      orgSlug: orgSlug.trim(),
      question: question.trim(),
      agentType,
    });
    if (context.trim()) {
      params.set('context', context.trim());
    }

    const path = mode === 'tools' ? '/api/agent/stream/execute' : '/api/agent/stream';
    const url = `${API_BASE}${path}?${params.toString()}`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (event.data === '[DONE]') {
        es.close();
        setStreaming(false);
        return;
      }

      try {
        const payload = JSON.parse(event.data) as StreamMessage;
        setEvents((prev) => [...prev, payload]);
        if (payload.type === 'text-delta' && typeof payload.data === 'string') {
          const segment = payload.data;
          setOutput((prev) => prev + segment);
        }
        if (payload.type === 'text-done' && typeof payload.data === 'string') {
          const finalSegment = payload.data;
          setOutput((prev) => prev + finalSegment);
        }
        if (payload.type === 'text-final' && typeof payload.data === 'string') {
          const finalText = payload.data;
          setOutput((prev) => (prev.length ? `${prev}\n${finalText}` : finalText));
        }
      } catch (err) {
        console.warn('Failed to parse SSE payload', err, event.data);
      }
    };

    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  };

  const stopStream = () => {
    eventSourceRef.current?.close();
    setStreaming(false);
  };

  const requestRealtimeSession = async () => {
    const trimmedOrg = orgSlug.trim();
    if (!trimmedOrg) {
      setRealtimeError('Organisation slug is required.');
      return;
    }
    if (!agentSessionId) {
      setRealtimeError('Start an agent session before requesting a realtime session.');
      return;
    }

    setRealtimeError(null);
    setRealtimeSession(null);
    setChatkitMessage(null);
    setChatkitError(null);
    try {
      const payload: Record<string, unknown> = {
        orgSlug: trimmedOrg,
        agentSessionId,
      };
      const voice = realtimeVoice.trim();
      if (voice) {
        payload.voice = voice;
      }
      const res = await fetch(`${API_BASE}/api/agent/realtime/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const body = (await res.json()) as {
        clientSecret: string;
        sessionId?: string | null;
        expiresAt?: string | null;
        turnServers?: Array<{ urls: string; username?: string; credential?: string }>;
      };
      setRealtimeSession(body);
      if (body.sessionId) {
        await loadChatkitSession(body.sessionId);
        setChatkitMessage('Realtime session created and ChatKit metadata stored.');
      } else {
        setChatkitSession(null);
      }
    } catch (err) {
      setRealtimeError(err instanceof Error ? err.message : 'Failed to create realtime session');
    }
  };

  const cancelChatkitSession = useCallback(async () => {
    const sessionId = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
    if (!sessionId) {
      setChatkitError('No ChatKit session available to cancel.');
      return;
    }
    setChatkitActionInFlight('cancel');
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to cancel session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow | null };
      setChatkitSession(body.session ?? null);
      setChatkitMessage('ChatKit session cancelled.');
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to cancel ChatKit session');
    } finally {
      setChatkitActionInFlight(null);
    }
  }, [chatkitSession, realtimeSession]);

  const resumeChatkitSession = useCallback(async () => {
    const sessionId = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
    if (!sessionId) {
      setChatkitError('No ChatKit session available to resume.');
      return;
    }
    setChatkitActionInFlight('resume');
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const metadataPayload =
        resumeNote.trim().length > 0
          ? { metadata: { note: resumeNote.trim(), resumedFromUi: true } }
          : {};
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(metadataPayload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to resume session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow };
      setChatkitSession(body.session);
      setChatkitMessage('ChatKit session resumed.');
      setResumeNote('');
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to resume ChatKit session');
    } finally {
      setChatkitActionInFlight(null);
    }
  }, [chatkitSession, realtimeSession, resumeNote]);

  const chatkitSessionIdForActions = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
  const chatkitStatus = chatkitSession?.status ?? (chatkitSessionIdForActions ? 'ACTIVE' : '—');

  return (
    <main className="space-y-6 p-6" aria-labelledby="chat-heading">
      <header className="space-y-2">
        <h1 id="chat-heading" className="text-2xl font-semibold">
          Agent Streaming Playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Streams partial output from the OpenAI Responses API. Provide an organisation slug you have access to and a
          prompt. This endpoint is gated by `OPENAI_STREAMING_ENABLED` on the backend.
        </p>
      </header>

      <section aria-label="Stream controls" className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Organisation slug
            <input
              value={orgSlug}
              onChange={(event) => setOrgSlug(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="org-slug"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Agent persona
            <select
              value={agentType}
              onChange={(event) => setAgentType(event.target.value as typeof agentType)}
              className="rounded-md border px-3 py-2"
            >
              <option value="AUDIT">Audit</option>
              <option value="FINANCE">Finance</option>
              <option value="TAX">Tax</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Engagement ID (optional)
            <input
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              className="rounded-md border px-3 py-2"
              placeholder="engagement-id"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Question
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-[120px] rounded-md border px-3 py-2"
            placeholder="Ask the agent..."
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Context (optional)
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className="min-h-[80px] rounded-md border px-3 py-2"
            placeholder="Additional context that will be appended to the prompt"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Realtime voice (optional)
          <input
            value={realtimeVoice}
            onChange={(event) => setRealtimeVoice(event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="verse"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startAgentSession}
            disabled={startingSession}
            className="rounded-md border border-slate-500 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {startingSession ? 'Starting…' : agentSessionId ? 'Restart agent session' : 'Start agent session'}
          </button>
          <button
            type="button"
            onClick={() => startStream('plain')}
            disabled={streaming}
            className="rounded-md border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {streaming && streamMode === 'plain' ? 'Streaming…' : 'Start stream'}
          </button>
          {streaming ? (
            <button
              type="button"
              onClick={stopStream}
              className="rounded-md border border-amber-500 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50"
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => startStream('tools')}
            disabled={streaming}
            className="rounded-md border border-green-500 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {streaming && streamMode === 'tools' ? 'Streaming tools…' : 'Start tool stream'}
          </button>
          <button
            type="button"
            onClick={requestRealtimeSession}
            disabled={!agentSessionId}
            className="rounded-md border border-purple-500 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Request realtime session
          </button>
        </div>
        {sessionError ? (
          <p className="text-sm text-red-600" role="alert">
            {sessionError}
          </p>
        ) : null}
        {sessionMessage ? <p className="text-sm text-emerald-600">{sessionMessage}</p> : null}
        {realtimeError ? (
          <p className="text-sm text-red-600" role="alert">
            {realtimeError}
          </p>
        ) : null}
        {realtimeSession ? (
          <div className="rounded-md border border-dashed p-3 text-xs">
            <p className="font-semibold">Realtime Session</p>
            <p>Client Secret: <code className="break-all">{realtimeSession.clientSecret}</code></p>
            <p>Session ID: {realtimeSession.sessionId ?? 'n/a'}</p>
            <p>Expires At: {realtimeSession.expiresAt ?? 'n/a'}</p>
            {realtimeSession.turnServers && realtimeSession.turnServers.length > 0 ? (
              <div className="mt-2 space-y-1">
                <p className="font-semibold">TURN Servers</p>
                <ul className="space-y-1">
                  {realtimeSession.turnServers.map((server, index) => (
                    <li key={`${server.urls}-${index}`} className="break-all">
                      <span>{server.urls}</span>
                      {server.username ? (
                        <>
                          {' '}
                          <span className="text-muted-foreground">(user: {server.username}{server.credential ? `, cred: ${server.credential}` : ''})</span>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-2 text-muted-foreground">
              Use this secret with OpenAI’s Realtime WebRTC/WebSocket client to establish an audio/video session. It is ephemeral and should not be shared.
            </p>
          </div>
        ) : null}
        {agentSessionId ? (
          <div className="space-y-3 rounded-md border border-dashed p-3 text-xs">
            <div>
              <p className="font-semibold">Agent Session</p>
              <p>Session ID: <code className="break-all">{agentSessionId}</code></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (chatkitSessionIdForActions) {
                    void loadChatkitSession(chatkitSessionIdForActions);
                  }
                }}
                disabled={!chatkitSessionIdForActions || chatkitLoading}
                className="rounded-md border border-slate-400 px-3 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatkitLoading ? 'Refreshing…' : 'Refresh ChatKit session'}
              </button>
              <button
                type="button"
                onClick={cancelChatkitSession}
                disabled={!chatkitSessionIdForActions || chatkitActionInFlight === 'cancel'}
                className="rounded-md border border-rose-400 px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatkitActionInFlight === 'cancel' ? 'Cancelling…' : 'Cancel ChatKit session'}
              </button>
              <button
                type="button"
                onClick={resumeChatkitSession}
                disabled={!chatkitSessionIdForActions || chatkitActionInFlight === 'resume'}
                className="rounded-md border border-emerald-400 px-3 py-1 font-medium text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chatkitActionInFlight === 'resume' ? 'Resuming…' : 'Resume ChatKit session'}
              </button>
            </div>
            <div className="space-y-2">
              <p>Status: <span className="font-semibold">{chatkitStatus}</span></p>
              {chatkitSession?.metadata ? (
                <details>
                  <summary className="cursor-pointer select-none font-medium">Metadata</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/40 p-2">
                    {JSON.stringify(chatkitSession.metadata, null, 2)}
                  </pre>
                </details>
              ) : null}
              <p>Updated at: {chatkitSession?.updated_at ? new Date(chatkitSession.updated_at).toLocaleString() : '—'}</p>
            </div>
            <label className="flex flex-col gap-2 text-[0.85rem] font-medium">
              Resume note (optional)
              <input
                value={resumeNote}
                onChange={(event) => setResumeNote(event.target.value)}
                className="rounded-md border px-2 py-1"
                placeholder="Add a note when resuming"
              />
            </label>
            {chatkitError ? (
              <p className="text-[0.85rem] text-red-600" role="alert">
                {chatkitError}
              </p>
            ) : null}
            {chatkitMessage ? <p className="text-[0.85rem] text-emerald-600">{chatkitMessage}</p> : null}
          </div>
        ) : null}
      </section>

      <section aria-label="Agent output" className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Output</h2>
        <pre className="min-h-[160px] whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{output || 'Awaiting output…'}</pre>
      </section>

      <section aria-label="Stream events" className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Stream Events</h2>
        <div className="max-h-[240px] overflow-auto rounded-md bg-muted/30 p-3 text-xs">
          {events.length === 0 ? <p>No events yet.</p> : null}
          {events.map((evt, index) => (
            <pre key={index} className="mb-2 whitespace-pre-wrap">
              {JSON.stringify(evt, null, 2)}
            </pre>
          ))}
        </div>
      </section>
    </main>
  );
}
