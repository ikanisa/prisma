
import React from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

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
  // Phone is required, amount is optional
  const isPhoneValid = validatePhone ? validatePhone(phone) : phone.length >= 4;
  const isAmountValid = !amount || (validateAmount ? validateAmount(amount) : parseFloat(amount) >= 100);
  
  const canGenerate = isPhoneValid && isAmountValid && !isGenerating;

  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (!amount) return 'Generate Payment Request';
    return 'Generate QR Code';
  };

  const getButtonDescription = () => {
    if (!isPhoneValid) return 'Enter a valid phone number or code';
    if (amount && !isAmountValid) return 'Enter a valid amount (min 100 RWF)';
    if (!amount) return 'Creates a payment request where the payer enters the amount';
    return 'Creates a QR code for the specified amount';
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`
          w-full h-16 text-lg font-bold rounded-xl
          transition-all duration-300 ease-in-out
          mobile-button tap-highlight-transparent
          ${canGenerate
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:from-blue-700 active:to-purple-800 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
          }
        `}
        style={{ minHeight: '64px' }}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>{getButtonText()}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <QrCode className="w-6 h-6" />
            <span>{getButtonText()}</span>
          </div>
        )}
      </Button>
      
      <p className="text-xs text-center text-gray-600 dark:text-gray-400 px-2">
        {getButtonDescription()}
      </p>
    </div>
  );
};

export default GenerateButton;
