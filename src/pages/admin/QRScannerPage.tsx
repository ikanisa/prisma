import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, QrCode, Type, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScanResult {
  type: string;
  momo_number: string;
  amount?: number;
  ref: string;
  timestamp: string;
}

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsScanning(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions or use manual input.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw current frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to image data and analyze
    try {
      const imageData = canvas.toDataURL('image/png');
      // Note: In a real implementation, you would use a QR code library like zxing-js
      // For now, we'll simulate the process
      toast({
        title: "Capture Successful",
        description: "Image captured. In a real implementation, this would be analyzed for QR codes.",
      });
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture image');
    }
  };

  const processManualCode = () => {
    if (!manualCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    try {
      // Try to parse as JSON
      const parsedData = JSON.parse(manualCode);
      if (parsedData.type === 'momo_payment') {
        setScanResult(parsedData);
        setError(null);
        toast({
          title: "QR Code Processed",
          description: "Payment QR code successfully decoded",
        });
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (err) {
      console.error('Error parsing QR code:', err);
      setError('Invalid QR code format. Please check the code and try again.');
    }
  };

  const processPayment = async () => {
    if (!scanResult) return;

    try {
      // Here you would typically call your payment processing endpoint
      // For now, we'll just show a success message
      toast({
        title: "Payment Initiated",
        description: `Processing payment for ${scanResult.amount ? scanResult.amount + ' RWF' : 'amount to be determined'} to ${scanResult.momo_number}`,
      });
      
      // Reset scan result
      setScanResult(null);
      setManualCode("");
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">QR Code Scanner</h1>
          <p className="text-muted-foreground">Scan or enter QR codes for payment processing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isScanning ? (
                <div className="text-center py-8">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Use your device camera to scan QR codes
                  </p>
                  <Button onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    {/* QR Code targeting overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg"></div>
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2">
                    <Button onClick={captureAndAnalyze} className="flex-1">
                      <QrCode className="mr-2 h-4 w-4" />
                      Capture & Analyze
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      Stop Camera
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Manual Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manual-code">QR Code Data</Label>
                <textarea
                  id="manual-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste QR code data here..."
                  className="w-full h-32 px-3 py-2 border rounded-md resize-none"
                />
              </div>
              <Button onClick={processManualCode} className="w-full">
                Process QR Code
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Scan Result */}
        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                QR Code Decoded
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="font-medium capitalize">{scanResult.type}</p>
                </div>
                <div>
                  <Label>Reference</Label>
                  <p className="font-medium">{scanResult.ref}</p>
                </div>
                <div>
                  <Label>MoMo Number</Label>
                  <p className="font-medium">{scanResult.momo_number || 'Not specified'}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium">
                    {scanResult.amount ? `${scanResult.amount} RWF` : 'Amount to be entered'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={processPayment} className="flex-1">
                  Process Payment
                </Button>
                <Button variant="outline" onClick={() => setScanResult(null)}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Camera Scanner:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Click "Start Camera" to begin</li>
                  <li>• Point camera at QR code</li>
                  <li>• Align QR code within the frame</li>
                  <li>• Click "Capture & Analyze" to scan</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Manual Input:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Paste QR code data directly</li>
                  <li>• Useful for screenshots or copied codes</li>
                  <li>• Supports JSON format payment codes</li>
                  <li>• Click "Process QR Code" to decode</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}