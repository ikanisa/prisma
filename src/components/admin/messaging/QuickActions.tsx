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
  // Payment Actions
  {
    id: "payment_confirmation",
    name: "Payment Confirmation",
    description: "Confirm successful payment",
    icon: CheckCircle,
    category: "payment",
    template: "✅ Payment confirmed! {amount} RWF received for {service}. Transaction ID: {transaction_id}",
    variables: ["amount", "service", "transaction_id"],
    color: "text-green-600"
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    description: "Remind user about pending payment",
    icon: CreditCard,
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
    template: "❌ Payment failed for {service}. Please try again or contact support.",
    variables: ["service"],
    color: "text-red-600"
  },

  // Moto/Transport Actions
  {
    id: "driver_assigned",
    name: "Driver Assigned",
    description: "Notify passenger about driver assignment",
    icon: Bike,
    category: "moto",
    template: "🏍️ Driver assigned! {driver_name} is coming. ETA: {eta} minutes. Track: {tracking_link}",
    variables: ["driver_name", "eta", "tracking_link"],
    color: "text-blue-600"
  },
  {
    id: "trip_completed",
    name: "Trip Completed",
    description: "Confirm trip completion",
    icon: CheckCircle,
    category: "moto",
    template: "✅ Trip completed! Fare: {fare} RWF. Rate your ride: {rating_link}",
    variables: ["fare", "rating_link"],
    color: "text-green-600"
  },
  {
    id: "driver_arrived",
    name: "Driver Arrived",
    description: "Notify passenger that driver has arrived",
    icon: MapPin,
    category: "moto",
    template: "📍 Your driver {driver_name} has arrived at {pickup_location}",
    variables: ["driver_name", "pickup_location"],
    color: "text-purple-600"
  },

  // Listings/Commerce Actions
  {
    id: "order_confirmed",
    name: "Order Confirmed",
    description: "Confirm order placement",
    icon: ShoppingCart,
    category: "commerce",
    template: "🛒 Order confirmed! {items} ordered from {vendor}. Total: {total} RWF. Delivery: {delivery_time}",
    variables: ["items", "vendor", "total", "delivery_time"],
    color: "text-indigo-600"
  },
  {
    id: "product_available",
    name: "Product Available",
    description: "Notify about product availability",
    icon: Package,
    category: "listings",
    template: "📦 Good news! {product_name} is now available. Price: {price} RWF. Order now: {order_link}",
    variables: ["product_name", "price", "order_link"],
    color: "text-emerald-600"
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

  // Support Actions
  {
    id: "welcome_message",
    name: "Welcome Message",
    description: "Welcome new users",
    icon: Users,
    category: "support",
    template: "👋 Welcome to easyMO, {customer_name}! Your all-in-one app for payments, transport, and shopping.",
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
  }
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "payment", label: "Payment" },
  { value: "moto", label: "Moto/Transport" },
  { value: "commerce", label: "Commerce" },
  { value: "listings", label: "Listings" },
  { value: "support", label: "Support" }
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