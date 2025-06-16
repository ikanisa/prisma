
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Keyboard, QrCode, Check, X } from 'lucide-react';
import { validateUSSDFormat } from '@/utils/ussdHelper';
import { toast } from '@/hooks/use-toast';

interface ManualQRInputProps {
  onQRSubmit: (qrData: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

const ManualQRInput: React.FC<ManualQRInputProps> = ({
  onQRSubmit,
  onCancel,
  isVisible
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      toast({
        title: "Empty Input",
        description: "Please enter QR code data",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    
    // Validate the input
    const isValid = validateUSSDFormat(inputValue.trim());
    
    if (isValid) {
      toast({
        title: "QR Data Valid",
        description: "Processing your payment code...",
      });
      onQRSubmit(inputValue.trim());
    } else {
      toast({
        title: "Invalid QR Data",
        description: "This doesn't appear to be a valid Rwanda MoMo payment code",
        variant: "destructive"
      });
    }
    
    setIsValidating(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      toast({
        title: "Pasted",
        description: "QR data pasted from clipboard",
      });
    } catch (error) {
      toast({
        title: "Paste Failed",
        description: "Could not access clipboard. Please paste manually.",
        variant: "destructive"
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white/95 dark:bg-gray-900/95 border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-lg">Manual QR Input</CardTitle>
          <CardDescription>
            Can't scan? Enter or paste your QR code data manually
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="qr-input" className="text-sm font-medium">
              QR Code Data
            </label>
            <Textarea
              id="qr-input"
              placeholder="Paste or type your QR code data here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handlePaste}
              variant="outline"
              className="w-full"
              disabled={isValidating}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Paste from Clipboard
            </Button>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isValidating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {isValidating ? 'Validating...' : 'Submit'}
            </Button>
            
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isValidating}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center pt-2">
            Enter Rwanda MoMo USSD codes like *182*8*1*...# or QR data
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualQRInput;
