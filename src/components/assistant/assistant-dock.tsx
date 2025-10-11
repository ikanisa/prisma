import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MouseEvent } from 'react';
import { Activity, AlertTriangle, CheckCircle2, MessageCircle, Send, Loader2, FileText, Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/enhanced-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { recordClientEvent } from '@/lib/client-events';
import { AssistantChip } from '@/components/ui/assistant-chip';
import {
  useAssistantChips,
  useAssistantDockPlacementClass,
  useAssistantMotionPreset,
  useAssistantThemeTokens,
} from '@/lib/system-config';
import { useLocation } from 'react-router-dom';
import { validateAssistantResponseStyle } from '@/lib/assistant-style-policy';

interface AssistantAction {
  label: string;
  tool: string;
  description?: string;
  args?: Record<string, unknown>;
}

interface AssistantCitation {
  documentId?: string;
  name?: string;
  repo?: string;
}

type AssistantStatus = 'offline' | 'idle' | 'thinking' | 'ready';

interface AssistantAutopilotMetrics {
  total?: number;
  running?: number;
  failed?: number;
  pending?: number;
}

interface AssistantAutopilotRun {
  id?: string;
  kind?: string;
  status?: string;
  summary?: string;
  scheduledAt?: string;
  finishedAt?: string;
}

interface AssistantAutopilotSnapshot {
  metrics?: AssistantAutopilotMetrics;
  recent?: AssistantAutopilotRun[];
  running?: AssistantAutopilotRun[];
  failed?: AssistantAutopilotRun[];
  next?: AssistantAutopilotRun | null;
}

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>;
  citations?: AssistantCitation[];
  tool?: string;
  needs?: unknown;
  timestamp: string;
}

interface AssistantResponsePayload {
  messages?: Array<{ role: string; content: string }>;
  actions?: AssistantAction[];
  data?: Record<string, unknown>;
  citations?: AssistantCitation[];
  tool?: string;
  needs?: unknown;
}

interface TaskDraft {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
}

const INITIAL_TASK_DRAFT: TaskDraft = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
};

