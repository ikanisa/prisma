import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/use-organizations';
import { fetchOrgSettings, updateOrgSettings, fetchAuditLog, listImpersonationGrants, requestImpersonation, approveImpersonation, revokeImpersonation, type AdminOrgSettings, type ImpersonationGrant } from '@/lib/admin';
import { AdminUsersPage } from './users';
import { AdminTeamsPage } from './teams';
import { Loader2, Shield, Users, ListChecks, Inbox, Clock3 } from 'lucide-react';

const MODULE_LABELS: Record<string, string> = {
  IAM: 'Identity & Access',
  ACCOUNTING_CLOSE: 'Accounting Close',
};

function SettingsPanel({ settings, onSave, saving }: { settings: AdminOrgSettings; onSave: (settings: AdminOrgSettings) => void; saving: boolean }) {
  const [form, setForm] = useState<AdminOrgSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const updateField = (key: keyof AdminOrgSettings) => (value: string) => {
    if (key === 'allowedEmailDomains' || key === 'impersonationBreakglassEmails') {
      setForm((prev) => ({
        ...prev,
        [key]: value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      }));
    } else if (key === 'defaultRole') {
      setForm((prev) => ({ ...prev, defaultRole: value as AdminOrgSettings['defaultRole'] }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Organization security settings
        </CardTitle>
        <CardDescription>Configure email domain restrictions, default roles, and MFA requirements.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Allowed email domains</label>
          <Input
            value={form.allowedEmailDomains.join(', ')}
            onChange={(event) => updateField('allowedEmailDomains')(event.target.value)}
            placeholder="example.com, client.co"
          />
          <p className="text-xs text-muted-foreground">Only users with these email domains can be invited. Leave blank to allow all domains.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Default role for new members</label>
          <Input
            value={form.defaultRole}
            onChange={(event) => updateField('defaultRole')(event.target.value.toUpperCase())}
            placeholder="EMPLOYEE"
          />
          <p className="text-xs text-muted-foreground">System administrators can override the default role when provisioning new members.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Break-glass notification emails</label>
          <Input
            value={form.impersonationBreakglassEmails.join(', ')}
            onChange={(event) => updateField('impersonationBreakglassEmails')(event.target.value)}
            placeholder="security@example.com, partner@firm.com"
          />
          <p className="text-xs text-muted-foreground">When impersonation is enabled, send an alert to these recipients.</p>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <div className="text-sm font-medium">Require WhatsApp MFA for sensitive actions</div>
            <p className="text-xs text-muted-foreground">Applies to close locks and other privileged workflows.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSave({ ...form, requireMfaForSensitive: !form.requireMfaForSensitive })}
            disabled={saving}
          >
            {form.requireMfaForSensitive ? 'Disable' : 'Enable'}
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setForm(settings)} disabled={saving}>
            Reset
          </Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogPanel({ entries, loading, onLoadMore }: { entries: any[]; loading: boolean; onLoadMore: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Activity log</CardTitle>
        <CardDescription>Review recent administrative actions recorded for this organisation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[360px] overflow-y-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No activity recorded.
                  </TableCell>
                </TableRow>
              ) : null}
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-medium">{entry.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{MODULE_LABELS[entry.module ?? ''] ?? entry.module ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.user_id ?? 'system'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ImpersonationPanel({ orgId }: { orgId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const grantsQuery = useQuery({
    queryKey: ['admin', 'impersonation', orgId],
    queryFn: () => listImpersonationGrants(orgId),
  });

  const requestMutation = useMutation({
    mutationFn: () => requestImpersonation({ orgId, targetUserId, reason: reason || undefined, expiresAt: expiresAt || undefined }),
    onSuccess: async () => {
      toast({ title: 'Impersonation requested', description: 'Await approval from a second administrator.' });
      setTargetUserId('');
      setReason('');
      setExpiresAt('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'impersonation', orgId] });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to request impersonation', description: error?.message ?? 'Unexpected error', variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (grantId: string) => approveImpersonation({ orgId, grantId }),
    onSuccess: async () => {
      toast({ title: 'Impersonation approved' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'impersonation', orgId] });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to approve impersonation', description: error?.message ?? 'Unexpected error', variant: 'destructive' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (grantId: string) => revokeImpersonation({ orgId, grantId }),
    onSuccess: async () => {
      toast({ title: 'Impersonation revoked' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'impersonation', orgId] });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to revoke impersonation', description: error?.message ?? 'Unexpected error', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Request impersonation</CardTitle>
          <CardDescription>Use sparingly. A second administrator must approve before the session is active.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Target user id" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} />
          <Input placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          <Input placeholder="Expires at (ISO 8601)" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          <div className="flex justify-end">
            <Button onClick={() => requestMutation.mutate()} disabled={!targetUserId || requestMutation.isPending}>
              {requestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open impersonation grants</CardTitle>
          <CardDescription>Pending approvals or active sessions for this organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[280px] overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Target user</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grantsQuery.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No impersonation grants recorded.
                    </TableCell>
                  </TableRow>
                ) : null}
                {(grantsQuery.data ?? []).map((grant: ImpersonationGrant) => {
                  const active = Boolean(grant.active && (!grant.expires_at || new Date(grant.expires_at) > new Date()));
                  return (
                    <TableRow key={grant.id}>
                      <TableCell>
                        <Badge variant={active ? 'secondary' : 'outline'}>{active ? 'Active' : 'Pending'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{grant.target_user_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{grant.granted_by_user_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{grant.expires_at ? new Date(grant.expires_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {!active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(grant.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeMutation.mutate(grant.id)}
                          disabled={revokeMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminConsole() {
  const { currentOrg, currentRole } = useOrganizations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [auditCursor, setAuditCursor] = useState<string | undefined>();
  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings', currentOrg?.id],
    queryFn: () => fetchOrgSettings(currentOrg!.id),
    enabled: Boolean(currentOrg?.id),
  });

  const mutation = useMutation({
    mutationFn: (next: AdminOrgSettings) => updateOrgSettings(currentOrg!.id, next),
    onSuccess: async (next) => {
      toast({ title: 'Settings updated' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', currentOrg?.id] });
      settingsQuery.refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Unable to update settings', description: error?.message ?? 'Unexpected error', variant: 'destructive' });
    },
  });

  const auditLogQuery = useQuery({
    queryKey: ['admin', 'auditlog', currentOrg?.id, auditCursor],
    queryFn: () => fetchAuditLog(currentOrg!.id, { limit: 50, after: auditCursor }),
    enabled: Boolean(currentOrg?.id),
    placeholderData: (previousData) => previousData ?? [],
  });

  useEffect(() => {
    setAuditCursor(undefined);
  }, [currentOrg?.id]);

  if (!currentOrg || currentRole !== 'MANAGER' && currentRole !== 'PARTNER' && currentRole !== 'SYSTEM_ADMIN') {
    return (
      <main className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Admin console</h1>
        <p className="text-muted-foreground">Select an organisation where you have manager permissions.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Admin console</h1>
        <p className="text-sm text-muted-foreground">Control organisation settings, teams, and impersonation workflows.</p>
      </header>

      <Tabs defaultValue="settings">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="audit-log">Audit log</TabsTrigger>
          <TabsTrigger value="impersonation">Impersonation</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 space-y-4">
          {settingsQuery.isPending || !settingsQuery.data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <SettingsPanel settings={settingsQuery.data} onSave={(next) => mutation.mutate(next)} saving={mutation.isPending} />
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <AdminUsersPage />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <AdminTeamsPage />
        </TabsContent>

        <TabsContent value="audit-log" className="mt-4">
          <AuditLogPanel
            entries={auditLogQuery.data ?? []}
            loading={auditLogQuery.isFetching}
            onLoadMore={() => {
              const last = (auditLogQuery.data ?? []).slice(-1)[0];
              if (last) setAuditCursor(last.created_at);
            }}
          />
        </TabsContent>

        <TabsContent value="impersonation" className="mt-4">
          <ImpersonationPanel orgId={currentOrg.id} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
