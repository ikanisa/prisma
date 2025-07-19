import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Pill, AlertTriangle, Package, TrendingUp, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PharmacyProducts = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual Supabase queries
  const mockProducts = [
    {
      id: "PR001",
      name: "Paracetamol 500mg",
      description: "Pain relief and fever reducer",
      price: 800,
      unit: "10 tablets",
      stock_qty: 45,
      visible_in_whatsapp: true,
      category: "pharmacy",
      sales_this_month: 124
    },
    {
      id: "PR002", 
      name: "Vitamin C 1000mg",
      description: "Immune system booster",
      price: 2000,
      unit: "30 tablets", 
      stock_qty: 12,
      visible_in_whatsapp: true,
      category: "pharmacy",
      sales_this_month: 89
    },
    {
      id: "PR003",
      name: "Aspirin 100mg",
      description: "Blood thinner and pain relief",
      price: 1200,
      unit: "20 tablets",
      stock_qty: 0,
      visible_in_whatsapp: false,
      category: "pharmacy", 
      sales_this_month: 56
    }
  ];

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge className="bg-red-100 text-red-800">OUT OF STOCK</Badge>;
    } else if (stock <= 10) {
      return <Badge className="bg-yellow-100 text-yellow-800">LOW STOCK</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">IN STOCK</Badge>;
    }
  };

  const AddProductDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Pharmacy Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" placeholder="e.g. Paracetamol 500mg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Product description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (RWF)</Label>
              <Input id="price" type="number" placeholder="1000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="10 tablets" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Initial Stock</Label>
            <Input id="stock" type="number" placeholder="50" />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="visible" />
            <Label htmlFor="visible">Visible in WhatsApp</Label>
          </div>
          <div className="flex space-x-2">
            <Button className="flex-1">Add Product</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Products</h1>
          <p className="text-muted-foreground">Manage medication inventory and pricing</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import CSV
          </Button>
          <AddProductDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">+12 added this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">18</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">5</div>
            <p className="text-xs text-muted-foreground">Urgent restock needed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,400 RWF</div>
            <p className="text-xs text-muted-foreground">Per product unit</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Product Inventory</CardTitle>
            <div className="flex space-x-2">
              <Input 
                placeholder="Search products..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline">Low Stock</Button>
              <Button variant="outline">Out of Stock</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>WhatsApp Visible</TableHead>
                <TableHead>Sales (Month)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Pill className="h-8 w-8 p-1.5 bg-blue-100 text-blue-600 rounded" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{product.price.toLocaleString()} RWF</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span className={product.stock_qty <= 10 ? "text-red-600 font-medium" : "font-medium"}>
                        {product.stock_qty}
                      </span>
                      {product.stock_qty <= 10 && product.stock_qty > 0 && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      {product.stock_qty === 0 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStockBadge(product.stock_qty)}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={product.visible_in_whatsapp}
                      disabled={product.stock_qty === 0}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{product.sales_this_month}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm">Restock</Button>
                    </div>
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

export default PharmacyProducts;