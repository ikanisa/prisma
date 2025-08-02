
import React from 'react';
import { AlertTriangle, RefreshCw, Camera, Wifi, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ErrorRecoveryModalProps {
  error: Error;
  onRetry: () => void;
  onManualInput: () => void;
  onClose: () => void;
  isVisible: boolean;
  retryCount?: number;
}

const ErrorRecoveryModal: React.FC<ErrorRecoveryModalProps> = ({
  error,
  onRetry,
  onManualInput,
  onClose,
  isVisible,
  retryCount = 0
}) => {
  if (!isVisible) return null;

  const getErrorType = (errorMessage: string) => {
    if (errorMessage.includes('camera') || errorMessage.includes('Camera')) {
      return 'camera';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('permission')) {
      return 'permission';
    }
    return 'general';
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'camera': return <Camera className="w-8 h-8 text-orange-500" />;
      case 'network': return <Wifi className="w-8 h-8 text-red-500" />;
      case 'permission': return <Settings className="w-8 h-8 text-yellow-500" />;
      default: return <AlertTriangle className="w-8 h-8 text-red-500" />;
    }
  };

  const getErrorTitle = (type: string) => {
    switch (type) {
      case 'camera': return 'Camera Access Issue';
      case 'network': return 'Connection Problem';
      case 'permission': return 'Permission Required';
      default: return 'Scanning Error';
    }
  };

  const getErrorSuggestions = (type: string) => {
    switch (type) {
      case 'camera':
        return [
          'Check if camera is being used by another app',
          'Try refreshing the page',
          'Ensure camera permissions are granted'
        ];
      case 'network':
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Use manual QR code input if available'
        ];
      case 'permission':
        return [
          'Click "Allow" when prompted for camera access',
          'Check browser settings for camera permissions',
          'Try refreshing the page and allow permissions'
        ];
      default:
        return [
          'Try scanning the QR code again',
          'Ensure good lighting conditions',
          'Move camera closer to the QR code'
        ];
    }
  };

  const errorType = getErrorType(error.message);
  const suggestions = getErrorSuggestions(errorType);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            {getErrorIcon(errorType)}
          </div>
          <CardTitle className="text-xl">
            {getErrorTitle(errorType)}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            {error.message}
          </p>

          {retryCount > 0 && (
            <div className="text-sm text-orange-600 text-center">
              Attempt {retryCount + 1} - We're working to resolve this issue
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Suggestions:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={onRetry}
              className="w-full"
              disabled={retryCount >= 3}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
            </Button>
            
            <Button 
              onClick={onManualInput}
              variant="outline"
              className="w-full"
            >
              Enter Code Manually
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorRecoveryModal;
