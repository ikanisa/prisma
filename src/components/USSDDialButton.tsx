
import React from 'react';
import { Phone, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { formatUSSDForTel } from '@/utils/ussdHelper';
import { toast } from '@/hooks/use-toast';

interface USSDDialButtonProps {
  ussdCode: string;
  size?: 'sm' | 'md' | 'lg';
  showCopy?: boolean;
}

const USSDDialButton: React.FC<USSDDialButtonProps> = ({ 
  ussdCode, 
  size = 'md',
  showCopy = true 
}) => {
  const telUri = formatUSSDForTel(ussdCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ussdCode);
      toast({
        title: "Copied!",
        description: "USSD code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy USSD code",
        variant: "destructive"
      });
    }
  };

  const buttonSizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  return (
    <div className="space-y-3">
      {/* Main USSD Display */}
      <div className="bg-gray-900 rounded-xl p-4 text-center">
        <p className="text-white font-mono text-lg md:text-xl font-bold tracking-wider break-all">
          {ussdCode}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          asChild
          className={`flex-1 bg-green-600 hover:bg-green-700 text-white ${buttonSizes[size]}`}
        >
          <a href={telUri} className="flex items-center justify-center gap-2">
            <Phone className="w-5 h-5" />
            Dial Now
          </a>
        </Button>
        
        {showCopy && (
          <Button
            variant="outline"
            onClick={handleCopy}
            className={`${buttonSizes[size]}`}
          >
            <Copy className="w-4 h-4" />
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-600 text-center">
        Tap "Dial Now" to open your phone dialer with the USSD code
      </p>
    </div>
  );
};

export default USSDDialButton;
