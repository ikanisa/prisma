
import React from 'react';
import { ArrowLeft, Flashlight } from 'lucide-react';

interface PayScreenHeaderProps {
  onBack: () => void;
  onToggleFlash: () => void;
  flashEnabled: boolean;
}

const PayScreenHeader: React.FC<PayScreenHeaderProps> = ({
  onBack,
  onToggleFlash,
  flashEnabled,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 safe-area-top">
      <button
        onClick={onBack}
        className="glass-card p-2 sm:p-3 text-white hover:scale-110 transition-transform"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" focusable="false" />
      </button>
      
      <h1 className="text-white text-lg sm:text-xl font-semibold">Scan to Pay</h1>
      
      <button
        onClick={onToggleFlash}
        className={`glass-card p-2 sm:p-3 transition-all ${flashEnabled ? 'bg-yellow-500/20' : ''}`}
        aria-label={flashEnabled ? "Disable flashlight" : "Enable flashlight"}
        aria-pressed={flashEnabled}
      >
        <Flashlight className={`w-5 h-5 sm:w-6 sm:h-6 ${flashEnabled ? 'text-yellow-400' : 'text-white'}`} aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
};

export default PayScreenHeader;
