
import React from 'react';

const SimpleQRScannerInstructions: React.FC = () => {
  return (
    <div className="mt-8 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
      <p className="text-white text-sm font-medium mb-2">Scanning Tips:</p>
      <ul className="text-gray-300 text-xs space-y-1">
        <li>• Hold phone steady</li>
        <li>• Ensure good lighting</li>
        <li>• Clean camera lens</li>
        <li>• Use flashlight if needed</li>
      </ul>
    </div>
  );
};

export default SimpleQRScannerInstructions;
