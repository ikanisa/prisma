
import React from 'react';
import { RotateCcw, Globe, Phone, Info, Lightbulb, Wifi } from 'lucide-react';
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
      <div className="bg-white/10 rounded-lg p-4 mb-4 backdrop-blur-sm">
        <p className="text-white text-sm mb-2">Scanned Code:</p>
        <p className="text-blue-300 font-mono text-lg break-all">
          {ussdValidation.sanitized}
        </p>
      </div>

      {/* Network Context */}
      {ussdValidation.networkContext && ussdValidation.networkContext.country && (
        <div className="bg-blue-500/10 rounded-lg p-3 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-300 mb-2">
            <Wifi className="w-4 h-4" />
            <span>Network Detected</span>
          </div>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-300">
            <span>{ussdValidation.networkContext.country}</span>
            {ussdValidation.networkContext.provider && (
              <span>• {ussdValidation.networkContext.provider}</span>
            )}
            <span>• {Math.round(ussdValidation.networkContext.confidence * 100)}% confidence</span>
          </div>
        </div>
      )}

      {/* AI Suggestions for Invalid Codes */}
      {!ussdValidation.isValid && ussdValidation.aiSuggestion && (
        <div className="bg-orange-500/10 rounded-lg p-3 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2 text-sm text-orange-300 mb-2">
            <Lightbulb className="w-4 h-4" />
            <span>AI Suggestion</span>
          </div>
          <p className="text-orange-200 font-mono text-sm mb-2">
            {ussdValidation.aiSuggestion}
          </p>
          <Button
            onClick={() => window.location.href = `tel:${encodeURIComponent(ussdValidation.aiSuggestion!)}`}
            variant="outline"
            size="sm"
            className="border-orange-400/40 text-orange-100 hover:bg-orange-500/20"
          >
            Try Suggested Format
          </Button>
        </div>
      )}

      {/* Alternative Formats */}
      {ussdValidation.alternativeFormats && ussdValidation.alternativeFormats.length > 0 && (
        <div className="bg-purple-500/10 rounded-lg p-3 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-2 text-sm text-purple-300 mb-2">
            <Info className="w-4 h-4" />
            <span>Alternative Formats</span>
          </div>
          <div className="space-y-1">
            {ussdValidation.alternativeFormats.slice(0, 2).map((format, index) => (
              <p key={index} className="text-purple-200 font-mono text-xs">
                {format}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Provider Information */}
      {ussdValidation.isValid && ussdValidation.country !== 'Unknown' && (
        <div className="bg-white/5 rounded-lg p-3 mb-4 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
            <div className="flex items-center space-x-1">
              <Globe className="w-4 h-4" />
              <span>{ussdValidation.country}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="w-4 h-4" />
              <span>{ussdValidation.provider}</span>
            </div>
          </div>
          {ussdValidation.pattern && (
            <div className="flex items-center justify-center space-x-1 mt-2 text-xs text-gray-400">
              <Info className="w-3 h-3" />
              <span>{ussdValidation.pattern.description}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {ussdValidation.isValid ? (
          <Button
            onClick={onLaunchUssd}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
          >
            Launch Payment Dialer
          </Button>
        ) : (
          <Button
            onClick={() => window.location.href = `tel:${encodeURIComponent(ussdValidation.sanitized)}`}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-lg py-3"
          >
            Try Launch Anyway
          </Button>
        )}
        
        <Button
          onClick={onRescan}
          variant="outline"
          className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Scan Another Code
        </Button>
      </div>
    </div>
  );
};

export default UniversalQRScannerResult;
