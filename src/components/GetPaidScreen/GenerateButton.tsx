
import React from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '../ui/button';
import LoadingSpinner from '../LoadingSpinner';

interface GenerateButtonProps {
  onGenerate: () => void;
  isGenerating: boolean;
  phone: string;
  amount: string;
  validatePhone?: (phone: string) => boolean;
  validateAmount?: (amount: string) => boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({
  onGenerate,
  isGenerating,
  phone,
  amount,
  validatePhone,
  validateAmount
}) => {
  // Enhanced validation with proper Rwanda MoMo rules
  const phoneValid = validatePhone ? validatePhone(phone) : phone.trim().length >= 4;
  const amountValid = validateAmount ? validateAmount(amount) : (
    amount.trim() !== '' && 
    parseFloat(amount.replace(/\s/g, '')) > 0 && 
    parseFloat(amount.replace(/\s/g, '')) <= 10000000
  );
  
  const isDisabled = isGenerating || !phoneValid || !amountValid;

  // Add haptic feedback for mobile
  const handleClick = () => {
    if (!isDisabled) {
      if ('vibrate' in navigator) {
        navigator.vibrate(20); // Slightly stronger feedback for button tap
      }
      onGenerate();
    }
  };

  return (
    <Button 
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        w-full h-14 text-lg font-semibold rounded-xl
        transition-all duration-300 ease-in-out
        mobile-button touch-action-manipulation
        transform-gpu
        ${isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
          : `
            bg-gradient-to-r from-blue-600 to-yellow-500 
            hover:from-blue-700 hover:to-yellow-600 
            active:from-blue-800 active:to-yellow-700
            text-white shadow-lg hover:shadow-xl 
            hover:scale-[1.02] active:scale-[0.98]
            dark:from-blue-500 dark:to-yellow-400
            dark:hover:from-blue-600 dark:hover:to-yellow-500
          `
        }
      `}
      type="button"
      style={{ minHeight: '56px' }} // Ensure 48px+ touch target
    >
      {isGenerating ? (
        <div className="flex items-center justify-center gap-3 animate-fade-in">
          <LoadingSpinner />
          <span className="animate-pulse">Generating QR Code...</span>
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
