
import React, { useState, useEffect } from 'react';
import { Camera, X, Flashlight, FlashlightOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { transactionService } from '@/services/transactionService';
import { extractUSSDFromQR, validateUSSDFormat } from '@/utils/ussdHelper';
import { toast } from '@/hooks/use-toast';
import SmartQRScanner from './PayScreen/SmartQRScanner';

interface EnhancedQRScannerProps {
  onScanResult: (ussdCode: string, transactionId?: string) => void;
  onClose: () => void;
}

const EnhancedQRScanner: React.FC<EnhancedQRScannerProps> = ({
  onScanResult,
  onClose
}) => {
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  const handleScanSuccess = async (qrData: string) => {
    // Prevent duplicate scans within 2 seconds
    const now = Date.now();
    if (now - lastScanTime < 2000) return;
    setLastScanTime(now);

    const ussdCode = extractUSSDFromQR(qrData);
    
    if (!ussdCode || !validateUSSDFormat(ussdCode)) {
      toast({
        title: "Invalid QR Code",
        description: "This doesn't appear to be a valid Mobile Money QR code",
        variant: "destructive"
      });
      return;
    }

    try {
      // Extract payment details from USSD for logging
      const ussdParts = ussdCode.match(/\*182\*1\*1\*(\d+)\*(\d+)#/);
      if (ussdParts) {
        const [, phone, amount] = ussdParts;
        
        // Find the corresponding payment request
        // In a real app, you might need to match this more precisely
        
        toast({
          title: "QR Code Scanned!",
          description: `Payment code: ${amount} RWF to ${phone}`,
        });
      }
      
      onScanResult(ussdCode);
    } catch (error) {
      console.error('Failed to log scan:', error);
      // Still proceed with the scan result even if logging fails
      onScanResult(ussdCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-60 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-white font-semibold">Scan QR Code</h2>
            <p className="text-white/80 text-sm">Point camera at Mobile Money QR</p>
          </div>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* QR Scanner */}
      {isScanning && (
        <SmartQRScanner 
          onBack={onClose}
        />
      )}

      {/* Instructions */}
      <div className="absolute bottom-0 left-0 right-0 z-60 bg-gradient-to-t from-black/90 to-transparent p-6 safe-area-bottom">
        <div className="text-center space-y-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-2">How to scan:</h3>
            <div className="text-white/90 text-sm space-y-1">
              <p>1. Point camera at the QR code</p>
              <p>2. Hold steady until detected</p>
              <p>3. Tap to dial Mobile Money code</p>
            </div>
          </div>
          
          <Button
            onClick={() => setIsScanning(!isScanning)}
            variant="outline"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isScanning ? 'Stop Camera' : 'Start Camera'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQRScanner;
