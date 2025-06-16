
import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Zap, Phone, Keyboard } from 'lucide-react';

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerStatusDisplayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  isProcessingWithAI?: boolean;
  onRetry: () => void;
  onProcessWithAI?: () => void;
  onUSSDLaunch: () => void;
  onShowManualInput?: () => void;
  reduceAnimations?: boolean;
}

const ScannerStatusDisplay: React.FC<ScannerStatusDisplayProps> = ({
  scanStatus,
  scanResult,
  isProcessingWithAI = false,
  onRetry,
  onProcessWithAI,
  onUSSDLaunch,
  onShowManualInput,
  reduceAnimations = false
}) => {
  if (scanStatus === "success" && scanResult) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <div className={`glass-panel p-4 rounded-xl border-green-400/40 bg-green-500/20 shadow-green-400/20 ${
          reduceAnimations ? '' : 'animate-fade-in'
        }`}>
          <div className="text-center space-y-3">
            <div className="text-green-100 font-semibold">
              ✅ QR Code Scanned Successfully!
            </div>
            <div className="text-green-200 text-sm break-all">
              {scanResult}
            </div>
            <Button 
              onClick={onUSSDLaunch}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="w-4 h-4 mr-2" />
              Launch Payment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (scanStatus === "processing" || isProcessingWithAI) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <div className={`glass-panel p-4 rounded-xl border-blue-400/40 bg-blue-500/20 shadow-blue-400/20 ${
          reduceAnimations ? '' : 'animate-pulse'
        }`}>
          <div className="text-center space-y-3">
            <div className="text-blue-100 font-semibold">
              🤖 Processing with AI...
            </div>
            <div className="text-blue-200 text-sm">
              Analyzing image for QR code detection
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scanStatus === "fail") {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <div className={`glass-panel p-4 rounded-xl border-red-400/40 bg-red-500/20 shadow-red-400/20 ${
          reduceAnimations ? '' : 'animate-fade-in'
        }`}>
          <div className="text-center space-y-3">
            <div className="text-red-100 font-semibold">
              ❌ Scan Failed
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button 
                  onClick={onRetry}
                  variant="outline"
                  className="flex-1 border-red-400/40 text-red-100 hover:bg-red-500/20"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                {onProcessWithAI && (
                  <Button 
                    onClick={onProcessWithAI}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    AI Process
                  </Button>
                )}
              </div>
              {onShowManualInput && (
                <Button 
                  onClick={onShowManualInput}
                  variant="outline"
                  className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Enter QR Manually
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ScannerStatusDisplay;
