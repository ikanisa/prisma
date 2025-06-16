
import React from 'react';
import { ArrowLeft, Flashlight, FlashlightOff, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleQRScannerHeaderProps {
  onBack: () => void;
  hasTorch: boolean;
  isTorchOn: boolean;
  onToggleTorch: () => void;
  onShowManualInput: () => void;
}

const SimpleQRScannerHeader: React.FC<SimpleQRScannerHeaderProps> = ({
  onBack,
  hasTorch,
  isTorchOn,
  onToggleTorch,
  onShowManualInput
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-60 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 rounded-full p-2"
          aria-label="Go to home screen"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-white font-semibold">Universal QR Scanner</h2>
          <p className="text-white/80 text-sm">Scan any mobile money QR code</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasTorch && (
            <Button
              onClick={onToggleTorch}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              {isTorchOn ? (
                <FlashlightOff className="w-5 h-5" />
              ) : (
                <Flashlight className="w-5 h-5" />
              )}
            </Button>
          )}
          
          <Button
            onClick={onShowManualInput}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 rounded-full p-2"
          >
            <Edit3 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimpleQRScannerHeader;
