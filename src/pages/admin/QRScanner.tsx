import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, Type, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QRScanResult {
  type?: string;
  momo_number?: string;
  amount?: number;
  ref?: string;
  timestamp?: string;
}

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkCameraAvailability();
    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      setHasCamera(hasVideoInput);
    } catch (error) {
      console.error('Error checking camera availability:', error);
      setHasCamera(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        
        // Start scanning for QR codes
        startQRDetection();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use manual input.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startQRDetection = () => {
    // Simple QR detection simulation
    // In a real implementation, you'd use a library like jsQR or ZXing
    const detectQR = () => {
      if (!isScanning || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.videoWidth === 0) {
        requestAnimationFrame(detectQR);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Simulate QR detection (in real app, use jsQR here)
      // This is just a placeholder
      requestAnimationFrame(detectQR);
    };

    requestAnimationFrame(detectQR);
  };

  const processQRData = async (qrData: string) => {
    setProcessing(true);
    try {
      let parsedData: QRScanResult;
      
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        // If not JSON, treat as plain text (might be a simple payment string)
        parsedData = { type: 'unknown', ref: qrData };
      }

      setScanResult(parsedData);
      
      // Log the scan result
      await supabase
        .from('agent_execution_log')
        .insert({
          function_name: 'qr-scanner',
          input_data: { qr_data: qrData },
          success_status: true,
          execution_time_ms: 100,
          model_used: 'qr-scanner'
        });

      toast({
        title: "QR Code Scanned",
        description: "QR code data processed successfully"
      });

      stopCamera();
    } catch (error) {
      console.error('Error processing QR data:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process QR code data",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualInput = () => {
    if (!manualInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter QR code data",
        variant: "destructive"
      });
      return;
    }

    processQRData(manualInput);
  };

  const initiatePayment = async () => {
    if (!scanResult?.momo_number) {
      toast({
        title: "Invalid QR Code",
        description: "This QR code doesn't contain valid payment information",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, this would redirect to payment flow
      // or integrate with mobile money API
      const paymentUrl = `tel:*182*6*1*${scanResult.amount || ''}*${scanResult.momo_number}#`;
      window.location.href = paymentUrl;
      
      toast({
        title: "Payment Initiated",
        description: "Redirecting to mobile money USSD..."
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment",
        variant: "destructive"
      });
    }
  };

  const reset = () => {
    setScanResult(null);
    setManualInput('');
    setProcessing(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-8 h-8" />
          QR Code Scanner
        </h1>
        <p className="text-muted-foreground">Scan QR codes to process payments</p>
      </div>

      {!scanResult ? (
        <div className="space-y-6">
          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Camera Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasCamera ? (
                <div className="space-y-4">
                  {isScanning ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 bg-black rounded-lg"
                      />
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      <div className="absolute inset-0 border-2 border-white/20 rounded-lg flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Camera ready to scan</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 justify-center">
                    {!isScanning ? (
                      <Button onClick={startCamera}>
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button onClick={stopCamera} variant="outline">
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Camera not available</p>
                  <p className="text-sm text-muted-foreground">Use manual input below</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Manual Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manual-input">Enter QR Code Data</Label>
                <Input
                  id="manual-input"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder='{"type":"momo_payment","momo_number":"0788123456","amount":5000}'
                />
              </div>
              <Button 
                onClick={handleManualInput} 
                disabled={!manualInput.trim() || processing}
                className="w-full"
              >
                {processing ? "Processing..." : "Process QR Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Scan Result */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              QR Code Scanned Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <p className="text-sm">
                  <Badge>{scanResult.type || 'Unknown'}</Badge>
                </p>
              </div>
              {scanResult.momo_number && (
                <div>
                  <Label>MoMo Number</Label>
                  <p className="text-sm font-mono">{scanResult.momo_number}</p>
                </div>
              )}
              {scanResult.amount && (
                <div>
                  <Label>Amount</Label>
                  <p className="text-sm font-medium">{scanResult.amount} RWF</p>
                </div>
              )}
              {scanResult.ref && (
                <div>
                  <Label>Reference</Label>
                  <p className="text-sm">{scanResult.ref}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Raw Data</Label>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2">
              {scanResult.type === 'momo_payment' && scanResult.momo_number && (
                <Button onClick={initiatePayment} className="flex-1">
                  Initiate Payment
                </Button>
              )}
              <Button onClick={reset} variant="outline" className="flex-1">
                Scan Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}