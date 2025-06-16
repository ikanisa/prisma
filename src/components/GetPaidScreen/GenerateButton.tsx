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
  const amountValid = validateAmount ? validateAmount(amount) : amount.trim() !== '' && parseFloat(amount.replace(/\s/g, '')) > 0 && parseFloat(amount.replace(/\s/g, '')) <= 5000000; // Updated to 5M RWF

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
  return <div className="space-y-3 animate-fade-in">
      <div className="relative group">
        {/* Animated liquid glass background with dynamic gradients */}
        <div className={`
          absolute inset-0 rounded-2xl transition-all duration-500 ease-out overflow-hidden
          ${isDisabled ? 'bg-gray-300 dark:bg-gray-700' : 'liquid-glass-panel'}
        `}>
          {!isDisabled && <>
              {/* Primary animated gradient layer */}
              <div className="absolute inset-0 opacity-80 animate-[gradientFlow_8s_ease-in-out_infinite]" style={{
            background: 'linear-gradient(45deg, #00A5E1, #FAD300, #1A603A, #FF6B35, #9B59B6, #00A5E1)',
            backgroundSize: '300% 300%'
          }} />
              
              {/* Secondary flowing gradient overlay */}
              <div className="absolute inset-0 opacity-60 animate-[gradientFlow_12s_ease-in-out_infinite_reverse]" style={{
            background: 'linear-gradient(135deg, #E74C3C, #3498DB, #2ECC71, #F39C12, #9B59B6, #E74C3C)',
            backgroundSize: '400% 400%'
          }} />
              
              {/* Shimmer effect overlay */}
              <div className={`
                absolute inset-0 opacity-40 transition-opacity duration-700
                ${isGenerating ? 'animate-[shimmer_1s_linear_infinite]' : 'animate-[shimmer_4s_ease-in-out_infinite]'}
              `} style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
            backgroundSize: '200% 200%'
          }} />
              
              {/* Pulsing glow effect */}
              <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] opacity-30" style={{
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 70%)'
          }} />
            </>}
        </div>
        
        <Button onClick={handleClick} disabled={isDisabled} className={`
            relative w-full h-16 text-lg font-bold rounded-2xl z-10
            transition-all duration-500 ease-out
            mobile-button touch-action-manipulation
            transform-gpu border-0 backdrop-blur-lg
            ${isDisabled ? 'bg-transparent text-gray-500 cursor-not-allowed dark:text-gray-400 shadow-none' : `bg-transparent text-white shadow-2xl 
               hover:shadow-[0_20px_40px_rgba(0,165,225,0.4)]
               hover:scale-[1.02] active:scale-[0.98]
               ring-2 ring-white/30 hover:ring-white/50
               group-hover:backdrop-blur-xl`}
          `} type="button" style={{
        minHeight: '64px'
      }}>
          {isGenerating ? <div className="flex items-center justify-center gap-3 animate-fade-in">
              <LoadingSpinner />
              <span className="animate-pulse font-bold text-white drop-shadow-lg">Generating QR Code...</span>
            </div> : <div className="flex items-center justify-center gap-3 relative z-10">
              <QrCode className="w-7 h-7 drop-shadow-lg text-white" />
              <span className="font-bold text-white drop-shadow-lg text-base">Generate Payment QR</span>
            </div>}
        </Button>
      </div>

      {/* Validation Status Indicator with liquid glass effect */}
      <div className="text-center">
        
      </div>
    </div>;
};
export default GenerateButton;