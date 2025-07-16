import { Coins, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CreditDisplayProps {
  credits: number;
  onTopUp?: () => void;
}

export function CreditDisplay({ credits, onTopUp }: CreditDisplayProps) {
  return (
    <Card className="bg-gradient-primary text-primary-foreground shadow-medium border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Available Credits</p>
              <p className="text-2xl font-bold">{credits.toLocaleString()}</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onTopUp}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Plus className="h-4 w-4" />
            Top Up
          </Button>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs opacity-80">
            1 credit = 1 payment generation • Free referrals add +1 credit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}