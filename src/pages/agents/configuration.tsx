import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAgentProfiles, useUpsertAgentProfile, useDeleteAgentProfile, type AgentProfile } from '@/hooks/use-agent-profiles';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';

interface DraftProfile {
  id?: string;
  kind: 'AUDIT' | 'FINANCE' | 'TAX';
  certifications: string;
  jurisdictions: string;
  readingLists: string;
  style: string;
}

const EMPTY_DRAFT: DraftProfile = {
  kind: 'AUDIT',
  certifications: 'ACCA, CPA',
  jurisdictions: 'MT, EU',
  readingLists: 'MFSA reporting manual | https://www.mfsa.mt/regulatory/publications/; IFRS 15 summary | https://www.ifrs.org/',
  style: '{\n  "tone": "warm professional",\n  "references": "cite IFRS articles",\n  "escalation": "loop manager when confidence < 0.7"\n}',
};

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseReadingLists(value: string): Array<{ title: string; url: string }> {
  return value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [title, url] = entry.split('|').map((part) => part.trim());
      return { title: title ?? 'Reference', url: url ?? '' };
    });
}

export default function AgentConfigurationPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const profilesQuery = useAgentProfiles();
  const upsertProfile = useUpsertAgentProfile();
  const deleteProfile = useDeleteAgentProfile();
  const [draft, setDraft] = useState<DraftProfile>(EMPTY_DRAFT);
  const [activeTab, setActiveTab] = useState('profiles');

  const orgName = currentOrg?.name ?? 'your organisation';

  const editingProfile = useMemo<AgentProfile | null>(() => {
    if (!draft.id) return null;
    return (profilesQuery.data ?? []).find((profile) => profile.id === draft.id) ?? null;
  }, [draft.id, profilesQuery.data]);

  const resetDraft = () => setDraft(EMPTY_DRAFT);

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Agent configuration</h1>
        <p className="mt-2 text-muted-foreground">Join or select an organisation to manage agent personas.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    try {
      const styleJson = draft.style ? JSON.parse(draft.style) : {};
      upsertProfile.mutate(
        {
          id: draft.id,
          kind: draft.kind,
          certifications: parseList(draft.certifications),
          jurisdictions: parseList(draft.jurisdictions),
          readingLists: parseReadingLists(draft.readingLists),
          style: styleJson,
        },
        {
          onSuccess: () => {
            toast({ title: 'Persona saved', description: 'Updates will apply to future agent interactions.' });
            resetDraft();
            setActiveTab('profiles');
          },
        },
      );
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Update the style block with valid JSON before saving.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (profile: AgentProfile) => {
    setDraft({
      id: profile.id,
      kind: profile.kind,
      certifications: (profile.certifications ?? []).join(', '),
      jurisdictions: (profile.jurisdictions ?? []).join(', '),
      readingLists: (profile.reading_lists ?? [])
        .map((entry) => `${entry.title} | ${entry.url}`)
        .join('; '),
      style: JSON.stringify(profile.style ?? {}, null, 2),
    });
    setActiveTab('create');
  };

  const handleDelete = (profile: AgentProfile) => {
    deleteProfile.mutate(profile.id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Agent configuration</h1>
          <p className="text-muted-foreground">
            Calibrate knowledge partners for {orgName}. Guardrails, certifications, tone, and escalation paths ensure
            responses stay compliant.
          </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profiles">Personas</TabsTrigger>
          <TabsTrigger value="create">Create / edit</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona directory</CardTitle>
              <CardDescription>Active profiles inform the assistant’s tone, references, and guardrails.</CardDescription>
            </CardHeader>
            <CardContent>
              {profilesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading profiles…
                </div>
              ) : (profilesQuery.data ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No profiles yet. Use the “Create / edit” tab to add the first persona.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Certifications</TableHead>
                      <TableHead>Jurisdictions</TableHead>
                      <TableHead>Reading list</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(profilesQuery.data ?? []).map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">{profile.kind}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 text-xs">
                            {(profile.certifications ?? []).map((cert) => (
                              <Badge key={cert} variant="outline">{cert}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 text-xs">
                            {(profile.jurisdictions ?? []).map((code) => (
                              <Badge key={code} variant="secondary">{code}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(profile.reading_lists ?? []).slice(0, 3).map((entry) => (
                            <div key={entry.url} className="truncate">
                              {entry.title}
                            </div>
                          ))}
                          {(profile.reading_lists ?? []).length > 3 ? '…' : null}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(profile)}>
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(profile)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{editingProfile ? 'Edit persona' : 'Create persona'}</CardTitle>
              <CardDescription>
                Define certifications, jurisdictions, canonical reading material, and conversational style. All fields
                accept comma- or semicolon-separated input for quick capture.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kind">Persona type</Label>
                <select
                  id="kind"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={draft.kind}
                  onChange={(event) => setDraft((prev) => ({ ...prev, kind: event.target.value as DraftProfile['kind'] }))}
                >
                  <option value="AUDIT">Audit partner</option>
                  <option value="FINANCE">Accounting & finance partner</option>
                  <option value="TAX">Tax partner</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  value={draft.certifications}
                  onChange={(event) => setDraft((prev) => ({ ...prev, certifications: event.target.value }))}
                  placeholder="ACCA, CPA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdictions">Jurisdictions</Label>
                <Input
                  id="jurisdictions"
                  value={draft.jurisdictions}
                  onChange={(event) => setDraft((prev) => ({ ...prev, jurisdictions: event.target.value }))}
                  placeholder="MT, EU"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reading-lists">Reading list (title | url)</Label>
                <Textarea
                  id="reading-lists"
                  value={draft.readingLists}
                  onChange={(event) => setDraft((prev) => ({ ...prev, readingLists: event.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Separate entries with semicolons. Example:<br />
                  <code>MFSA reporting manual | https://www.mfsa.mt/regulatory/publications/; IFRS 16 summary | https://www.ifrs.org/</code>
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="style">Tone & guardrails (JSON)</Label>
                <Textarea
                  id="style"
                  value={draft.style}
                  onChange={(event) => setDraft((prev) => ({ ...prev, style: event.target.value }))}
                  rows={6}
                />
              </div>
              <div className="md:col-span-2 flex justify-between">
                <Button type="button" variant="ghost" onClick={resetDraft}>
                  Reset
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={upsertProfile.isPending}>
                  {upsertProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save persona
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
