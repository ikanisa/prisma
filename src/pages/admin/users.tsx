import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserPlus, Users, Loader2, Mail, SendHorizonal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useOrganizations, type OrgRole } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import {
  fetchIamDirectory,
  inviteMember,
  revokeInvite,
  updateMemberRole,
  type IamDirectory,
  type IamInvite,
  type IamMember,
} from '@/lib/iam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string; description: string }> = [
  { value: 'CLIENT', label: 'Client', description: 'Portal-only access (PBC uploads & assigned requests).' },
  { value: 'READONLY', label: 'Read-only', description: 'View engagement data without modifications.' },
  { value: 'EMPLOYEE', label: 'Employee', description: 'Standard internal contributor permissions.' },
  { value: 'MANAGER', label: 'Manager', description: 'Manage users, approvals, and sensitive workflows.' },
  { value: 'PARTNER', label: 'Partner', description: 'Engagement leader with approval authority.' },
  { value: 'SYSTEM_ADMIN', label: 'System Admin', description: 'Global administrator (requires elevated approval).' },
];

const ROLE_BADGE_VARIANTS: Record<OrgRole, string> = {
  SERVICE_ACCOUNT: 'bg-slate-200 text-slate-900',
  READONLY: 'bg-gray-200 text-gray-900',
  CLIENT: 'bg-amber-200 text-amber-900',
  EMPLOYEE: 'bg-blue-200 text-blue-900',
  MANAGER: 'bg-purple-200 text-purple-900',
  EQR: 'bg-indigo-200 text-indigo-900',
  PARTNER: 'bg-emerald-200 text-emerald-900',
  SYSTEM_ADMIN: 'bg-rose-200 text-rose-900',
};

const mapRoleLabel = (role: OrgRole) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

export function AdminUsersPage() {
  const { currentOrg, currentOrgId, loading: orgLoading, hasRole } = useOrganizations();
  const { toast } = useToast();
  const [directory, setDirectory] = useState<IamDirectory | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<OrgRole>('EMPLOYEE');
  const [inviteContact, setInviteContact] = useState('');
  const [pendingRoleUser, setPendingRoleUser] = useState<string | null>(null);

  const canManage = hasRole('MANAGER') || hasRole('PARTNER') || hasRole('SYSTEM_ADMIN');

  const loadDirectory = useCallback(async () => {
    if (!currentOrgId) {
      setDirectory(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchIamDirectory(currentOrgId);
      setDirectory(data);
    } catch (error) {
      toast({
        title: 'Unable to load IAM directory',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, toast]);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const handleInvite = async () => {
    if (!currentOrgId) return;
    if (inviteContact.trim().length < 3) {
      toast({ title: 'Enter a valid email or phone number', variant: 'destructive' });
      return;
    }
    setInviteLoading(true);
    const trimmedContact = inviteContact.trim();
    try {
      const result = await inviteMember({ orgId: currentOrgId, emailOrPhone: trimmedContact, role: inviteRole });
      const isEmail = trimmedContact.includes('@');
      toast({
        title: 'Invite sent',
        description: isEmail
          ? `An email invitation was sent to ${trimmedContact}. Backup token: ${result.token}`
          : `Share this token securely with the invitee: ${result.token}`,
      });
      setInviteContact('');
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Failed to send invite',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (member: IamMember, role: OrgRole) => {
    if (!currentOrgId || member.role === role) return;
    setPendingRoleUser(member.user_id);
    try {
      await updateMemberRole(currentOrgId, member.user_id, role);
      toast({ title: 'Role updated' });
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Failed to update role',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPendingRoleUser(null);
    }
  };

  const handleRevokeInvite = async (invite: IamInvite) => {
    if (!currentOrgId) return;
    try {
      await revokeInvite(currentOrgId, invite.id);
      toast({ title: 'Invite revoked' });
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Unable to revoke invite',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const sortedMembers = useMemo(() => {
    if (!directory) return [];
    return [...directory.members].sort((a, b) => {
      const rankA = ROLE_OPTIONS.findIndex((option) => option.value === a.role);
      const rankB = ROLE_OPTIONS.findIndex((option) => option.value === b.role);
      return rankA - rankB;
    });
  }, [directory]);

  if (orgLoading || loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentOrg || !currentOrgId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Administration</CardTitle>
            <CardDescription>Select an organization to manage users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>You need Manager or above privileges to manage users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">User Administration</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage memberships, invites, and roles for <span className="font-medium">{currentOrg.name}</span>.
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Members</CardTitle>
                <CardDescription>Update roles and review organization membership.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadDirectory()}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members found for this organization.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-2">User</th>
                        <th className="pb-2">Email</th>
                        <th className="pb-2">Role</th>
                        <th className="pb-2">Joined</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedMembers.map((member) => {
                        const profile = member.user_profile;
                        const displayName = profile?.display_name ?? member.user_id;
                        const email = profile?.email ?? '—';
                        return (
                          <tr key={member.id} className="align-top">
                            <td className="py-3">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-xs text-muted-foreground">{member.user_id}</div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" /> {email}
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge className={ROLE_BADGE_VARIANTS[member.role] ?? 'bg-slate-200 text-slate-900'}>
                                {mapRoleLabel(member.role)}
                              </Badge>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {member.created_at ? formatDistanceToNow(new Date(member.created_at), { addSuffix: true }) : '—'}
                            </td>
                            <td className="py-3 text-right">
                              <Select
                                value={member.role}
                                onValueChange={(value) => handleRoleChange(member, value as OrgRole)}
                                disabled={pendingRoleUser === member.user_id}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{option.label}</span>
                                        <span className="text-xs text-muted-foreground">{option.description}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {pendingRoleUser === member.user_id ? (
                                <span className="ml-2 inline-flex items-center text-xs text-muted-foreground"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Updating…</span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Invite Member
              </CardTitle>
              <CardDescription>Send a role-scoped invite via email or WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
                <Input
                  value={inviteContact}
                  onChange={(event) => setInviteContact(event.target.value)}
                  placeholder="Email or WhatsApp (E.164)"
                />
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as OrgRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={inviteContact.trim().length < 3 || inviteLoading}>
                  {inviteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}Send invite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tokens are generated server-side and expire after 14 days.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
              <CardDescription>Manage outstanding invites and revoke when necessary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {directory?.invites.filter((invite) => invite.status === 'PENDING').length ? (
                <div className="space-y-2">
                  {(directory?.invites ?? [])
                    .filter((invite) => invite.status === 'PENDING')
                    .map((invite) => (
                      <div key={invite.id} className="flex flex-wrap items-center justify-between rounded-md border border-border p-3">
                        <div className="space-y-1">
                          <div className="font-medium">{invite.email_or_phone}</div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge className={ROLE_BADGE_VARIANTS[invite.role] ?? 'bg-slate-200 text-slate-900'}>{mapRoleLabel(invite.role)}</Badge>
                            <span>Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Revoke
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending invites.</p>
              )}
              {directory && directory.invites.filter((invite) => invite.status !== 'PENDING').length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-semibold">Recently processed</p>
                    {directory.invites
                      .filter((invite) => invite.status !== 'PENDING')
                      .slice(0, 5)
                      .map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between">
                          <span>
                            {invite.email_or_phone} — {invite.status.toLowerCase()}
                          </span>
                          <span>{formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminUsersPage;
