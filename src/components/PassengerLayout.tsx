import { Wallet, QrCode, ShoppingBag, Car, Calendar, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PassengerLayoutProps {
  children?: React.ReactNode;
}

export function PassengerLayout({ children }: PassengerLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="bg-card shadow-soft border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">eM</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">easyMO</h1>
              <p className="text-xs text-muted-foreground">Mobile Money Super App</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-strong">
        <div className="flex justify-around items-center py-2 max-w-md mx-auto">
          <NavItem icon={Wallet} label="Wallet" active />
          <NavItem icon={QrCode} label="Pay" />
          <NavItem icon={ShoppingBag} label="Shop" />
          <NavItem icon={Car} label="Rides" />
          <NavItem icon={Calendar} label="Events" />
        </div>
      </nav>
    </div>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ icon: Icon, label, active }: NavItemProps) {
  return (
    <button className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
      active 
        ? 'text-primary bg-primary/10' 
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    }`}>
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}