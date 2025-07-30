import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  CreditCard, 
  Bike, 
  Package, 
  ShoppingCart, 
  MessageCircle, 
  Users, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from "lucide-react";
import { toast } from "sonner";

interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  template: string;
  variables: string[];
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  // Welcome/Main Actions (Based on TPL_WELCOME_MAIN)
  {
    id: "welcome_main",
    name: "Welcome Menu",
    description: "Main welcome template with all service options",
    icon: Users,
    category: "welcome",
    template: "🚀 Welcome to easyMO! Choose what you need:",
    variables: [],
    color: "text-blue-600"
  },
  
  // Payment Actions (MoMo QR/USSD)
  {
    id: "payment_pay",
    name: "Pay",
    description: "Initiate payment process",
    icon: CreditCard,
    category: "payment",
    template: "💸 Pay someone easily with easyMO. Scan their QR or enter details:",
    variables: [],
    color: "text-green-600"
  },
  {
    id: "payment_get_paid",
    name: "Get Paid",
    description: "Generate QR for receiving payment",
    icon: CreditCard,
    category: "payment",
    template: "💰 Generate your QR code to receive payment. Amount: {amount} RWF",
    variables: ["amount", "momo_number"],
    color: "text-emerald-600"
  },
  {
    id: "payment_scan_qr",
    name: "Scan QR",
    description: "Provide QR scanner guidance",
    icon: Package,
    category: "payment",
    template: "📱 Scan QR to pay instantly. Use your camera or MoMo app scanner.",
    variables: [],
    color: "text-blue-600"
  },
  {
    id: "payment_get_qr",
    name: "Get QR",
    description: "Generate personal QR code",
    icon: Package,
    category: "payment",
    template: "🔗 Here's your personal QR code. Share it to receive payments easily!",
    variables: ["amount", "label"],
    color: "text-purple-600"
  },
  {
    id: "payment_confirmation",
    name: "Payment Confirmation",
    description: "Confirm successful payment",
    icon: CheckCircle,
    category: "payment",
    template: "✅ Payment confirmed! {amount} RWF received. Transaction ID: {transaction_id}",
    variables: ["amount", "transaction_id"],
    color: "text-green-600"
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    description: "Remind user about pending payment",
    icon: Clock,
    category: "payment",
    template: "⏰ Payment reminder: {amount} RWF due for {service}. Pay via MoMo: {momo_code}",
    variables: ["amount", "service", "momo_code"],
    color: "text-orange-600"
  },
  {
    id: "payment_failed",
    name: "Payment Failed",
    description: "Notify about failed payment",
    icon: AlertTriangle,
    category: "payment",
    template: "❌ Payment failed for {service}. Please try again with USSD: {ussd_code}",
    variables: ["service", "ussd_code"],
    color: "text-red-600"
  },

  // Mobility/Moto Actions
  {
    id: "moto_nearby_drivers",
    name: "See Nearby Drivers",
    description: "Show nearby available drivers",
    icon: Bike,
    category: "moto",
    template: "🏍️ Finding nearby drivers... Share your location for best results.",
    variables: [],
    color: "text-blue-600"
  },
  {
    id: "moto_nearby_passengers",
    name: "See Nearby Passengers",
    description: "Show nearby passengers for drivers",
    icon: Users,
    category: "moto",
    template: "👥 Here are passengers looking for rides in your area:",
    variables: [],
    color: "text-indigo-600"
  },
  {
    id: "moto_schedule_trip",
    name: "Schedule Trip",
    description: "Help schedule a future trip",
    icon: Clock,
    category: "moto",
    template: "🗓️ Schedule your trip. When do you need the ride? Share pickup and destination.",
    variables: [],
    color: "text-purple-600"
  },
  {
    id: "moto_see_trip",
    name: "See Trip",
    description: "View current or booked trip details",
    icon: MapPin,
    category: "moto",
    template: "🗺️ Your trip details: From {pickup} to {destination}. Driver: {driver_name}",
    variables: ["pickup", "destination", "driver_name"],
    color: "text-green-600"
  },
  {
    id: "driver_assigned",
    name: "Driver Assigned",
    description: "Notify passenger about driver assignment",
    icon: Bike,
    category: "moto",
    template: "🏍️ Driver assigned! {driver_name} is coming. ETA: {eta} minutes. Contact: {phone}",
    variables: ["driver_name", "eta", "phone"],
    color: "text-blue-600"
  },
  {
    id: "trip_completed",
    name: "Trip Completed",
    description: "Confirm trip completion",
    icon: CheckCircle,
    category: "moto",
    template: "✅ Trip completed! Fare: {fare} RWF. Safe travels! Rate your ride: {rating_link}",
    variables: ["fare", "rating_link"],
    color: "text-green-600"
  },
  {
    id: "driver_arrived",
    name: "Driver Arrived",
    description: "Notify passenger that driver has arrived",
    icon: MapPin,
    category: "moto",
    template: "📍 Your driver {driver_name} has arrived at {pickup_location}. Contact: {phone}",
    variables: ["driver_name", "pickup_location", "phone"],
    color: "text-purple-600"
  },
  {
    id: "location_request",
    name: "Location Request",
    description: "Request user location sharing",
    icon: MapPin,
    category: "moto",
    template: "📍 Share your location so I can find nearby drivers/passengers for you.",
    variables: [],
    color: "text-orange-600"
  },

  // Business/Commerce Actions
  {
    id: "browse_businesses",
    name: "Browse Businesses",
    description: "Show business categories",
    icon: ShoppingCart,
    category: "commerce",
    template: "🏪 Browse local businesses: Bars, Pharmacies, Hardware, Cosmetics, Farmers & more!",
    variables: [],
    color: "text-emerald-600"
  },
  {
    id: "bars_category",
    name: "Bars",
    description: "Show nearby bars and restaurants",
    icon: Package,
    category: "commerce",
    template: "🍺 Bars & Restaurants near you. What are you craving today?",
    variables: [],
    color: "text-amber-600"
  },
  {
    id: "cosmetics_category",
    name: "Cosmetics",
    description: "Show cosmetics and beauty shops",
    icon: Package,
    category: "commerce", 
    template: "💄 Beauty & Cosmetics shops. Find your perfect products!",
    variables: [],
    color: "text-pink-600"
  },
  {
    id: "hardware_category",
    name: "Hardware",
    description: "Show hardware and construction supplies",
    icon: Package,
    category: "commerce",
    template: "🔨 Hardware & Construction supplies. What do you need to build?",
    variables: [],
    color: "text-gray-600"
  },
  {
    id: "spare_parts_category",
    name: "Spare Parts",
    description: "Show vehicle and machine spare parts",
    icon: Package,
    category: "commerce",
    template: "⚙️ Vehicle & Machine spare parts. What part are you looking for?",
    variables: [],
    color: "text-blue-600"
  },
  {
    id: "farmers_category",
    name: "Farmers",
    description: "Show fresh produce from farmers",
    icon: Package,
    category: "commerce",
    template: "🌱 Fresh produce from local farmers. What fruits/vegetables do you need?",
    variables: [],
    color: "text-green-600"
  },
  {
    id: "order_confirmed",
    name: "Order Confirmed",
    description: "Confirm order placement",
    icon: ShoppingCart,
    category: "commerce",
    template: "🛒 Order confirmed! {items} from {vendor}. Total: {total} RWF. Delivery: {delivery_time}",
    variables: ["items", "vendor", "total", "delivery_time"],
    color: "text-indigo-600"
  },
  {
    id: "delivery_update",
    name: "Delivery Update",
    description: "Update on delivery status",
    icon: Clock,
    category: "commerce",
    template: "🚚 Delivery update: Your order is {status}. Expected delivery: {delivery_time}",
    variables: ["status", "delivery_time"],
    color: "text-yellow-600"
  },

  // Listings Actions (Properties & Vehicles)
  {
    id: "list_property_vehicle",
    name: "List Property/Vehicle",
    description: "Help user list property or vehicle",
    icon: Package,
    category: "listings",
    template: "🏠🚗 List your property or vehicle for rent/sale. What would you like to list?",
    variables: [],
    color: "text-cyan-600"
  },
  {
    id: "property_available",
    name: "Property Available",
    description: "Notify about property availability",
    icon: Package,
    category: "listings",
    template: "🏠 Property available! {property_type} in {location}. Price: {price} RWF. Contact: {contact}",
    variables: ["property_type", "location", "price", "contact"],
    color: "text-emerald-600"
  },
  {
    id: "vehicle_available",
    name: "Vehicle Available", 
    description: "Notify about vehicle availability",
    icon: Package,
    category: "listings",
    template: "🚗 Vehicle available! {vehicle_type} {year}. Price: {price} RWF. Contact: {contact}",
    variables: ["vehicle_type", "year", "price", "contact"],
    color: "text-blue-600"
  },
  {
    id: "listing_inquiry",
    name: "Listing Inquiry",
    description: "Handle listing inquiries",
    icon: MessageCircle,
    category: "listings",
    template: "📞 Someone is interested in your {listing_type}! Contact {inquirer_name}: {phone}",
    variables: ["listing_type", "inquirer_name", "phone"],
    color: "text-purple-600"
  },

  // Events Actions
  {
    id: "see_events",
    name: "See Events",
    description: "Show upcoming events",
    icon: Star,
    category: "events",
    template: "🎉 Upcoming events in your area. What type of event interests you?",
    variables: [],
    color: "text-violet-600"
  },
  {
    id: "event_reminder",
    name: "Event Reminder",
    description: "Remind about upcoming event",
    icon: Clock,
    category: "events", 
    template: "📅 Event reminder: {event_name} starts in {time}. Location: {location}",
    variables: ["event_name", "time", "location"],
    color: "text-orange-600"
  },
  {
    id: "event_ticket",
    name: "Event Ticket",
    description: "Provide event ticket information",
    icon: Star,
    category: "events",
    template: "🎫 Your ticket for {event_name}. Date: {date} Time: {time} Venue: {venue}",
    variables: ["event_name", "date", "time", "venue"],
    color: "text-indigo-600"
  },

  // Support & Help Actions
  {
    id: "help_menu",
    name: "Help",
    description: "Provide help and support options",
    icon: MessageCircle,
    category: "support",
    template: "❓ How can I help you today? Choose from: Payments, Transport, Shopping, Listings, Account",
    variables: [],
    color: "text-gray-600"
  },
  {
    id: "welcome_new_user",
    name: "Welcome New User",
    description: "Welcome message for new users",
    icon: Users,
    category: "support",
    template: "👋 Welcome to easyMO, {customer_name}! Your all-in-one app for payments, transport, and shopping in Rwanda.",
    variables: ["customer_name"],
    color: "text-pink-600"
  },
  {
    id: "support_ticket",
    name: "Support Ticket Created",
    description: "Acknowledge support request",
    icon: MessageCircle,
    category: "support",
    template: "🎫 Support ticket #{ticket_id} created. We'll respond within {response_time}. Thank you for your patience!",
    variables: ["ticket_id", "response_time"],
    color: "text-gray-600"
  },
  {
    id: "feedback_request",
    name: "Feedback Request",
    description: "Request user feedback",
    icon: Star,
    category: "support",
    template: "⭐ How was your experience with {service}? Your feedback helps us improve: {feedback_link}",
    variables: ["service", "feedback_link"],
    color: "text-amber-600"
  },
  {
    id: "human_handoff",
    name: "Human Handoff",
    description: "Transfer to human agent",
    icon: Users,
    category: "support",
    template: "👤 Connecting you to a teammate now. Please wait a moment...",
    variables: [],
    color: "text-blue-600"
  },
  {
    id: "opt_out_stop",
    name: "Opt Out (STOP)",
    description: "Handle STOP/unsubscribe requests",
    icon: AlertTriangle,
    category: "support",
    template: "✋ You've been unsubscribed from easyMO messages. Reply START to reactivate anytime.",
    variables: [],
    color: "text-red-600"
  },

  // Language & Localization
  {
    id: "language_switch_rw",
    name: "Switch to Kinyarwanda",
    description: "Offer to switch to Kinyarwanda",
    icon: MessageCircle,
    category: "language",
    template: "🇷🇼 Ndagukorera mu Kinyarwanda niba ubishaka. Hitamo ururimi:",
    variables: [],
    color: "text-green-600"
  },
  {
    id: "language_switch_fr", 
    name: "Switch to French",
    description: "Offer to switch to French",
    icon: MessageCircle,
    category: "language",
    template: "🇫🇷 Je peux vous aider en français si vous préférez. Choisissez votre langue:",
    variables: [],
    color: "text-blue-600"
  },
  {
    id: "language_switch_en",
    name: "Switch to English",
    description: "Offer to switch to English",
    icon: MessageCircle,
    category: "language",
    template: "🇺🇸 I can help you in English. Choose your preferred language:",
    variables: [],
    color: "text-red-600"
  }
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "welcome", label: "Welcome" },
  { value: "payment", label: "Payment" },
  { value: "moto", label: "Moto/Transport" },
  { value: "commerce", label: "Commerce" },
  { value: "listings", label: "Listings" },
  { value: "events", label: "Events" },
  { value: "support", label: "Support" },
  { value: "language", label: "Language" }
];

