
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScanResult } from '@/services/qr-scanner/types';
import { AIValidationResult } from '@/services/aiUssdValidationService';
import { getUssdDisplayInfo } from '@/utils/universalUssdHelper';

interface UniversalQRScannerResultProps {
  scannedResult: ScanResult;
  ussdValidation: AIValidationResult;
  onLaunchUssd: () => void;
  onRescan: () => void;
}

const UniversalQRScannerResult: React.FC<UniversalQRScannerResultProps> = ({
  scannedResult,
  ussdValidation,
  onLaunchUssd,
  onRescan
}) => {
  const displayInfo = getUssdDisplayInfo(ussdValidation);

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className={`${ussdValidation.isValid ? 'bg-green-500/20' : 'bg-yellow-500/20'} rounded-2xl p-6 mb-6`}>
        <div className="text-6xl mb-4">
          {ussdValidation.isValid ? '✓' : '⚠️'}
        </div>
        <h3 className={`text-xl font-semibold mb-2 ${displayInfo.color}`}>
          {displayInfo.title}
        </h3>
        <p className="text-gray-300 text-sm">{displayInfo.subtitle}</p>
      </div>

      {/* USSD Code Display */}
      <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
        <p className="text-white text-sm mb-2">Scanned Code:</p>
        <p className="text-blue-300 font-mono text-lg break-all">
          {ussdValidation.sanitized}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {ussdValidation.isValid ? (
          <Button
            onClick={onLaunchUssd}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-4 h-14"
          >
            Launch Payment Dialer
          </Button>
        ) : (
          <Button
            onClick={() => window.location.href = `tel:${encodeURIComponent(ussdValidation.sanitized)}`}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-lg py-4 h-14"
          >
            Try Launch Anyway
          </Button>
        )}
      </div>
    </div>
  );
};

export default UniversalQRScannerResult;
