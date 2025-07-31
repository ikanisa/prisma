import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUnifiedListings, usePayments } from "@/hooks/useUnifiedListings";
import { useUnifiedOrders } from "@/hooks/useUnifiedOrders";
import { Package, ShoppingCart, CreditCard, TrendingUp, DollarSign, Users } from "lucide-react";

export default function CommerceDashboard() {
  const { data: listings, isLoading: loadingListings } = useUnifiedListings('product');
  const { data: orders, isLoading: loadingOrders } = useUnifiedOrders();
  const { data: payments, isLoading: loadingPayments } = usePayments();

  const statsCards = [
    {
      title: "Active Products",
      value: listings?.filter(l => l.status === 'active').length || 0,
      icon: Package,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Total Orders",
      value: orders?.length || 0,
      icon: ShoppingCart,
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Revenue (RWF)",
      value: payments?.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString() || "0",
      icon: DollarSign,
      change: "+15%",
      changeType: "positive" as const
    },
    {
      title: "Customers",
      value: orders?.length || 0,
      icon: Users,
      change: "+5%",
      changeType: "positive" as const
    }
  ];

  const renderSimpleTable = (data: any[], title: string, isLoading: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title/Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
          </TableRow>
        ) : data?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8">No {title.toLowerCase()} found</TableCell>
          </TableRow>
        ) : (
          data?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.title || item.id?.slice(0, 8) || 'N/A'}</div>
                  {item.price && <div className="text-sm text-muted-foreground">{item.price.toLocaleString()} RWF</div>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'active' || item.status === 'paid' || item.status === 'success' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{new Date(item.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Commerce Dashboard</h1>
          <p className="text-muted-foreground">
            Manage products, orders, and payments
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                {" "}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(listings || [], 'products', loadingListings)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(orders || [], 'orders', loadingOrders)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSimpleTable(payments || [], 'payments', loadingPayments)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}