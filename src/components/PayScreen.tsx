
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Flashlight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Extended types for torch capability
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

const PayScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [hasCamera, setHasCamera] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      setHasCamera(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const toggleFlash = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities;
        
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as ExtendedMediaTrackConstraintSet]
          });
          setFlashEnabled(!flashEnabled);
        }
      }
    } catch (error) {
      console.error('Flash toggle failed:', error);
    }
  };

  const simulateQRScan = () => {
    // Simulate successful QR scan for demo
    const mockUSSD = "*182*1*1*0788767676*5000#";
    setScannedData(mockUSSD);
    toast({
      title: "QR Code Scanned!",
      description: "Payment code detected",
    });
  };

  const launchUSSD = () => {
    if (scannedData) {
      // For demo purposes, we'll copy to clipboard
      navigator.clipboard.writeText(scannedData);
      toast({
        title: "USSD Code Copied!",
        description: "Paste in your dialer to complete payment",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6">
        <button
          onClick={() => navigate('/')}
          className="glass-card p-3 text-white hover:scale-110 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-white text-xl font-semibold">Scan to Pay</h1>
        
        <button
          onClick={toggleFlash}
          className={`glass-card p-3 transition-all ${flashEnabled ? 'bg-yellow-500/20' : ''}`}
        >
          <Flashlight className={`w-6 h-6 ${flashEnabled ? 'text-yellow-400' : 'text-white'}`} />
        </button>
      </div>

      {/* Camera View */}
      {hasCamera ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* QR Scan Frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-72 h-72 border-4 border-white rounded-3xl qr-glow">
                <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-blue-500 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-blue-500 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-blue-500 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-blue-500 rounded-br-2xl"></div>
              </div>
              
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                <p className="text-white text-center text-lg font-semibold">
                  Point camera at QR code
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-white text-center p-8">
          <Camera className="w-24 h-24 mb-6 text-gray-400" />
          <h2 className="text-2xl font-bold mb-4">Camera Not Available</h2>
          <p className="text-gray-300 mb-8">
            Please allow camera access or try on a different device
          </p>
          <button
            onClick={simulateQRScan}
            className="btn-primary"
          >
            Simulate QR Scan (Demo)
          </button>
        </div>
      )}

      {/* USSD Button (appears after scan) */}
      {scannedData && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="glass-card p-6 text-center">
            <p className="text-white text-sm mb-4">Scanned Payment Code:</p>
            <button
              onClick={launchUSSD}
              className="w-full bg-electric-ocean text-white py-4 px-6 rounded-2xl text-xxl font-bold"
            >
              {scannedData}
            </button>
            <p className="text-gray-300 text-sm mt-3">
              Tap to copy and dial this code
            </p>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PayScreen;
