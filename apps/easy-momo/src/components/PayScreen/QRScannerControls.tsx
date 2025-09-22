
import React from 'react';
import { Zap, Edit3, RotateCcw, Square } from 'lucide-react';

interface QRScannerControlsProps {
  isScanning: boolean;
  isEnhancedMode: boolean;
  onEnhancedScan: () => void;
  onShowManualInput: () => void;
  continuousMode?: boolean;
  onToggleContinuous?: () => void;
}

const QRScannerControls: React.FC<QRScannerControlsProps> = ({
  isScanning,
  isEnhancedMode,
  onEnhancedScan,
  onShowManualInput,
  continuousMode = true,
  onToggleContinuous
}) => {
  return (
    <div className="absolute bottom-20 left-0 right-0 z-50 p-4">
      <div className="flex justify-center space-x-4">
        <button
          onClick={onShowManualInput}
          className="bg-white/20 backdrop-blur-sm text-white rounded-full p-3 hover:bg-white/30 transition-colors"
          title="Manual input"
        >
          <Edit3 className="w-5 h-5" />
        </button>

        {isScanning && (
          <button
            onClick={onEnhancedScan}
            disabled={isEnhancedMode}
            className={`backdrop-blur-sm text-white rounded-full p-3 transition-colors ${
              isEnhancedMode 
                ? 'bg-orange-500/50 cursor-not-allowed' 
                : 'bg-orange-500/80 hover:bg-orange-500'
            }`}
            title="AI Enhanced scan"
          >
            <Zap className="w-5 h-5" />
          </button>
        )}

        {onToggleContinuous && (
          <button
            onClick={onToggleContinuous}
            className={`backdrop-blur-sm text-white rounded-full p-3 transition-colors ${
              continuousMode 
                ? 'bg-green-500/80 hover:bg-green-500' 
                : 'bg-gray-500/80 hover:bg-gray-500'
            }`}
            title={continuousMode ? 'Continuous mode: ON' : 'Single scan mode'}
          >
            {continuousMode ? <RotateCcw className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="text-center mt-3">
        <p className="text-white/80 text-sm">
          {continuousMode ? 'Continuous scanning enabled' : 'Single scan mode'}
        </p>
      </div>
    </div>
  );
};

export default QRScannerControls;
