
import React from 'react';
import { Camera } from 'lucide-react';

interface CameraErrorViewProps {
  onSimulateScan: () => void;
}

const CameraErrorView: React.FC<CameraErrorViewProps> = ({ onSimulateScan }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center p-6 sm:p-8 bg-gray-900">
      <Camera className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 text-gray-400" />
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Camera Not Available</h2>
      <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base max-w-xs sm:max-w-md">
        Please allow camera access or try on a different device
      </p>
      <button
        onClick={onSimulateScan}
        className="btn-primary text-sm sm:text-base px-6 py-3 sm:px-8 sm:py-4"
      >
        Simulate QR Scan (Demo)
      </button>
    </div>
  );
};

export default CameraErrorView;
