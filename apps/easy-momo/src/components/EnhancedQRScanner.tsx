
import React from 'react';
import SimpleQRScanner from './PayScreen/SimpleQRScanner';
import { extractUSSDFromQR, validateUSSDFormat } from '@/utils/ussdHelper';
import { toast } from '@/hooks/use-toast';

interface EnhancedQRScannerProps {
  onScanResult: (ussdCode: string, transactionId?: string) => void;
  onClose: () => void;
}

const EnhancedQRScanner: React.FC<EnhancedQRScannerProps> = ({
  onScanResult,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <SimpleQRScanner onBack={onClose} />
    </div>
  );
};

export default EnhancedQRScanner;
