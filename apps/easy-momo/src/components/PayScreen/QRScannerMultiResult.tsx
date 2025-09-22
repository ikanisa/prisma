
import React from 'react';
import { Clock, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanResult } from '@/services/scanningManager';

interface ScannedCodeData {
  code: string;
  result: ScanResult;
  timestamp: number;
  transaction?: any;
}

interface QRScannerMultiResultProps {
  scannedCodes: ScannedCodeData[];
  onLaunchMoMo: (scanData: ScannedCodeData) => void;
  isScanning: boolean;
  error: string | null;
}

const QRScannerMultiResult: React.FC<QRScannerMultiResultProps> = ({
  scannedCodes,
  onLaunchMoMo,
  isScanning,
  error
}) => {
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-black/90 backdrop-blur-sm border-t border-gray-700 ${isScanning ? 'max-h-64' : 'flex-1'} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Scanned Codes ({scannedCodes.length})
          </h3>
          {isScanning && (
            <span className="text-green-400 text-sm animate-pulse">
              • Continue scanning
            </span>
          )}
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto">
          {scannedCodes.map((scan, index) => (
            <div
              key={`${scan.code}-${scan.timestamp}`}
              className={`bg-white/10 rounded-lg p-3 border-l-4 ${
                index === 0 ? 'border-green-500' : 'border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-gray-400 text-xs">
                      {formatTimeAgo(scan.timestamp)}
                    </span>
                    {scan.result.method && (
                      <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded">
                        {scan.result.method}
                      </span>
                    )}
                    <span className={`text-xs ${getConfidenceColor(scan.result.confidence || 0)}`}>
                      {Math.round((scan.result.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-white text-sm font-mono break-all mb-2">
                    {scan.code}
                  </p>
                </div>
                <Button
                  onClick={() => onLaunchMoMo(scan)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white ml-2 flex-shrink-0"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Pay
                </Button>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {scannedCodes.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No codes scanned yet</p>
            <p className="text-sm">Point camera at QR codes to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScannerMultiResult;
