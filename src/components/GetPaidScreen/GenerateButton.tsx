
import React from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '../ui/button';
import LoadingSpinner from '../LoadingSpinner';

interface GenerateButtonProps {
  onGenerate: () => void;
  isGenerating: boolean;
  phone: string;
  amount: string;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  onGenerate,
  isGenerating,
  phone,
  amount
}) => {
  // Validate inputs
  const phoneValid = phone.trim().length >= 4; // Minimum reasonable length
  const amountValid = amount.trim() !== '' && parseFloat(amount) > 0;
  const isDisabled = isGenerating || !phoneValid || !amountValid;

  return (
    <Button 
      onClick={onGenerate}
      disabled={isDisabled}
      className={`
        w-full h-14 text-lg font-semibold rounded-xl
        transition-all duration-200 ease-in-out
        mobile-button touch-action-manipulation
        ${isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-yellow-500 hover:from-blue-700 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl active:scale-95'
        }
      `}
      type="button"
    >
      {isGenerating ? (
        <div className="flex items-center justify-center gap-3 animate-fade-in">
          <LoadingSpinner />
          <span>Generating QR Code...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <QrCode className="w-6 h-6" />
          <span>Generate Payment QR</span>
        </div>
      )}
    </Button>
  );
};

export default GenerateButton;
