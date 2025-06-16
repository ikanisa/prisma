
import React from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface QRScannerHeaderProps {
  onBack: () => void;
  onRescan: () => void;
  isScanning: boolean;
  isOnline: boolean;
  scanResult: any;
}

const QRScannerHeader: React.FC<QRScannerHeaderProps> = ({
  onBack,
  onRescan,
  isScanning,
  isOnline,
  scanResult
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
      <button
        onClick={onBack}
        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      
      <h1 className="text-white text-lg font-semibold">
        {!isOnline && '📱 Offline '} 
        {scanResult?.method === 'ai' && '🤖 AI-Enhanced '}
        {scanResult?.method === 'enhanced' && '⚡ Enhanced '}
        Scan QR Code
      </h1>
      
      {!isScanning && (
        <button
          onClick={onRescan}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Rescan"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      )}
      {isScanning && <div className="w-10 h-10" />}
    </div>
  );
};

export default QRScannerHeader;
