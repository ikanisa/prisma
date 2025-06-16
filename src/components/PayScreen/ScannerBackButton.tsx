
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

interface ScannerBackButtonProps {
  onBack?: () => void;
}

const ScannerBackButton: React.FC<ScannerBackButtonProps> = ({ onBack }) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback to browser back
      window.history.back();
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant="ghost"
      size="sm"
      className="absolute top-4 left-4 z-50 text-white hover:bg-white/20 rounded-full p-3"
      aria-label="Go back"
    >
      <ArrowLeft className="w-6 h-6" />
    </Button>
  );
};

export default ScannerBackButton;
