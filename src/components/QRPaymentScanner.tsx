import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, QrCode, Flashlight, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface QRPaymentScannerProps {
  onScanResult?: (result: QRScanResult) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export const QRPaymentScanner: React.FC<QRPaymentScannerProps> = ({
  onScanResult,
  onClose,
  isOpen = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      checkCameraPermissions();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const checkCameraPermissions = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasCamera(videoDevices.length > 0);
      
      if (videoDevices.length > 0) {
        // Check if torch is available
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any;
          setHasTorch(capabilities.torch === true);
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn('Could not check torch capability:', err);
        }
      }
    } catch (err) {
      console.error('Error checking camera permissions:', err);
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Initialize ZXing reader
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Start scanning
        readerRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (result) {
              handleScanSuccess(result.getText());
            }
          }
        );
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (readerRef.current) {
      readerRef.current.reset();
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('Error toggling torch:', err);
      toast({
        title: "Torch Error",
        description: "Could not toggle flashlight",
        variant: "destructive"
      });
    }
  };

  const handleScanSuccess = async (qrCode: string) => {
    if (processing) return;
    
    setProcessing(true);
    stopScanning();

    try {
      // Process QR code with backend
      const { data, error } = await supabase.functions.invoke('process-qr-scan', {
        body: {
          qrData: qrCode,
          scannerPhone: '+250123456789', // Get from user session
          method: 'camera',
          confidence: 0.9,
          lightingCondition: 'normal',
          torchUsed: torchOn,
          processingTime: Date.now()
        }
      });

      if (error) throw error;

      const result: QRScanResult = {
        success: data.success,
        code: qrCode,
        ussdCode: data.ussdCode,
        amount: data.amount,
        phone: data.phone,
        type: data.type,
        validation: data.validation,
        transactionId: data.transactionId
      };

      setScanResult(result);
      
      if (data.success) {
        toast({
          title: "QR Code Scanned",
          description: "Payment QR code successfully processed"
        });
      } else {
        throw new Error(data.message || 'Failed to process QR code');
      }

    } catch (err) {
      console.error('Error processing QR code:', err);
      const errorResult: QRScanResult = {
        success: false,
        code: qrCode
      };
      setScanResult(errorResult);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async () => {
    if (!scanResult || !scanResult.ussdCode) return;

    try {
      // Create a tel: link to dial the USSD code
      const telLink = `tel:${encodeURIComponent(scanResult.ussdCode)}`;
      window.location.href = telLink;
      
      toast({
        title: "Payment Initiated",
        description: "Opening dialer with payment code"
      });

      // Call onScanResult callback
      if (onScanResult) {
        onScanResult(scanResult);
      }

      // Close scanner
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      toast({
        title: "Payment Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Payment Scanner
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Camera View */}
          {!scanResult && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary border-dashed rounded-lg animate-pulse"></div>
                    </div>
                    {processing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p>Processing...</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-75">Camera ready to scan</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {!isScanning ? (
                  <Button 
                    onClick={startScanning} 
                    disabled={!hasCamera}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Scanning
                  </Button>
                ) : (
                  <>
                    <Button onClick={stopScanning} variant="outline" className="flex-1">
                      Stop Scanning
                    </Button>
                    {hasTorch && (
                      <Button
                        onClick={toggleTorch}
                        variant={torchOn ? "default" : "outline"}
                        size="icon"
                      >
                        <Flashlight className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="space-y-4">
              <div className="text-center">
                {scanResult.success ? (
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                )}
                <h3 className="font-semibold">
                  {scanResult.success ? 'QR Code Scanned' : 'Scan Failed'}
                </h3>
              </div>

              {scanResult.success && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">
                        {scanResult.amount ? `${scanResult.amount} RWF` : 'Variable'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{scanResult.phone || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {scanResult.type && (
                    <Badge variant="secondary" className="w-full justify-center">
                      {scanResult.type}
                    </Badge>
                  )}

                  <Button onClick={processPayment} className="w-full">
                    Complete Payment
                  </Button>
                </div>
              )}

              <Button onClick={resetScanner} variant="outline" className="w-full">
                Scan Another Code
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Point your camera at a payment QR code</p>
            <p>• Keep the code within the scanning frame</p>
            <p>• Ensure good lighting for best results</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRPaymentScanner;