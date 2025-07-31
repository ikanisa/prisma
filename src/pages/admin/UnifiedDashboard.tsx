import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedListings, useUnifiedOrders, useConversations } from '@/hooks/useUnifiedData';
import { Badge } from '@/components/ui/badge';
import { AdminTable, AdminTableColumn, AdminTableAction } from '@/components/admin/AdminTable';
import { Eye, MessageSquare, Package, ShoppingCart, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnifiedDashboard() {
  const navigate = useNavigate();
  
  // Fetch unified data
  const { data: listings = [], isLoading: listingsLoading } = useUnifiedListings();
  const { data: orders = [], isLoading: ordersLoading } = useUnifiedOrders();
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();

  // Calculate metrics
  const metrics = {
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === 'active').length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalConversations: conversations.length,
    activeConversations: conversations.length, // Remove status filter for now
  };

  // Recent listings columns
  const listingsColumns: AdminTableColumn[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (item) => (
        <div className="font-medium">{item.title}</div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (item) => (
        <Badge variant="outline">{item.type}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cell: (item) => item.price ? `RWF ${item.price.toLocaleString()}` : '-',
    },
  ];

  // Recent orders columns
  const ordersColumns: AdminTableColumn[] = [
    {
      key: 'id',
      header: 'Order ID',
      cell: (item) => (
        <div className="font-mono text-sm">{item.id.slice(0, 8)}...</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Total',
      cell: (item) => `RWF ${item.price?.toLocaleString() || 0}`,
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (item) => new Date(item.created_at).toLocaleDateString(),
    },
  ];

  // Actions
  const listingsActions: AdminTableAction[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (item) => navigate(`/admin/unified-listings/${item.id}`),
    },
  ];

  const ordersActions: AdminTableAction[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (item) => navigate(`/admin/unified-orders/${item.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Unified view of your easyMO admin operations
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeListings} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeConversations} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminTable
              data={listings.slice(0, 5)}
              columns={listingsColumns}
              actions={listingsActions}
              isLoading={listingsLoading}
              emptyMessage="No listings found"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminTable
              data={orders.slice(0, 5)}
              columns={ordersColumns}
              actions={ordersActions}
              isLoading={ordersLoading}
              emptyMessage="No orders found"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}