import React from 'react';
interface USSDButtonProps {
  scannedData: string;
  onLaunchUSSD: () => void;
}
const USSDButton: React.FC<USSDButtonProps> = ({
  scannedData,
  onLaunchUSSD
}) => {
  return <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent safe-area-bottom z-30">
      <div className="glass-card p-4 sm:p-6 text-center max-w-md mx-auto">
        <p className="text-white text-xs sm:text-sm mb-3 sm:mb-4">Scanned Payment Code:</p>
        <button onClick={onLaunchUSSD} className="w-full bg-electric-ocean text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl sm:text-xl font-bold break-all text-base">
          {scannedData}
        </button>
        <p className="text-gray-300 text-xs sm:text-sm mt-2 sm:mt-3">
          Tap to copy and dial this code
        </p>
      </div>
    </div>;
};
export default USSDButton;