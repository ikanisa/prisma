import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Pill, Clock, MapPin, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PharmacyOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Today");

  // Mock data - replace with actual Supabase queries
  const mockOrders = [
    {
      id: "PH001",
      shopper: { name: "Uwimana Marie", phone: "+250123456789" },
      items: [
        { name: "Paracetamol 500mg", qty: 2, price: 800 },
        { name: "Vitamin C 1000mg", qty: 1, price: 2000 }
      ],
      total: 3600,
      status: "preparing",
      courier: "John Doe",
      created_at: "2025-01-19T10:30:00Z",
      delivery_address: "Kigali, Gasabo, Remera"
    },
    {
      id: "PH002", 
      shopper: { name: "Nkurunziza Paul", phone: "+250987654321" },
      items: [
        { name: "Aspirin 100mg", qty: 1, price: 1200 }
      ],
      total: 1700,
      status: "out_for_delivery",
      courier: "Jane Smith",
      created_at: "2025-01-19T09:15:00Z",
      delivery_address: "Kigali, Nyarugenge, Muhima"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      pending_payment: "destructive", 
      paid: "default",
      preparing: "default",
      out_for_delivery: "default",
      delivered: "default",
      cancelled: "destructive"
    };
    
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      pending_payment: "bg-red-100 text-red-800",
      paid: "bg-blue-100 text-blue-800", 
      preparing: "bg-yellow-100 text-yellow-800",
      out_for_delivery: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const OrderDetail = ({ order }: { order: any }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">SHOPPER</h4>
          <div className="flex items-center space-x-2 mt-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{order.shopper.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{order.shopper.name}</p>
              <p className="text-sm text-muted-foreground">{order.shopper.phone}</p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">STATUS</h4>
          <div className="mt-1">{getStatusBadge(order.status)}</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm text-muted-foreground">ITEMS</h4>
        <div className="space-y-2 mt-1">
          {order.items.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
              <div className="flex items-center space-x-2">
                <Pill className="h-4 w-4" />
                <span>{item.name}</span>
              </div>
              <div className="text-right">
                <p className="font-medium">{item.qty} × {item.price} RWF</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm text-muted-foreground">DELIVERY</h4>
        <div className="flex items-start space-x-2 mt-1">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-sm">{order.delivery_address}</p>
        </div>
        {order.courier && (
          <div className="flex items-center space-x-2 mt-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">Courier: {order.courier}</p>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button variant="outline" size="sm">Mark Prepared</Button>
        <Button variant="outline" size="sm">Contact Shopper</Button>
        <Button variant="destructive" size="sm">Cancel Order</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Orders</h1>
          <p className="text-muted-foreground">Manage medication orders and prescriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Preparing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Ready soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">ETA 30 min avg</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124,500 RWF</div>
            <p className="text-xs text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Orders</CardTitle>
            <div className="flex space-x-2">
              <Input 
                placeholder="Search orders..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline">Today</Button>
              <Button variant="outline">This Week</Button>
              <Button variant="outline">All</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Shopper</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{order.shopper.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{order.shopper.name}</p>
                        <p className="text-xs text-muted-foreground">{order.shopper.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Pill className="h-4 w-4" />
                      <span>{order.items.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{order.total.toLocaleString()} RWF</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.courier || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm">{new Date(order.created_at).toLocaleTimeString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Order {order.id}</SheetTitle>
                        </SheetHeader>
                        <OrderDetail order={order} />
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyOrders;