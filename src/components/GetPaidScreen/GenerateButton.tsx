
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
  const isDisabled = isGenerating || !phone.trim() || !amount.trim();

  return (
    <Button 
      onClick={onGenerate}
      disabled={isDisabled}
      className={`
        w-full h-14 text-lg font-semibold rounded-xl
        transition-all duration-200 ease-in-out
        ${isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl active:scale-95'
        }
      `}
      type="button"
    >
      {isGenerating ? (
        <div className="flex items-center justify-center gap-3">
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