export function AssistantDock() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [taskComposerVisible, setTaskComposerVisible] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(INITIAL_TASK_DRAFT);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const orgSlug = currentOrg?.slug;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const pushAssistantMessage = useCallback((payload: AssistantResponsePayload) => {
    const assistantMessage = payload.messages?.[0]?.content ?? '';
    if (assistantMessage) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage,
          data: payload.data,
          citations: payload.citations,
          tool: payload.tool,
          needs: payload.needs,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    if (payload.actions) {
      setActions(payload.actions);
    }
    validateAssistantResponseStyle(payload);
  }, []);

  const callAssistant = useCallback(
    async (body: Record<string, unknown>) => {
      if (!orgSlug) {
        throw new Error('Select an organisation to chat with the assistant.');
      }
      const response = await authorizedFetch('/v1/assistant/message', {
        method: 'POST',
        body: JSON.stringify({ orgSlug, ...body }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const payload = (await response.json()) as AssistantResponsePayload;
      if (!response.ok) {
        const message = (payload as any)?.error ?? 'Assistant request failed';
        throw new Error(message);
      }
      return payload;
    },
    [orgSlug],
  );

  const initialiseConversation = useCallback(async () => {
    if (initialised || !orgSlug) return;
    setInitialised(true);
    try {
      setLoading(true);
      const payload = await callAssistant({ message: '' });
      pushAssistantMessage(payload);
    } catch (error) {
      toast({
        title: 'Assistant unavailable',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [callAssistant, initialised, orgSlug, pushAssistantMessage, toast]);

  const toggleOpen = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const sendUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!initialised) {
        setInitialised(true);
      }
      const trimmed = content.trim();
      const userMessage: AssistantMessage = {
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      try {
        setLoading(true);
        const payload = await callAssistant({ message: trimmed });
        pushAssistantMessage(payload);
      } catch (error) {
        toast({
          title: 'Assistant error',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [callAssistant, initialised, pushAssistantMessage, toast],
  );

  useEffect(() => {
    if (open) {
      void initialiseConversation();
    }
  }, [open, initialiseConversation]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    await sendUserMessage(trimmed);
  }, [input, sendUserMessage]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const runTool = useCallback(
    async (tool: string, args: Record<string, unknown>) => {
      if (!initialised) {
        setInitialised(true);
      }
      const userMessage: AssistantMessage = {
        role: 'user',
        content: `\u{1F527} ${tool.replace(/[._]/g, ' ')}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      try {
        setLoading(true);
        const payload = await callAssistant({ tool, args });
        if (payload.needs && (payload.needs as any)?.fields?.includes('title')) {
          setTaskComposerVisible(true);
        }
        pushAssistantMessage(payload);
      } catch (error) {
        toast({
          title: 'Assistant tool failed',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [callAssistant, initialised, pushAssistantMessage, toast],
  );

  const handleActionClick = useCallback(
    (action: AssistantAction) => {
      if (action.tool === 'tasks.create') {
        setTaskComposerVisible(true);
        return;
      }
      if (action.tool === 'documents.list') {
        void runTool(action.tool, (action.args as Record<string, unknown> | undefined) ?? { limit: 5 });
        return;
      }
      void runTool(action.tool, (action.args as Record<string, unknown> | undefined) ?? {});
    },
    [runTool],
  );

  const handleTaskComposerSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!taskDraft.title.trim()) {
        toast({
          title: 'Task title required',
          description: 'Please provide a title so I can create the task.',
          variant: 'destructive',
        });
        return;
      }
      await runTool('tasks.create', {
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim() || undefined,
        priority: taskDraft.priority,
        dueDate: taskDraft.dueDate || undefined,
      });
      setTaskDraft(INITIAL_TASK_DRAFT);
      setTaskComposerVisible(false);
    },
    [runTool, taskDraft, toast],
  );

  const location = useLocation();
  const configuredChips = useAssistantChips(location.pathname);
  const assistantOffline = useMemo(() => !orgSlug, [orgSlug]);
  const dockPlacementClass = useAssistantDockPlacementClass();
  const motionPreset = useAssistantMotionPreset();
  const themeTokens = useAssistantThemeTokens();
  const shellMotionAttribute =
    motionPreset.panel.transition?.type ?? (motionPreset.panel.transition ? 'custom' : undefined);

  const defaultChips = useMemo(
    () => [
      'Daily briefing',
      'Prep my meeting',
      'Suggest next actions',
    ],
    [],
  );

  const quickPrompts = useMemo(() => {
    const chipsToUse = configuredChips.length ? configuredChips : defaultChips;
    return chipsToUse.map((chip) => ({
      label: chip,
      prompt: currentOrg?.name ? `${chip} for ${currentOrg.name}` : chip,
    }));
  }, [configuredChips, currentOrg?.name, defaultChips]);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  );

  const previewText = useMemo(() => {
    const base = lastAssistantMessage?.content ?? 'I can brief you, draft tasks, and surface open risks when you need me.';
    return base.length > 110 ? `${base.slice(0, 107)}…` : base;
  }, [lastAssistantMessage]);

  const assistantStatus = useMemo<AssistantStatus>(() => {
    if (assistantOffline) return 'offline';
    if (loading) return 'thinking';
    return messages.length ? 'ready' : 'idle';
  }, [assistantOffline, loading, messages]);

  const statusLabel: Record<AssistantStatus, string> = {
    offline: 'Connect to start',
    idle: 'Ready to brief',
    thinking: 'Working',
    ready: 'On duty',
  };

  const statusIndicatorTone: Record<AssistantStatus, string> = {
    offline: 'bg-muted-foreground/40',
    idle: 'bg-emerald-400',
    thinking: 'bg-amber-400 animate-pulse',
    ready: 'bg-primary',
  };

  const handlePromptClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, prompt: string) => {
      event.stopPropagation();
      if (assistantOffline) {
        toast({
          title: 'Assistant unavailable',
          description: 'Join or select an organisation to talk with the agent.',
          variant: 'destructive',
        });
        return;
      }
      setOpen(true);
      await sendUserMessage(prompt);
    },
    [assistantOffline, sendUserMessage, toast],
  );

  return (
    <div className={dockPlacementClass} data-shell-motion={shellMotionAttribute}>
      <AnimatePresence>
        {!open ? (
          <motion.div
            key="assistant-toggle"
            initial={motionPreset.toggle.initial}
            animate={motionPreset.toggle.animate}
            exit={motionPreset.toggle.exit}
            transition={motionPreset.toggle.transition}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={toggleOpen}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleOpen();
                }
              }}
              className={cn(
                'group w-80 max-w-[90vw] cursor-pointer rounded-3xl p-4 shadow-2xl backdrop-blur transition duration-200',
                themeTokens.toggleSurface,
                themeTokens.toggleBorder,
                assistantOffline ? 'opacity-70' : 'hover:border-primary/60 hover:shadow-primary/20',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-primary-foreground',
                    themeTokens.accentGradient,
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  <span
                    className={cn(
                      'absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background transition',
                      statusIndicatorTone[assistantStatus],
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Glow Agent</p>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {statusLabel[assistantStatus]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Your always-on audit copilot</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{previewText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full px-3 text-[11px]"
                    onClick={(event) => void handlePromptClick(event, prompt.prompt)}
                    disabled={assistantOffline}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="assistant-panel"
            initial={motionPreset.panel.initial}
            animate={motionPreset.panel.animate}
            exit={motionPreset.panel.exit}
            transition={motionPreset.panel.transition}
            className={cn(
              'w-96 max-w-[90vw] rounded-2xl backdrop-blur shadow-2xl',
              themeTokens.panelSurface,
              themeTokens.panelBorder,
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-primary-foreground',
                    themeTokens.accentGradient,
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Glow Agent</p>
                  <p className="text-xs text-muted-foreground">Document-aware, zero-typing partner</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleOpen}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-[420px] overflow-hidden flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {messages.length === 0 && !loading ? (
                  <p className="text-sm text-muted-foreground">
                    {assistantOffline
                      ? 'Join an organisation to start using the assistant.'
                      : 'Say “What should I do next?” or choose an action below.'}
                  </p>
                ) : null}
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div
                      key={`assistant-message-${index}-${message.timestamp}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                    >
                  <div
                    className={cn(
                      'flex w-full items-end gap-3',
                      message.role === 'assistant' ? 'justify-start' : 'flex-row-reverse justify-start',
                    )}
                      >
                        <Avatar className="h-8 w-8 border border-border/60 bg-background">
                          <AvatarFallback className="text-xs font-semibold">
                            {message.role === 'assistant' ? 'AI' : 'You'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[78%] space-y-2">
                          <div
                            className={cn(
                              'rounded-2xl px-3 py-2 text-sm shadow-sm backdrop-blur-sm',
                              message.role === 'assistant'
                                ? 'border border-border/60 bg-muted/80 text-foreground'
                                : 'bg-primary text-primary-foreground',
                            )}
                          >
                            <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                            {message.data && message.data.tasks && Array.isArray(message.data.tasks) ? (
                              <ul className="mt-2 space-y-1 text-xs opacity-90">
                                {(message.data.tasks as Array<Record<string, unknown>>).map((task) => (
                                  <li key={String(task.id)} className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
                                    <span>{String(task.title)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {message.data && message.data.documents && Array.isArray(message.data.documents) ? (
                              <div className="mt-2 space-y-1 text-xs opacity-90">
                                {(message.data.documents as Array<Record<string, unknown>>).map((doc) => (
                                  <div key={String(doc.id)} className="flex items-center gap-2">
                                    <FileText className="w-3 h-3" />
                                    <span>{String(doc.name)}</span>
                                    <span className="text-muted-foreground">{String(doc.repo_folder ?? '')}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {message.citations && message.citations.length > 0 ? (
                              <div className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">Citations</p>
                                {message.citations.map((citation, idx) => (
                                  <div key={`${citation.documentId ?? idx}`} className="flex items-center gap-2">
                                    <FileText className="w-3 h-3" />
                                    <span>{citation.name ?? citation.documentId ?? 'Document'}</span>
                                    {citation.repo ? (
                                      <span className="text-muted-foreground">({citation.repo})</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {(() => {
                              const autopilot = (message.data as Record<string, unknown> | undefined)?.autopilot as
                                | AssistantAutopilotSnapshot
                                | undefined;
                              if (!autopilot?.metrics) return null;
                              const metrics = autopilot.metrics;
                              const recent = autopilot.recent ?? [];
                              return (
                                <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-background/60 p-3 text-xs">
                                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                      <Activity className="h-3 w-3" /> Autopilot snapshot
                                    </span>
                                    <span>Running: {metrics.running ?? 0}</span>
                                    <span>Pending: {metrics.pending ?? 0}</span>
                                    <span className={cn('inline-flex items-center gap-1', (metrics.failed ?? 0) > 0 ? 'text-destructive font-medium' : '')}>
                                      <AlertTriangle className="h-3 w-3" /> {metrics.failed ?? 0} failures
                                    </span>
                                  </div>
                                  {autopilot.next ? (
                                    <div className="rounded-lg border border-border/60 bg-muted/40 p-2">
                                      <p className="font-medium text-foreground">Next run • {autopilot.next.kind?.replace('_', ' ')}</p>
                                      <p className="text-muted-foreground">Scheduled at {autopilot.next.scheduledAt ?? 'TBC'}</p>
                                    </div>
                                  ) : null}
                                  {recent.length ? (
                                    <div className="space-y-2">
                                      {recent.slice(0, 3).map((run) => (
                                        <div key={run.id ?? run.summary} className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/80 p-2">
                                          <div className="mt-0.5">
                                            {run.status === 'FAILED' ? (
                                              <AlertTriangle className="h-3 w-3 text-destructive" />
                                            ) : run.status === 'DONE' ? (
                                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            ) : (
                                              <Activity className="h-3 w-3 text-primary" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="font-medium capitalize text-foreground">{run.kind?.replace('_', ' ') ?? 'Run'}</p>
                                            <p className="text-muted-foreground">{run.summary ?? 'Run recorded.'}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                          {message.timestamp ? (
                            <p
                              className={cn(
                                'text-[11px] uppercase tracking-wide text-muted-foreground',
                                message.role === 'assistant' ? 'text-muted-foreground' : 'text-primary/80 text-right',
                              )}
                            >
                              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Thinking
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-border px-4 py-3 space-y-3">
                {actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <AssistantChip
                        key={action.tool}
                        label={action.label}
                        description={action.description}
                        onClick={() => handleActionClick(action)}
                        disabled={loading || assistantOffline}
                      />
                    ))}
                  </div>
                ) : null}

                {taskComposerVisible ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <h3 className="text-sm font-medium mb-2">Create a task</h3>
                    <form className="space-y-2" onSubmit={handleTaskComposerSubmit}>
                      <Input
                        placeholder="Task title"
                        value={taskDraft.title}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                        required
                      />
                      <Textarea
                        placeholder="Details (optional)"
                        value={taskDraft.description}
                        onChange={(event) => setTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={taskDraft.dueDate}
                          onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                          className="flex-1"
                        />
                        <select
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                          value={taskDraft.priority}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({
                              ...prev,
                              priority: event.target.value as TaskDraft['priority'],
                            }))
                          }
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setTaskComposerVisible(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="gradient" disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span className="ml-2">Create</span>
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Input
                    placeholder={assistantOffline ? 'Join an organisation to start' : 'Ask me anything...'}
                    value={input}
                    disabled={assistantOffline || loading}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button variant="gradient" size="icon" disabled={assistantOffline || loading} onClick={() => void handleSend()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
