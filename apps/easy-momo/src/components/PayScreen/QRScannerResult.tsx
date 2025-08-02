
import React from 'react';
import { ScanResult } from '@/services/scanningManager';

interface QRScannerResultProps {
  scannedCode: string;
  scanResult: ScanResult | null;
  error: string | null;
  onLaunchMoMo: () => void;
}

const QRScannerResult: React.FC<QRScannerResultProps> = ({
  scannedCode,
  scanResult,
  error,
  onLaunchMoMo
}) => {
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="bg-green-500/20 rounded-2xl p-6 mb-6 border border-green-500/30">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-white text-xl font-bold mb-2">
          {scanResult?.method === 'ai' && '🤖 AI-Enhanced '}
          {scanResult?.method === 'enhanced' && '⚡ Enhanced '}
          QR Code Scanned!
        </h2>
        <p className="text-green-300 text-sm">Ready to launch MoMo payment</p>
        {scanResult && (
          <div className="mt-2 text-xs text-gray-400">
            Method: {scanResult.method} | Confidence: {Math.round(scanResult.confidence * 100)}%
            {scanResult.processingTime > 0 && ` | ${scanResult.processingTime}ms`}
          </div>
        )}
      </div>

      <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
        <p className="text-gray-300 text-sm mb-2">Scanned Code:</p>
        <p className="text-white font-mono text-sm break-all bg-black/30 p-2 rounded">
          {scannedCode}
        </p>
      </div>

      <button
        onClick={onLaunchMoMo}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
        style={{ minHeight: '48px' }}
      >
        Launch MoMo Payment
      </button>

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default QRScannerResult;
