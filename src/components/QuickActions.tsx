import { QrCode, ShoppingCart, Car, Calendar, UserPlus, HeadphonesIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  action: () => void;
}

interface QuickActionsProps {
  onPayment: () => void;
  onShop: () => void;
  onRides: () => void;
  onEvents: () => void;
  onReferral: () => void;
  onSupport: () => void;
}

export function QuickActions({ 
  onPayment, 
  onShop, 
  onRides, 
  onEvents, 
  onReferral, 
  onSupport 
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      icon: QrCode,
      label: "Generate Payment",
      description: "Create QR or USSD code",
      color: "text-primary",
      action: onPayment,
    },
    {
      icon: ShoppingCart,
      label: "Shop",
      description: "Browse products & services",
      color: "text-accent",
      action: onShop,
    },
    {
      icon: Car,
      label: "Book Ride",
      description: "Moto, taxi & deliveries",
      color: "text-info",
      action: onRides,
    },
    {
      icon: Calendar,
      label: "Events",
      description: "Discover & book events",
      color: "text-warning",
      action: onEvents,
    },
    {
      icon: UserPlus,
      label: "Refer Friend",
      description: "Earn +1 credit per referral",
      color: "text-success",
      action: onReferral,
    },
    {
      icon: HeadphonesIcon,
      label: "Support",
      description: "Get help via AI chat",
      color: "text-muted-foreground",
      action: onSupport,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {actions.map((action, index) => (
        <Card 
          key={action.label} 
          className="hover:shadow-medium transition-all duration-200 cursor-pointer group"
          onClick={action.action}
        >
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className={`h-6 w-6 ${action.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">{action.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}