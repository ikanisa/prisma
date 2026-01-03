'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
    Users, UserPlus, Mail, Shield, ShieldCheck,
    MoreHorizontal, Search, RefreshCw, AlertCircle,
    Check, X, Clock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserRole = 'SYSTEM_ADMIN' | 'STAFF';
type UserStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    status: UserStatus;
    invited_at: string | null;
    activated_at: string | null;
    last_login_at: string | null;
}

interface Invitation {
    id: string;
    email: string;
    role: UserRole;
    status: string;
    expires_at: string;
    created_at: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('STAFF');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch users and invitations
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch users
            const { data: usersData, error: usersError } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;
            setUsers(usersData || []);

            // Fetch pending invitations
            const { data: inviteData, error: inviteError } = await supabase
                .from('user_invitations')
                .select('*')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });

            if (inviteError) throw inviteError;
            setInvitations(inviteData || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail) return;

        setIsInviting(true);
        setError(null);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // Create invitation
            const { error: inviteError } = await supabase
                .from('user_invitations')
                .insert({
                    email: inviteEmail.toLowerCase(),
                    role: inviteRole,
                    invited_by: user?.id,
                    invitation_token: crypto.randomUUID(),
                });

            if (inviteError) throw inviteError;

            // Send invitation email via Supabase Auth
            const { error: authError } = await supabase.auth.admin.inviteUserByEmail(
                inviteEmail.toLowerCase()
            );

            // Note: If admin.inviteUserByEmail fails, the user can still use magic link
            if (authError) {
                console.warn('Admin invite failed, using fallback:', authError.message);
            }

            setInviteSuccess(true);
            setInviteEmail('');
            setInviteRole('STAFF');
            await fetchData();

            setTimeout(() => {
                setInviteSuccess(false);
                setInviteDialogOpen(false);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to invite user');
        } finally {
            setIsInviting(false);
        }
    };

    const handleChangeRole = async (userId: string, newRole: UserRole) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change role');
        }
    };

    const handleSuspendUser = async (userId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'SUSPENDED',
                    suspended_at: new Date().toISOString(),
                    suspended_by: user?.id,
                })
                .eq('id', userId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to suspend user');
        }
    };

    const handleActivateUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'ACTIVE',
                    suspended_at: null,
                    suspended_by: null,
                    suspended_reason: null,
                })
                .eq('id', userId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to activate user');
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            const { error } = await supabase
                .from('user_invitations')
                .update({ status: 'REVOKED' })
                .eq('id', invitationId);

            if (error) throw error;
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: UserStatus) => {
        const styles = {
            ACTIVE: 'bg-green-100 text-green-700',
            INVITED: 'bg-blue-100 text-blue-700',
            SUSPENDED: 'bg-red-100 text-red-700',
            DEACTIVATED: 'bg-gray-100 text-gray-700',
        };
        return (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const getRoleBadge = (role: UserRole) => {
        const isAdmin = role === 'SYSTEM_ADMIN';
        return (
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                {role.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage staff accounts and permissions</p>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New User</DialogTitle>
                            <DialogDescription>
                                Send an invitation to join the team. They'll receive an email with setup instructions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="colleague@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Role</Label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STAFF">Staff</SelectItem>
                                        <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleInviteUser} disabled={isInviting || !inviteEmail}>
                                {isInviting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : inviteSuccess ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Invited!
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Invitation
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Check className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.status === 'ACTIVE').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{invitations.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Admins</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.role === 'SYSTEM_ADMIN').length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Refresh */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={fetchData} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending Invitations</CardTitle>
                        <CardDescription>Invitations waiting to be accepted</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {invitations.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{invite.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Expires {new Date(invite.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getRoleBadge(invite.role)}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRevokeInvitation(invite.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>All users with access to the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No users found
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <span className="text-sm font-medium text-primary">
                                                {user.email.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{user.full_name || user.email}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getRoleBadge(user.role)}
                                        {getStatusBadge(user.status)}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleChangeRole(
                                                    user.id,
                                                    user.role === 'SYSTEM_ADMIN' ? 'STAFF' : 'SYSTEM_ADMIN'
                                                )}>
                                                    {user.role === 'SYSTEM_ADMIN' ? 'Demote to Staff' : 'Promote to Admin'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {user.status === 'SUSPENDED' ? (
                                                    <DropdownMenuItem onClick={() => handleActivateUser(user.id)}>
                                                        Activate User
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleSuspendUser(user.id)}
                                                        className="text-destructive"
                                                    >
                                                        Suspend User
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
