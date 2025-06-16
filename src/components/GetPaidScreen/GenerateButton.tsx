
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
  const amountValid = validateAmount ? validateAmount(amount) : 
    amount.trim() !== '' && 
    parseFloat(amount.replace(/\s/g, '')) > 0 && 
    parseFloat(amount.replace(/\s/g, '')) <= 5000000; // Updated to 5M RWF

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

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="relative group">
        {/* Liquid glass background with animated gradient */}
        <div className={`
          absolute inset-0 rounded-2xl transition-all duration-500 ease-out
          ${isDisabled ? 
            'bg-gray-300 dark:bg-gray-700' : 
            'liquid-glass-panel bg-gradient-to-r from-[#00A5E1]/80 via-[#FAD300]/80 to-[#1A603A]/80 group-hover:from-[#0090C7]/90 group-hover:via-[#E6BF00]/90 group-hover:to-[#145030]/90'
          }
        `} />
        
        {/* Animated liquid flow overlay */}
        {!isDisabled && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className={`
              absolute inset-0 opacity-30 transition-opacity duration-700
              bg-gradient-to-r from-transparent via-white/20 to-transparent
              animate-[shimmer_3s_ease-in-out_infinite]
              ${isGenerating ? 'opacity-60' : 'group-hover:opacity-50'}
            `} 
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
              transform: 'translateX(-100%)',
              animation: isGenerating ? 'shimmer 1.5s ease-in-out infinite' : 'none'
            }} />
          </div>
        )}
        
        <Button
          onClick={handleClick}
          disabled={isDisabled}
          className={`
            relative w-full h-16 text-lg font-bold rounded-2xl
            transition-all duration-500 ease-out
            mobile-button touch-action-manipulation
            transform-gpu border-0 backdrop-blur-lg
            ${isDisabled ? 
              'bg-transparent text-gray-500 cursor-not-allowed dark:text-gray-400 shadow-none' : 
              `bg-transparent text-white shadow-2xl 
               hover:shadow-[0_20px_40px_rgba(0,165,225,0.4)]
               hover:scale-[1.02] active:scale-[0.98]
               ring-2 ring-white/20 hover:ring-white/40
               group-hover:backdrop-blur-xl`
            }
          `}
          type="button"
          style={{ minHeight: '64px' }}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-3 animate-fade-in">
              <LoadingSpinner />
              <span className="animate-pulse">Generating QR Code...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 relative z-10">
              <QrCode className="w-7 h-7 drop-shadow-lg" />
              <span className="text-lg drop-shadow-lg">Generate Payment QR</span>
            </div>
          )}
        </Button>
      </div>

      {/* Validation Status Indicator with liquid glass effect */}
      <div className="text-center">
        <div className={`
          inline-block px-4 py-2 rounded-xl transition-all duration-300
          ${isDisabled ? 
            'glass-panel bg-red-50/50 dark:bg-red-900/20' : 
            'liquid-glass-panel bg-green-50/50 dark:bg-green-900/20'
          }
        `}>
          <span className={`
            text-sm font-medium transition-colors duration-200
            ${isDisabled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
          `}>
            {getValidationMessage()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GenerateButton;
