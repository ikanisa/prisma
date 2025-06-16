
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
  // Enhanced validation with proper Rwanda MoMo rules and 5M RWF limit
  const phoneValid = validatePhone ? validatePhone(phone) : phone.trim().length >= 4;
  const amountValid = validateAmount ? validateAmount(amount) : amount.trim() !== '' && parseFloat(amount.replace(/\s/g, '')) > 0 && parseFloat(amount.replace(/\s/g, '')) <= 5000000 // Updated to 5M RWF
  ;
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

  // Get validation status message
  const getValidationMessage = () => {
    if (!phone.trim() && !amount.trim()) {
      return "Enter phone number and amount";
    }
    if (!phoneValid && !amountValid) {
      return "Invalid phone number and amount";
    }
    if (!phoneValid) {
      return "Enter valid phone number or pay code";
    }
    if (!amountValid) {
      return "Enter valid amount (max 5,000,000 RWF)"; // Updated message
    }
    return "Ready to generate QR code";
  };
  return <div className="space-y-3">
      <Button onClick={handleClick} disabled={isDisabled} className={`
          w-full h-16 text-lg font-bold rounded-2xl
          transition-all duration-300 ease-in-out
          mobile-button touch-action-manipulation
          transform-gpu border-0
          ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400 shadow-none' : `
              bg-gradient-to-r from-[#00A5E1] via-[#FAD300] to-[#1A603A] 
              hover:from-[#0090C7] hover:via-[#E6BF00] hover:to-[#145030] 
              active:from-[#007BB0] active:via-[#D4AA00] active:to-[#0F4025]
              text-white shadow-xl hover:shadow-2xl 
              hover:scale-[1.02] active:scale-[0.98]
              ring-4 ring-[#00A5E1]/20 hover:ring-[#00A5E1]/30
            `}
        `} type="button" style={{
      minHeight: '64px'
    }} // Ensure large touch target
    >
        {isGenerating ? <div className="flex items-center justify-center gap-3 animate-fade-in">
            <LoadingSpinner />
            <span className="animate-pulse">Generating QR Code...</span>
          </div> : <div className="flex items-center justify-center gap-3">
            <QrCode className="w-7 h-7" />
            <span className="text-sm">Generate Payment QR</span>
          </div>}
      </Button>

      {/* Validation Status Indicator */}
      <div className="text-center">
        <span className={`
          text-sm font-medium transition-colors duration-200
          ${isDisabled ? 'text-gray-500 dark:text-gray-400' : 'text-green-600 dark:text-green-400'}
        `}>
          {getValidationMessage()}
        </span>
      </div>
    </div>;
};
export default GenerateButton;
