import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRPaymentScanner from '@/components/QRPaymentScanner';
import { useToast } from '@/hooks/use-toast';

interface QRScanResult {
  success: boolean;
  code?: string;
  ussdCode?: string;
  amount?: number;
  phone?: string;
  type?: string;
  validation?: any;
  transactionId?: string;
}

export default function PaymentScannerPage() {
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleScanResult = (result: QRScanResult) => {
    console.log('Scan result:', result);
    
    if (result.success) {
      toast({
        title: "Payment Processing",
        description: "Your payment has been initiated successfully"
      });
    } else {
      toast({
        title: "Scan Failed",
        description: "Could not process the QR code. Please try again.",
        variant: "destructive"
      });
    }
    
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Scan to Pay</h1>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Ready to Scan</CardTitle>
              <p className="text-muted-foreground text-sm">
                Scan any payment QR code to complete your transaction
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowScanner(true)}
                className="w-full h-12"
                size="lg"
              >
                <QrCode className="mr-2 h-5 w-5" />
                Open Camera Scanner
              </Button>
              
              <div className="text-xs text-muted-foreground space-y-1 text-center">
                <p>• Point camera at QR code</p>
                <p>• Keep code within the frame</p>
                <p>• Good lighting improves scanning</p>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-orange-800">
                <p className="font-medium mb-1">Secure Payment</p>
                <p>Only scan QR codes from trusted sources. Verify payment details before confirming.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRPaymentScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanResult={handleScanResult}
      />
    </div>
  );
}