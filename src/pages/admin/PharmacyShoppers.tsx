import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Phone, MapPin, Calendar, ShoppingBag, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PharmacyShoppers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("all");

  // Mock data - replace with actual Supabase queries
  const mockShoppers = [
    {
      id: "SH001",
      full_name: "Uwimana Marie",
      whatsapp_number: "+250123456789",
      preferred_lang: "rw",
      total_orders: 12,
      ltv: 45600,
      last_order: "2025-01-19T08:30:00Z",
      segment: "frequent",
      location: "Kigali, Gasabo"
    },
    {
      id: "SH002", 
      full_name: "Nkurunziza Paul",
      whatsapp_number: "+250987654321",
      preferred_lang: "en",
      total_orders: 3,
      ltv: 8400,
      last_order: "2025-01-15T14:20:00Z", 
      segment: "new",
      location: "Kigali, Nyarugenge"
    },
    {
      id: "SH003",
      full_name: "Mukamana Agnes", 
      whatsapp_number: "+250555777888",
      preferred_lang: "rw",
      total_orders: 28,
      ltv: 156800,
      last_order: "2025-01-18T16:45:00Z",
      segment: "high-spend",
      location: "Kigali, Kicukiro"
    }
  ];

  const getSegmentBadge = (segment: string) => {
    const colors = {
      frequent: "bg-blue-100 text-blue-800",
      "high-spend": "bg-green-100 text-green-800", 
      new: "bg-purple-100 text-purple-800",
      dormant: "bg-gray-100 text-gray-800"
    };

    return (
      <Badge className={colors[segment as keyof typeof colors]}>
        {segment.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getLanguageFlag = (lang: string) => {
    return lang === 'rw' ? '🇷🇼' : '🇬🇧';
  };

  const filteredShoppers = mockShoppers.filter(shopper => {
    const matchesSearch = shopper.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopper.whatsapp_number.includes(searchTerm);
    const matchesSegment = selectedSegment === "all" || shopper.segment === selectedSegment;
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Shoppers</h1>
          <p className="text-muted-foreground">Customer insights and management</p>
        </div>
        <Button>Add Shopper</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Shoppers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+8% this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High-Spend Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84</div>
            <p className="text-xs text-muted-foreground">LTV &gt; 100K RWF</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Frequent Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">312</div>
            <p className="text-xs text-muted-foreground">10+ orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,800 RWF</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Shoppers</CardTitle>
            <div className="flex space-x-2">
              <Input 
                placeholder="Search shoppers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="frequent">Frequent</SelectItem>
                  <SelectItem value="high-spend">High-Spend</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="dormant">Dormant (30d)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shopper</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>LTV</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShoppers.map((shopper) => (
                <TableRow key={shopper.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {shopper.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{shopper.full_name}</p>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{shopper.location}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm">{shopper.whatsapp_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSegmentBadge(shopper.segment)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <ShoppingBag className="h-4 w-4" />
                      <span className="font-medium">{shopper.total_orders}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{shopper.ltv.toLocaleString()} RWF</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">
                        {new Date(shopper.last_order).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg">{getLanguageFlag(shopper.preferred_lang)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">View</Button>
                      <Button variant="ghost" size="sm">Message</Button>
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

export default PharmacyShoppers;