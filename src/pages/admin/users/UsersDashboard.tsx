import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useSecureQuery } from '@/hooks/useSecureQuery';
import { Users, UserPlus, Shield, Activity } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface User {
  id: string;
  phone: string;
  credits: number;
  role_tags: string[];
  referral_code: string;
  created_at: string;
  last_active: string;
}

interface UserStats {
  total_users: number;
  active_today: number;
  total_credits: number;
  avg_credits_per_user: number;
}

export default function UsersDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: users } = useSecureQuery<User>({
    table: 'users',
    queryKey: ['users'],
    requireAdmin: true
  });

  const { data: userStats } = useSecureQuery<UserStats>({
    table: 'user_stats',
    queryKey: ['user_stats'],
    requireAdmin: true
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'credits',
      header: 'Credits',
      cell: ({ row }) => {
        const credits = Number(row.getValue('credits')) || 0;
        return (
          <Badge variant={credits > 0 ? 'default' : 'secondary'}>
            {credits}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'role_tags',
      header: 'Roles',
      cell: ({ row }) => {
        const roles = row.getValue('role_tags') as string[];
        return (
          <div className="flex gap-1">
            {roles?.map((role) => (
              <Badge key={role} variant="outline">{role}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'referral_code',
      header: 'Referral Code',
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
    },
  ];

  const filteredUsers = users?.data?.filter(user =>
    user.phone.includes(searchTerm)
  ) || [];

  const stats = [
    {
      title: "Total Users",
      value: userStats?.data?.[0]?.total_users?.toString() || "0",
      icon: Users,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Active Today",
      value: userStats?.data?.[0]?.active_today?.toString() || "0",
      icon: Activity,
      change: "+5%",
      changeType: "positive" as const
    },
    {
      title: "Total Credits",
      value: userStats?.data?.[0]?.total_credits?.toString() || "0",
      icon: Shield,
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Avg Credits/User",
      value: userStats?.data?.[0]?.avg_credits_per_user?.toString() || "0",
      icon: UserPlus,
      change: "-2%",
      changeType: "negative" as const
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users & Contacts</h1>
          <p className="text-muted-foreground">Manage user accounts, credits, and roles</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Users</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <DataTable
            title="All Users"
            columns={columns}
            data={filteredUsers}
            searchPlaceholder="Search users..."
          />
        </TabsContent>

        <TabsContent value="active">
          <DataTable
            title="Active Users"
            columns={columns}
            data={filteredUsers.filter(user => {
              const lastActive = new Date(user.last_active);
              const today = new Date();
              return (today.getTime() - lastActive.getTime()) < 24 * 60 * 60 * 1000;
            })}
            searchPlaceholder="Search active users..."
          />
        </TabsContent>

        <TabsContent value="inactive">
          <DataTable
            title="Inactive Users"
            columns={columns}
            data={filteredUsers.filter(user => {
              const lastActive = new Date(user.last_active);
              const today = new Date();
              return (today.getTime() - lastActive.getTime()) >= 24 * 60 * 60 * 1000;
            })}
            searchPlaceholder="Search inactive users..."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}