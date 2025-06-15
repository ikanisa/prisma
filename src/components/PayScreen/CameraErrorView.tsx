
import React from 'react';

interface CameraErrorViewProps {
  onSimulateScan: () => void;
}

const CameraErrorView: React.FC<CameraErrorViewProps> = ({ onSimulateScan }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-white text-center p-6 sm:p-8 bg-gray-900">
      <div className="text-[88px] mb-3 select-none animate-bounce">🦄</div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Whoops! No Camera Found</h2>
      <p className="text-blue-100 mb-7 text-base max-w-xs sm:max-w-md">
        Looks like your device can’t access the camera.<br />
        Try switching devices, or just preview scan using the button below!
      </p>
      <button
        onClick={onSimulateScan}
        className="btn-primary text-base px-8 py-4"
      >
        🎉 Show Demo Scan
      </button>
    </div>
  );
};
export default CameraErrorView;
