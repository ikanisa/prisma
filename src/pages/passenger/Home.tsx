import { useState } from "react";
import { PassengerLayout } from "@/components/PassengerLayout";
import { CreditDisplay } from "@/components/CreditDisplay";
import { QuickActions } from "@/components/QuickActions";
import { RecentActivity } from "@/components/RecentActivity";
import { useToast } from "@/hooks/use-toast";

const mockActivities = [
  {
    id: '1',
    type: 'payment' as const,
    title: 'Payment Generated',
    description: 'QR code for 5,000 RWF',
    amount: -1,
    timestamp: '2 min ago',
    status: 'completed' as const,
  },
  {
    id: '2',
    type: 'purchase' as const,
    title: 'Coffee Beans',
    description: 'From Rwandan Coffee Co-op',
    amount: -3500,
    timestamp: '1 hour ago',
    status: 'completed' as const,
  },
  {
    id: '3',
    type: 'ride' as const,
    title: 'Moto Ride',
    description: 'Kigali to Kimisagara',
    amount: -800,
    timestamp: '3 hours ago',
    status: 'completed' as const,
  },
];

export default function PassengerHome() {
  const [credits, setCredits] = useState(58);
  const { toast } = useToast();

  const handleTopUp = () => {
    toast({
      title: "Top Up Credits",
      description: "Feature coming soon! Connect to mobile money or subscription plans.",
    });
  };

  const handlePayment = () => {
    toast({
      title: "Payment Generator",
      description: "Opening payment flow...",
    });
  };

  const handleShop = () => {
    toast({
      title: "Marketplace",
      description: "Browse fresh produce and local products",
    });
  };

  const handleRides = () => {
    toast({
      title: "Book a Ride",
      description: "Find nearby moto and taxi drivers",
    });
  };

  const handleEvents = () => {
    toast({
      title: "Events",
      description: "Discover upcoming events in your area",
    });
  };

  const handleReferral = () => {
    toast({
      title: "Refer Friends",
      description: "Share your referral code: EMO-2024-KIGALI",
    });
  };

  const handleSupport = () => {
    toast({
      title: "AI Support",
      description: "Connect to our WhatsApp AI assistant",
    });
  };

  return (
    <PassengerLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome & Credits */}
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Welcome back!</h2>
            <p className="text-muted-foreground">Ready for your next transaction?</p>
          </div>
          
          <CreditDisplay credits={credits} onTopUp={handleTopUp} />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-medium text-foreground px-4 mb-2">Quick Actions</h3>
          <QuickActions
            onPayment={handlePayment}
            onShop={handleShop}
            onRides={handleRides}
            onEvents={handleEvents}
            onReferral={handleReferral}
            onSupport={handleSupport}
          />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity activities={mockActivities} />
        </div>
      </div>
    </PassengerLayout>
  );
}