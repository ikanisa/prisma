
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanResult } from '@/services/qr-scanner/types';

interface SimpleQRScannerResultProps {
  scannedResult: ScanResult;
  onLaunchMoMo: () => void;
  onRescan: () => void;
}

const SimpleQRScannerResult: React.FC<SimpleQRScannerResultProps> = ({
  scannedResult,
  onLaunchMoMo,
  onRescan
}) => {
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="bg-green-500/20 rounded-2xl p-6 mb-6">
        <div className="text-6xl mb-4">✓</div>
        <h3 className="text-white text-xl font-semibold mb-2">QR Code Scanned!</h3>
        <p className="text-gray-300 text-sm">Tap the button below to launch easyMO</p>
      </div>

      <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
        <p className="text-white text-sm mb-2">Scanned Code:</p>
        <p className="text-blue-300 font-mono text-lg break-all">
          {scannedResult.ussdCode || scannedResult.code}
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onLaunchMoMo}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
        >
          Launch easyMO Payment
        </Button>
        
        <Button
          onClick={onRescan}
          variant="outline"
          className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Scan Another Code
        </Button>
      </div>
    </div>
  );
};

export default SimpleQRScannerResult;
