
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Camera } from 'lucide-react';

interface CameraErrorViewProps {
  onSimulateScan: () => void;
  onRetryCamera?: () => void;
  errorMessage?: string;
}

const CameraErrorView: React.FC<CameraErrorViewProps> = ({ 
  onSimulateScan, 
  onRetryCamera,
  errorMessage 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center p-6 sm:p-8 bg-gray-900 rounded-2xl">
      <div className="text-6xl mb-6 animate-bounce">
        <Camera className="w-16 h-16 mx-auto text-gray-400" />
      </div>
      
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Camera Access Issue</h2>
      
      <p className="text-blue-100 mb-6 text-base max-w-xs sm:max-w-md">
        {errorMessage || "Unable to access camera. This could be due to permissions or device compatibility."}
      </p>
      
      <div className="space-y-3 w-full max-w-sm">
        {onRetryCamera && (
          <Button
            onClick={onRetryCamera}
            variant="outline"
            className="w-full border-blue-400/40 text-blue-100 hover:bg-blue-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Camera Again
          </Button>
        )}
        
        <Button
          onClick={onSimulateScan}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          🎉 Show Demo Scan
        </Button>
      </div>
      
      <div className="mt-6 text-xs text-gray-400 max-w-sm">
        <p>• Check camera permissions in browser settings</p>
        <p>• Ensure camera is not being used by another app</p>
        <p>• Try refreshing the page</p>
      </div>
    </div>
  );
};

export default CameraErrorView;
