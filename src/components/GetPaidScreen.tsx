import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, QrCode, Send, Copy, Download, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { toast } from '@/hooks/use-toast';
import { cloudFunctions } from '@/services/cloudFunctions';
import LoadingSpinner from './LoadingSpinner';
import OfflineBanner from './OfflineBanner';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [phoneInteracted, setPhoneInteracted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle phone input interaction
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  // Amount input interaction
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    if (!amountInteracted) {
      setAmountInteracted(true);
    }
  };

  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
    }
  };

  const generateQR = async () => {
    if (!phone.trim() || !amount.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both phone number and amount",
        variant: "destructive"
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Generate QR code
      const qrResponse = await cloudFunctions.generateQRCode(phone.trim(), numAmount);
      setQrResult(qrResponse);

      // Generate payment link
      const linkResponse = await cloudFunctions.createPaymentLink(phone.trim(), numAmount);
      setPaymentLink(linkResponse.paymentLink);

      toast({
        title: "QR Code Generated!",
        description: "Ready to share your payment request",
      });
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate QR code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadQR = () => {
    if (!qrResult?.qrCodeImage) return;
    
    const link = document.createElement('a');
    link.download = `payment-qr-${phone}-${amount}.png`;
    link.href = qrResult.qrCodeImage;
    link.click();
    
    toast({
      title: "Downloaded!",
      description: "QR code saved to your device",
    });
  };

  const shareViaWhatsApp = () => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    cloudFunctions.logShareEvent('whatsapp');
  };

  const shareViaSMS = () => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
    
    cloudFunctions.logShareEvent('sms');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <OfflineBanner />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-blue-200/50">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Get Paid</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Input Form */}
        <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className={`transition-opacity ${showPhoneLabel ? 'opacity-100' : 'opacity-0'}`}>
                Mobile Money Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                onFocus={handlePhoneFocus}
                placeholder="Enter mobile money number"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className={`transition-opacity ${amountInteracted ? 'opacity-0' : 'opacity-100'}`}>
                Amount (RWF)
              </Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (!amountInteracted) setAmountInteracted(true);
                }}
                placeholder="Enter amount"
                type="number"
                className="text-lg"
              />
            </div>

            <Button 
              onClick={generateQR}
              disabled={isGenerating || !phone.trim() || !amount.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5 mr-2" />
                  Generate Payment QR
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* QR Result */}
        {qrResult && (
          <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Payment QR Code
                </h3>
                <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                  <img 
                    src={qrResult.qrCodeImage} 
                    alt="Payment QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(qrResult.ussdString, "USSD Code")}
                  className="flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy USSD
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadQR}
                  className="flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>

              {/* Share Options */}
              {paymentLink && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">Payment link created</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={shareViaWhatsApp}
                      className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Share via WhatsApp
                    </Button>
                    
                    <Button
                      onClick={shareViaSMS}
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Share via SMS
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(paymentLink, "Payment Link")}
                      className="flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default GetPaidScreen;
