
import React from 'react';
import { Button } from '../ui/button';
import { QrCode, Loader2 } from 'lucide-react';

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
  const isPhoneValid = validatePhone ? validatePhone(phone) : phone.length >= 4;
  const isAmountValid = validateAmount ? validateAmount(amount) : parseFloat(amount) >= 100;
  const isFormValid = isPhoneValid && isAmountValid && phone && amount;

  return (
    <Button
      onClick={onGenerate}
      disabled={isGenerating || !isFormValid}
      className={`
        w-full h-16 text-xl font-bold rounded-xl
        transition-all duration-300 ease-in-out
        mobile-button tap-highlight-transparent
        min-h-[64px] flex items-center justify-center gap-3
        ${isFormValid 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]' 
          : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
        }
        ${isGenerating ? 'animate-pulse' : ''}
      `}
      style={{ minHeight: '64px' }}
      aria-label={isGenerating ? 'Generating QR code' : 'Generate QR code'}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <QrCode className="w-6 h-6" />
          <span>Generate QR Code</span>
        </>
      )}
    </Button>
  );
};

export default GenerateButton;
