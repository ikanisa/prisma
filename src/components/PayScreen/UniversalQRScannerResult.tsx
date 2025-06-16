import React from 'react';
import { Copy, RefreshCw, X, ExternalLink } from 'lucide-react';
import { ScanResult } from '@/services/QRScannerService';
import { AIValidationResult } from '@/services/aiUssdValidationService';
import { encodeUssdForTel } from '@/utils/ussdValidation';
import { toast } from '@/hooks/use-toast';
interface UniversalQRScannerResultProps {
  scannedResult: ScanResult;
  ussdValidation: AIValidationResult;
  onLaunchUssd: () => void;
  onRescan: () => void;
  onClose: () => void;
}
const UniversalQRScannerResult: React.FC<UniversalQRScannerResultProps> = ({
  scannedResult,
  ussdValidation,
  onLaunchUssd,
  onRescan,
  onClose
}) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "USSD code copied to clipboard"
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  const getProviderInfo = () => {
    if (ussdValidation.country && ussdValidation.provider) {
      return `${ussdValidation.provider} ${ussdValidation.country}`;
    }
    return 'Mobile Money Payment';
  };
  const getStatusColor = () => {
    if (!ussdValidation.isValid) return 'text-red-400';
    if (ussdValidation.confidence && ussdValidation.confidence > 0.8) return 'text-green-400';
    return 'text-yellow-400';
  };
  return <div className="w-full max-w-md mx-auto p-4 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white">Scan Result</h2>
        <button onClick={onRescan} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Success Card */}
      <div className="bg-green-600/20 border border-green-500/30 rounded-2xl p-4 mb-4 text-center">
        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`text-xl font-bold mb-2 ${getStatusColor()}`}>
          {ussdValidation.isValid ? 'USSD Code Detected' : 'Code Scanned'}
        </h3>
        <p className="text-green-300 text-sm">{getProviderInfo()}</p>
      </div>

      {/* Scanned Code Display */}
      <div className="bg-white/10 rounded-lg p-3 mb-4 backdrop-blur-sm">
        <p className="text-gray-300 text-sm mb-2 text-center">Scanned Code:</p>
        <p className="text-blue-300 font-mono text-base text-center break-all font-bold">
          {scannedResult.ussdCode || scannedResult.code}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Launch Button */}
        <button onClick={onLaunchUssd} disabled={!ussdValidation.isValid} className={`
            w-full font-bold py-4 px-6 rounded-xl transition-all duration-200 text-xl shadow-lg 
            flex items-center justify-center space-x-2
            ${ussdValidation.isValid ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}
          `} style={{
        minHeight: '64px'
      }}>
          <ExternalLink className="w-6 h-6" />
          <span>{ussdValidation.isValid ? 'Launch Payment' : 'Invalid Code'}</span>
        </button>

        {/* Copy Button */}
        <button onClick={() => copyToClipboard(scannedResult.ussdCode || scannedResult.code)} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl text-base font-semibold transition-colors duration-200 flex items-center justify-center space-x-2">
          <Copy className="w-5 h-5" />
          <span>Copy Code</span>
        </button>

        {/* Rescan Button */}
        <button onClick={onRescan} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-base font-semibold transition-colors duration-200 flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5" />
          <span>Scan Another</span>
        </button>
      </div>

      {/* AI Suggestions */}
      {ussdValidation.aiSuggestion && <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm font-semibold mb-1">AI Suggestion:</p>
          <p className="text-yellow-100 text-xs">{ussdValidation.aiSuggestion}</p>
        </div>}
    </div>;
};
export default UniversalQRScannerResult;