export function QuickActions() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customMessage, setCustomMessage] = useState("");

  const filteredActions = QUICK_ACTIONS.filter(action => {
    const matchesCategory = selectedCategory === "all" || action.category === selectedCategory;
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          action.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSendMessage = async () => {
    if (!selectedAction || !phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      let finalMessage = customMessage || selectedAction.template;
      
      // Replace variables in the message
      selectedAction.variables.forEach(variable => {
        const value = variables[variable] || `{${variable}}`;
        finalMessage = finalMessage.replace(`{${variable}}`, value);
      });

      const { error } = await supabase.functions.invoke('response-sender', {
        body: {
          channel: 'whatsapp',
          recipient: phoneNumber,
          message: finalMessage,
          meta: {
            action_id: selectedAction.id,
            variables: variables
          }
        }
      });

      if (error) throw error;

      toast.success("Message sent successfully!");
      setIsDialogOpen(false);
      setPhoneNumber("");
      setVariables({});
      setCustomMessage("");
      setSelectedAction(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  const openActionDialog = (action: QuickAction) => {
    setSelectedAction(action);
    setCustomMessage(action.template);
    setVariables({});
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <p className="text-muted-foreground">
          Send predefined messages for common user journeys
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredActions.map(action => {
          const IconComponent = action.icon;
          return (
            <Card key={action.id} className="group hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <IconComponent className={`w-4 h-4 ${action.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{action.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {action.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {action.template}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => openActionDialog(action)}
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Send Message Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Quick Message</DialogTitle>
            <DialogDescription>
              Customize and send the selected message template
            </DialogDescription>
          </DialogHeader>
          
          {selectedAction && (
            <div className="space-y-4">
              {/* Action Info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <selectedAction.icon className={`w-5 h-5 ${selectedAction.color}`} />
                <div>
                  <h4 className="font-medium">{selectedAction.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedAction.description}</p>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+250788123456"
                  required
                />
              </div>

              {/* Variables */}
              {selectedAction.variables.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Template Variables</label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {selectedAction.variables.map(variable => (
                      <div key={variable}>
                        <label className="text-xs text-muted-foreground capitalize">
                          {variable.replace(/_/g, ' ')}
                        </label>
                        <Input
                          value={variables[variable] || ''}
                          onChange={(e) => setVariables(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }))}
                          placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Preview */}
              <div>
                <label className="text-sm font-medium">Message Content</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}