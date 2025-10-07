import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Layers3, Loader2, PlusCircle, UserMinus } from 'lucide-react';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import {
  addTeamMember,
  createTeam,
  fetchIamDirectory,
  removeTeamMember,
  type IamDirectory,
  type IamMember,
  type IamTeam,
} from '@/lib/iam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TEAM_ROLE_OPTIONS = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function AdminTeamsPage() {
  const { currentOrg, currentOrgId, loading: orgLoading, hasRole } = useOrganizations();
  const { toast } = useToast();
  const [directory, setDirectory] = useState<IamDirectory | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [pendingTeam, setPendingTeam] = useState<string | null>(null);
  const [selectedMemberForTeam, setSelectedMemberForTeam] = useState<Record<string, string>>({});
  const [selectedRoleForTeam, setSelectedRoleForTeam] = useState<Record<string, string>>({});

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
        title: 'Unable to load teams',
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

  const membersById = useMemo(() => {
    const map = new Map<string, IamMember>();
    directory?.members.forEach((member) => {
      map.set(member.user_id, member);
    });
    return map;
  }, [directory]);

  const handleCreateTeam = async () => {
    if (!currentOrgId || newTeamName.trim().length < 2) {
      toast({ title: 'Team name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    setCreatingTeam(true);
    try {
      await createTeam({ orgId: currentOrgId, name: newTeamName.trim(), description: newTeamDescription.trim() || undefined });
      setNewTeamName('');
      setNewTeamDescription('');
      toast({ title: 'Team created' });
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Failed to create team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleAddMember = async (team: IamTeam) => {
    if (!currentOrgId) return;
    const userId = selectedMemberForTeam[team.id];
    const role = selectedRoleForTeam[team.id] ?? 'MEMBER';
    if (!userId) {
      toast({ title: 'Select a member to add', variant: 'destructive' });
      return;
    }
    setPendingTeam(team.id);
    try {
      await addTeamMember({ orgId: currentOrgId, teamId: team.id, userId, role });
      toast({ title: 'Member added to team' });
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Failed to add member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPendingTeam(null);
    }
  };

  const handleRemoveMember = async (team: IamTeam, userId: string) => {
    if (!currentOrgId) return;
    setPendingTeam(team.id);
    try {
      await removeTeamMember({ orgId: currentOrgId, teamId: team.id, userId });
      toast({ title: 'Member removed from team' });
      await loadDirectory();
    } catch (error) {
      toast({
        title: 'Failed to remove member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPendingTeam(null);
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentOrg || !currentOrgId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Select an organization to manage its teams.</CardDescription>
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
            <CardDescription>You need Manager or above privileges to manage teams.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const teams = directory?.teams ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Layers3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Teams</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Organize members into functional teams and manage assignments for <span className="font-medium">{currentOrg.name}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create team</CardTitle>
          <CardDescription>Define team groupings for tasks, workflows, and reporting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[2fr,3fr,auto]">
            <Input
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="Team name"
            />
            <Input
              value={newTeamDescription}
              onChange={(event) => setNewTeamDescription(event.target.value)}
              placeholder="Description (optional)"
            />
            <Button onClick={handleCreateTeam} disabled={creatingTeam}>
              {creatingTeam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}Create team
            </Button>
          </div>
        </CardContent>
      </Card>

      {teams.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No teams yet</CardTitle>
            <CardDescription>Create your first team to start grouping members.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => {
            const members = team.team_members ?? [];
            return (
              <Card key={team.id} className="flex flex-col">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center justify-between">
                    <span>{team.name}</span>
                    <Badge variant="secondary">{members.length} member{members.length === 1 ? '' : 's'}</Badge>
                  </CardTitle>
                  {team.description ? <CardDescription>{team.description}</CardDescription> : null}
                  {team.created_at ? (
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(team.created_at), { addSuffix: true })}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Members</p>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((membership) => {
                          const member = membersById.get(membership.user_id);
                          const displayName = member?.user_profile?.display_name ?? membership.user_id;
                          return (
                            <div key={membership.user_id} className="flex items-center justify-between rounded-md border border-border p-2">
                              <div>
                                <div className="text-sm font-medium">{displayName}</div>
                                <div className="text-xs text-muted-foreground">{membership.role.toLowerCase()}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(team, membership.user_id)}
                                disabled={pendingTeam === team.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="mr-2 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-dashed border-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Add member</p>
                    <div className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
                      <Select
                        value={selectedMemberForTeam[team.id] ?? ''}
                        onValueChange={(value) => setSelectedMemberForTeam((prev) => ({ ...prev, [team.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {(directory?.members ?? []).map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              {member.user_profile?.display_name ?? member.user_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedRoleForTeam[team.id] ?? 'MEMBER'}
                        onValueChange={(value) => setSelectedRoleForTeam((prev) => ({ ...prev, [team.id]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleAddMember(team)}
                        disabled={pendingTeam === team.id}
                      >
                        {pendingTeam === team.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminTeamsPage;
