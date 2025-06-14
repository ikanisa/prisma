
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
      
      {/* Header - Responsive */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 safe-area-top">
        <button
          onClick={() => navigate('/')}
          className="glass-card p-2 sm:p-3 text-white hover:scale-110 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        <h1 className="text-white text-lg sm:text-xl font-semibold">Scan to Pay</h1>
        
        <button
          onClick={toggleFlash}
          className={`glass-card p-2 sm:p-3 transition-all ${flashEnabled ? 'bg-yellow-500/20' : ''}`}
        >
          <Flashlight className={`w-5 h-5 sm:w-6 sm:h-6 ${flashEnabled ? 'text-yellow-400' : 'text-white'}`} />
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
          
          {/* QR Scan Frame - Centered and Responsive */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative">
              {/* Responsive QR frame */}
              <div className="w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 border-4 border-white rounded-3xl qr-glow">
                {/* Corner indicators - responsive */}
                <div className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-l-4 border-t-4 border-blue-500 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-r-4 border-t-4 border-blue-500 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-12 sm:h-12 border-l-4 border-b-4 border-blue-500 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-12 sm:h-12 border-r-4 border-b-4 border-blue-500 rounded-br-2xl"></div>
              </div>
              
              {/* Instruction text - responsive positioning */}
              <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2 px-4">
                <p className="text-white text-center text-base sm:text-lg font-semibold whitespace-nowrap">
                  Point camera at QR code
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-white text-center p-6 sm:p-8">
          <Camera className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 text-gray-400" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Camera Not Available</h2>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base max-w-xs sm:max-w-md">
            Please allow camera access or try on a different device
          </p>
          <button
            onClick={simulateQRScan}
            className="btn-primary text-sm sm:text-base px-6 py-3 sm:px-8 sm:py-4"
          >
            Simulate QR Scan (Demo)
          </button>
        </div>
      )}

      {/* USSD Button (appears after scan) - Responsive */}
      {scannedData && (
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent safe-area-bottom">
          <div className="glass-card p-4 sm:p-6 text-center max-w-md mx-auto">
            <p className="text-white text-xs sm:text-sm mb-3 sm:mb-4">Scanned Payment Code:</p>
            <button
              onClick={launchUSSD}
              className="w-full bg-electric-ocean text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl text-lg sm:text-xl font-bold break-all"
            >
              {scannedData}
            </button>
            <p className="text-gray-300 text-xs sm:text-sm mt-2 sm:mt-3">
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
