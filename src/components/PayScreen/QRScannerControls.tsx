
import React from 'react';
import { Zap, Edit3 } from 'lucide-react';

interface QRScannerControlsProps {
  isScanning: boolean;
  isEnhancedMode: boolean;
  onEnhancedScan: () => void;
  onShowManualInput: () => void;
}

const QRScannerControls: React.FC<QRScannerControlsProps> = ({
  isScanning,
  isEnhancedMode,
  onEnhancedScan,
  onShowManualInput
}) => {
  if (!isScanning) return null;

  return (
    <div className="flex justify-center gap-2 px-4 pb-2">
      <button
        onClick={onEnhancedScan}
        disabled={isEnhancedMode}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {isEnhancedMode ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            Processing...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            AI Enhance
          </>
        )}
      </button>
      
      <button
        onClick={onShowManualInput}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        <Edit3 className="w-4 h-4" />
        Manual Input
      </button>
    </div>
  );
};

export default QRScannerControls;
