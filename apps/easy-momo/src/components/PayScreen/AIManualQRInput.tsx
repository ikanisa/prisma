
import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { validateQRContent, suggestQRFixes, QRValidationResult } from '@/utils/qrValidation';
import { aiQRProcessingService } from '@/services/aiQRProcessingService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface AIManualQRInputProps {
  onClose: () => void;
  onCodeSubmit: (code: string) => void;
  lastScannedImage?: HTMLCanvasElement;
}

const AIManualQRInput: React.FC<AIManualQRInputProps> = ({ 
  onClose, 
  onCodeSubmit, 
  lastScannedImage 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [validation, setValidation] = useState<QRValidationResult | null>(null);
  const [isProcessingWithAI, setIsProcessingWithAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { trackUserAction } = usePerformanceMonitoring('AIManualQRInput');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (inputValue.trim()) {
      const result = validateQRContent(inputValue);
      setValidation(result);
      trackUserAction('manual_validation', { 
        isValid: result.isValid, 
        type: result.type,
        confidence: result.confidence 
      });
    } else {
      setValidation(null);
    }
  }, [inputValue, trackUserAction]);

  const handleAIAssist = async () => {
    if (!lastScannedImage) return;

    setIsProcessingWithAI(true);
    trackUserAction('ai_assist_requested');

    try {
      const result = await aiQRProcessingService.processQRWithAI(lastScannedImage);
      
      if (result.success && result.ussdCode) {
        setAiSuggestion(result.ussdCode);
        setInputValue(result.ussdCode);
        trackUserAction('ai_assist_success', { confidence: result.confidence });
      } else {
        trackUserAction('ai_assist_failed');
      }
    } catch (error) {
      console.error('AI assist failed:', error);
      trackUserAction('ai_assist_error');
    } finally {
      setIsProcessingWithAI(false);
    }
  };

  const handleSubmit = () => {
    if (validation?.isValid && inputValue.trim()) {
      trackUserAction('manual_submit', { 
        type: validation.type,
        confidence: validation.confidence 
      });
      onCodeSubmit(inputValue.trim());
      onClose();
    }
  };

  const getValidationIcon = () => {
    if (!validation) return null;
    
    if (validation.isValid) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getValidationColor = () => {
    if (!validation) return 'border-gray-600';
    return validation.isValid ? 'border-green-500' : 'border-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">Enter QR Code Manually</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Assist Button */}
        {lastScannedImage && (
          <div className="mb-4">
            <button
              onClick={handleAIAssist}
              disabled={isProcessingWithAI}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-3 px-4 rounded-lg transition-colors"
            >
              {isProcessingWithAI ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get AI Suggestion
                </>
              )}
            </button>
          </div>
        )}

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
            <p className="text-purple-300 text-sm mb-2">AI Suggestion:</p>
            <p className="text-white font-mono text-sm break-all">{aiSuggestion}</p>
          </div>
        )}

        {/* Input Field */}
        <div className="mb-4">
          <div className={`relative border-2 ${getValidationColor()} rounded-lg`}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter USSD code or payment details..."
              className="w-full bg-gray-800 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
        </div>

        {/* Validation Feedback */}
        {validation && (
          <div className="mb-4">
            {validation.isValid ? (
              <div className="text-green-400 text-sm">
                ✓ Valid {validation.type} format (confidence: {Math.round(validation.confidence * 100)}%)
                {validation.extractedData && (
                  <div className="mt-1 text-xs text-gray-400">
                    {validation.extractedData.phone && `Phone: ${validation.extractedData.phone}`}
                    {validation.extractedData.amount && ` | Amount: ${validation.extractedData.amount}`}
                    {validation.extractedData.code && ` | Code: ${validation.extractedData.code}`}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                {validation.errors?.map((error, index) => (
                  <div key={index}>⚠ {error}</div>
                ))}
                {inputValue && (
                  <div className="mt-2">
                    <p className="text-yellow-400 text-xs">Suggestions:</p>
                    {suggestQRFixes(inputValue).map((suggestion, index) => (
                      <div key={index} className="text-yellow-300 text-xs">• {suggestion}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Example Format */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-xs mb-1">Example formats:</p>
          <p className="text-gray-300 text-xs font-mono">*182*1*1*0789123456*2500#</p>
          <p className="text-gray-300 text-xs font-mono">*182*8*1*12345*1000#</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validation?.isValid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
          >
            Use This Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIManualQRInput;
