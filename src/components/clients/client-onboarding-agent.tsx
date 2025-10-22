import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppStore, Client } from '@/stores/mock-data';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ClientDraft,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  extractClientFieldsFromJson,
  extractClientFieldsFromText,
  mergeDraft,
} from './client-onboarding-helpers';

interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  content: string;
  attachments?: UploadedFile[];
  meta?: Record<string, unknown>;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

const friendlyId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);
interface ClientOnboardingAgentProps {
  onCreated?: (client: Client) => void;
}

export function ClientOnboardingAgent({ onCreated }: ClientOnboardingAgentProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<ClientDraft>({});
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const { toast } = useToast();
  const { currentOrg: storeOrg, currentUser, clients, setClients, addDocument } = useAppStore();
  const { currentOrg: membershipOrg } = useOrganizations();
  const resolvedOrgId = storeOrg?.id ?? membershipOrg?.id ?? null;

  const missingFields = useMemo(
    () => REQUIRED_FIELDS.filter((field) => !draft[field]),
    [draft],
  );

  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const introId = friendlyId();
    const welcome = `Hi, I'm the Prisma Glow onboarding agent. Let's add a new client together. Upload financial statements, engagement letters, or simply tell me about the client and I'll build the profile for you.`;
    const existing = clients.slice(0, 3).map((client) => `• ${client.name} (${client.industry}, ${client.country})`).join('\n');
    const summary = existing ? `I can see your recent clients:\n${existing}\nWhen you're ready, share the next client.` : 'You do not have any clients yet, so this one will be the first.';
    setMessages([
      { id: introId, sender: 'agent', content: welcome },
      { id: friendlyId(), sender: 'agent', content: summary },
    ]);
  }, [clients]);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const pushAgentMessage = useCallback(
    (content: string, meta?: Record<string, unknown>) => {
      pushMessage({ id: friendlyId(), sender: 'agent', content, meta });
    },
    [pushMessage],
  );

  const pushUserMessage = useCallback(
    (content: string, attachments?: UploadedFile[]) => {
      pushMessage({ id: friendlyId(), sender: 'user', content, attachments });
    },
    [pushMessage],
  );

  const readFileContent = (file: File) =>
    new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : null;
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });

  const safeParseJson = (text: string) => {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      logger.warn('client_onboarding.json_parse_failed', error as Error);
      return {};
    }
  };

  const deriveFieldsFromFile = useCallback(
    async (file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Document too large',
          description: `${file.name} is larger than 2MB. Provide a summary or a smaller extract instead.`,
          variant: 'destructive',
        });
        return { draft: {}, preview: undefined };
      }
      const text = await readFileContent(file);
      if (!text) {
        return { draft: {}, preview: undefined };
      }
      const preview = text.slice(0, 400);
      if (/^\s*\{/.test(text)) {
        const jsonDraft = extractClientFieldsFromJson(safeParseJson(text));
        const textDraft = extractClientFieldsFromText(text);
        return { draft: mergeDraft(jsonDraft, textDraft).next, preview };
      }
      return { draft: extractClientFieldsFromText(text), preview };
    },
    [toast],
  );

  const updateDraft = useCallback(
    (updates: ClientDraft, source: 'text' | 'document') => {
      setDraft((prev) => {
        const { next, changed } = mergeDraft(prev, updates);
        if (!changed.length) {
          if (source === 'document') {
            pushAgentMessage('I reviewed the document but could not find new profile details. Let me know anything I should extract.');
          }
          return prev;
        }
        const fieldSummaries = changed.map((field) => `${FIELD_LABELS[field]} → ${next[field]}`).join('\n');
        pushAgentMessage(`Great, I captured the following details:\n${fieldSummaries}`);
        return next;
      });
    },
    [pushAgentMessage],
  );

  useEffect(() => {
    if (awaitingConfirmation) return;
    if (!missingFields.length && Object.keys(draft).length) {
      setAwaitingConfirmation(true);
      const summary = REQUIRED_FIELDS.map((field) => `${FIELD_LABELS[field]}: ${draft[field]}`).join('\n');
      pushAgentMessage(`Here is the client profile I have assembled:\n${summary}\nShould I create this client?`, { confirmation: true });
    } else if (messages.length) {
      const last = messages[messages.length - 1];
      if (last?.sender === 'agent' && last.meta?.confirmation) return;
      if (missingFields.length) {
        const prompt = missingFields.map((field) => FIELD_LABELS[field]).join(', ');
        pushAgentMessage(`I still need the following details: ${prompt}. Upload a document or tell me directly.`);
      }
    }
  }, [awaitingConfirmation, draft, messages, missingFields, pushAgentMessage]);

  const handleTextSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput('');
    pushUserMessage(message);
    setLoading(true);
    const updates = extractClientFieldsFromText(message);
    if (Object.values(updates).some(Boolean)) {
      updateDraft(updates, 'text');
    } else {
      pushAgentMessage('Thanks! I will log that. If there are structured details (name, industry, contact), spell them out and I will capture them.');
    }
    setLoading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const fileArray = Array.from(files).slice(0, 5);
    const uploads: UploadedFile[] = [];
    const aggregatedUpdates: ClientDraft = {};
    setLoading(true);

    for (const file of fileArray) {
      const { draft: derived, preview } = await deriveFieldsFromFile(file);
      const uploaded: UploadedFile = {
        id: friendlyId(),
        name: file.name,
        size: file.size,
        type: file.type || 'unknown',
        preview,
      };
      uploads.push(uploaded);
      const { next } = mergeDraft(aggregatedUpdates, derived);
      Object.assign(aggregatedUpdates, next);
      if (resolvedOrgId) {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        addDocument({
          id: friendlyId(),
          orgId: resolvedOrgId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          url,
          uploadedById: currentUser?.id ?? 'system',
          createdAt: new Date().toISOString(),
        });
      }
    }

    pushUserMessage(`Uploaded ${uploads.length} document${uploads.length > 1 ? 's' : ''}.`, uploads);
    if (Object.values(aggregatedUpdates).some(Boolean)) {
      updateDraft(aggregatedUpdates, 'document');
    } else {
      pushAgentMessage('Thanks for the documents. I could not read structured details yet—feel free to point me at the relevant sections or describe them.');
    }
    setPendingFiles((prev) => [...prev, ...uploads]);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createClient = () => {
    if (!resolvedOrgId) {
      pushAgentMessage('Please select an organisation before creating a client.');
      return;
    }
    if (missingFields.length) {
      pushAgentMessage('I still need more information before I can create the client.');
      return;
    }
    const client: Client = {
      id: friendlyId(),
      orgId: resolvedOrgId,
      name: draft.name ?? '',
      industry: draft.industry ?? '',
      country: draft.country ?? '',
      fiscalYearEnd: draft.fiscalYearEnd ?? '',
      contactName: draft.contactName ?? '',
      contactEmail: draft.contactEmail ?? '',
      createdAt: new Date().toISOString(),
    };
    setClients([...clients, client]);
    setCreatedClientId(client.id);
    setAwaitingConfirmation(false);
    setDraft({});
    setPendingFiles([]);
    pushAgentMessage(`All set! ${client.name} has been added to your client list. Let me know if you would like to onboard another organisation.`);
    onCreated?.(client);
  };

  const handleConfirmation = (decision: 'confirm' | 'revise') => {
    if (decision === 'confirm') {
      createClient();
    } else {
      setAwaitingConfirmation(false);
      pushAgentMessage('No problem. Tell me what needs to change or upload an updated document.');
    }
  };

  const highlight = useMemo(() => {
    if (!missingFields.length || awaitingConfirmation) return undefined;
    return missingFields.map((field) => FIELD_LABELS[field]).join(', ');
  }, [awaitingConfirmation, missingFields]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  return (
    <Card className="glass h-full overflow-hidden border border-white/10">
      <div className="flex h-[calc(100vh-16rem)] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn('flex max-w-3xl', message.sender === 'agent' ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 shadow-lg backdrop-blur transition-colors',
                    message.sender === 'agent'
                      ? 'bg-gradient-to-br from-primary/15 to-secondary/15 text-primary-foreground'
                      : 'bg-gradient-to-br from-secondary/90 to-primary/80 text-white',
                  )}
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                    {message.sender === 'agent' ? <Sparkles className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {message.sender === 'agent' ? 'Glow Agent' : 'You'}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((file) => (
                        <div key={file.id} className="rounded-xl bg-white/10 px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3" />
                            <span className="font-semibold">{file.name}</span>
                            <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                          </div>
                          {file.preview && (
                            <p className="mt-1 line-clamp-3 text-muted-foreground">{file.preview}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysing the latest information…
            </div>
          )}
          {createdClientId && (
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Client onboarding complete. You can start another whenever you're ready.
            </div>
          )}
        </div>
        <div className="border-t border-white/10 bg-background/60 p-4 backdrop-blur">
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <div className="flex items-end gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => void handleFiles(event.target.files)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload supporting documents"
                >
                  <UploadCloud className="h-5 w-5" />
                </Button>
              </div>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={highlight ? `Tell me about ${highlight}` : 'Describe the client or paste key facts…'}
                className="min-h-[80px] flex-1 resize-none bg-background/80"
              />
              <Button type="submit" variant="gradient" disabled={!input.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
            {awaitingConfirmation && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                <span>Ready to create this client?</span>
                <div className="flex gap-2">
                  <Button type="button" variant="gradient" onClick={() => handleConfirmation('confirm')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create client
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleConfirmation('revise')}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Revise details
                  </Button>
                </div>
              </div>
            )}
          </form>
          {pendingFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingFiles.map((file) => (
                <Badge key={file.id} variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {file.name}
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((item) => item.id !== file.id))}
                    className="ml-1 rounded-full bg-white/20 p-0.5 hover:bg-white/40"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

const logger: Pick<Console, 'warn'> = typeof console !== 'undefined' ? console : { warn: () => undefined };
