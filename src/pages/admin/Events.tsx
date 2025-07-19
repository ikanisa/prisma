import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, Plus, RefreshCw, Calendar, MapPin, DollarSign, Eye, Pencil, Trash2,
  Filter, Download, Upload, TrendingUp, Clock, Star, Image as ImageIcon,
  Globe, Copy, MoreHorizontal, Users, Settings, BarChart3, CheckCircle,
  XCircle, AlertCircle, ExternalLink, Zap, Target, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
  external_source: string | null;
  organizer_user_id: string | null;
  created_at: string;
  gps_location?: any;
}

const CATEGORIES = [
  "Music", "Sports", "Business", "Education", "Social", "Food", "Technology", 
  "Art", "Entertainment", "Health", "Travel", "Fashion", "Other"
];

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    price: "",
    category: "",
    image_url: ""
  });
  const { toast } = useToast();

  const itemsPerPage = 12;

  useEffect(() => {
    loadEvents();
  }, [currentPage, searchTerm, selectedCategory, selectedStatus]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .order('event_date', { ascending: false, nullsFirst: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedStatus === "upcoming") {
        query = query.gte('event_date', new Date().toISOString());
      } else if (selectedStatus === "past") {
        query = query.lt('event_date', new Date().toISOString());
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setEvents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const eventData = {
        ...formData,
        price: formData.price ? parseInt(formData.price) : null,
        event_date: formData.event_date || null
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      setShowCreateDialog(false);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      const eventData = {
        ...formData,
        price: formData.price ? parseInt(formData.price) : null,
        event_date: formData.event_date || null
      };

      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event updated successfully",
      });

      setEditingEvent(null);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive"
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: "",
      location: "",
      price: "",
      category: "",
      image_url: ""
    });
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      description: event.description || "",
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
      location: event.location || "",
      price: event.price?.toString() || "",
      category: event.category || "",
      image_url: event.image_url || ""
    });
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-muted';
    const colors = {
      'music': 'bg-purple-500',
      'sports': 'bg-green-500',
      'business': 'bg-blue-500',
      'education': 'bg-orange-500',
      'social': 'bg-pink-500',
      'food': 'bg-yellow-500',
      'technology': 'bg-cyan-500',
      'art': 'bg-red-500',
      'entertainment': 'bg-indigo-500',
      'health': 'bg-emerald-500',
      'travel': 'bg-teal-500',
      'fashion': 'bg-rose-500'
    };
    return colors[category.toLowerCase() as keyof typeof colors] || 'bg-muted';
  };

  const getCategoryBadgeColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    switch (category.toLowerCase()) {
      case 'music': return 'bg-purple-100 text-purple-800';
      case 'sports': return 'bg-green-100 text-green-800';
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'education': return 'bg-orange-100 text-orange-800';
      case 'social': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isUpcoming = (eventDate: string | null) => {
    if (!eventDate) return false;
    return new Date(eventDate) > new Date();
  };

  const formatEventDate = (eventDate: string | null) => {
    if (!eventDate) return 'TBA';
    const date = new Date(eventDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const upcomingCount = events.filter(e => isUpcoming(e.event_date)).length;
  const paidCount = events.filter(e => e.price && e.price > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Events Management</h1>
          <p className="text-muted-foreground">Manage and monitor all events in your platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadEvents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Export CSV</DropdownMenuItem>
              <DropdownMenuItem>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Event title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Event description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Date & Time</Label>
                    <Input
                      id="event_date"
                      type="datetime-local"
                      value={formData.event_date}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (RWF)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="0 for free"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Event location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent}>
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Future events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Events</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {events.filter(e => !e.price || e.price === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">No admission fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Events</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{paidCount}</div>
            <p className="text-xs text-muted-foreground">Ticketed events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(events.map(e => e.category).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Display */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({totalCount.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No events found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria or create a new event.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge variant={isUpcoming(event.event_date) ? "default" : "secondary"}>
                        {isUpcoming(event.event_date) ? "Upcoming" : "Past"}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditDialog(event)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteEvent(event.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      {event.category && (
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(event.category)}`} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event.event_date)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {event.price && event.price > 0 ? (
                            <span className="font-medium">{event.price.toLocaleString()} RWF</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Free</span>
                          )}
                        </div>
                        {event.category && (
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                        )}
                      </div>
                      {event.external_source && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          External Source
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatEventDate(event.event_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {event.location || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.category && (
                        <Badge className={getCategoryBadgeColor(event.category)}>
                          {event.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.price && event.price > 0 ? (
                        <span className="font-medium">{event.price.toLocaleString()} RWF</span>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isUpcoming(event.event_date) ? "default" : "secondary"}>
                        {isUpcoming(event.event_date) ? "Upcoming" : "Past"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(event)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} events
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-event_date">Date & Time</Label>
                <Input
                  id="edit-event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price (RWF)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0 for free"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Event location"
                />
              </div>
              <div>
                <Label htmlFor="edit-image_url">Image URL</Label>
                <Input
                  id="edit-image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEvent}>
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
