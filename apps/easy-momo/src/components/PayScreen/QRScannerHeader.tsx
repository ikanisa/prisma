
import React from 'react';
import { ArrowLeft, RotateCcw, Square, Play, Trash2 } from 'lucide-react';
import { ScanResult } from '@/services/scanningManager';

interface QRScannerHeaderProps {
  onBack: () => void;
  onRescan: () => void;
  isScanning: boolean;
  isOnline: boolean;
  scanResult: ScanResult | null;
  scannedCount?: number;
  continuousMode?: boolean;
  onToggleContinuous?: () => void;
  onStopScanning?: () => void;
  onClearHistory?: () => void;
}

const QRScannerHeader: React.FC<QRScannerHeaderProps> = ({
  onBack,
  onRescan,
  isScanning,
  isOnline,
  scanResult,
  scannedCount = 0,
  continuousMode = true,
  onToggleContinuous,
  onStopScanning,
  onClearHistory
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-60 bg-gradient-to-b from-black/90 to-transparent p-4 safe-area-top">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white hover:bg-white/20 rounded-lg px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>

        <div className="text-center">
          <h2 className="text-white font-semibold">Universal QR Scanner</h2>
          <div className="flex items-center justify-center space-x-2 text-sm">
            {!isOnline && (
              <span className="text-red-300">Offline</span>
            )}
            {scannedCount > 0 && (
              <span className="text-green-300">{scannedCount} scanned</span>
            )}
            <span className={`${isScanning ? 'text-green-300' : 'text-gray-300'}`}>
              {isScanning ? (continuousMode ? 'Continuous' : 'Active') : 'Stopped'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {scannedCount > 0 && onClearHistory && (
            <button
              onClick={onClearHistory}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              title="Clear scan history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          {isScanning ? (
            <button
              onClick={onStopScanning}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              title="Stop scanning"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRescan}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              title="Resume scanning"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={onRescan}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            title="Restart scanner"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerHeader;
