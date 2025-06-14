
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import PayScreenHeader from './PayScreen/PayScreenHeader';
import CameraView from './PayScreen/CameraView';
import USSDButton from './PayScreen/USSDButton';

const PayScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate camera initialization with dummy data
    const timer = setTimeout(() => {
      console.log('Simulating camera initialization...');
      setIsLoading(false);
      setIsScanning(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggleFlash = () => {
    setFlashEnabled(!flashEnabled);
    toast({
      title: flashEnabled ? "Flash Off" : "Flash On",
      description: "Flash toggled (demo mode)",
    });
  };

  const simulateQRScan = () => {
    console.log('Simulating QR scan...');
    const mockUSSD = "*182*1*1*0788767676*5000#";
    setScannedData(mockUSSD);
    toast({
      title: "QR Code Scanned!",
      description: "Payment code detected",
    });
  };

  const launchUSSD = () => {
    if (scannedData) {
      navigator.clipboard.writeText(scannedData);
      toast({
        title: "USSD Code Copied!",
        description: "Paste in your dialer to complete payment",
      });
    }
  };

  // Auto-simulate QR scan after 3 seconds for demo
  useEffect(() => {
    if (!isLoading && !scannedData) {
      const timer = setTimeout(() => {
        simulateQRScan();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, scannedData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Starting camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-900 overflow-hidden">
      <PayScreenHeader
        onBack={() => navigate('/')}
        onToggleFlash={handleToggleFlash}
        flashEnabled={flashEnabled}
      />

      <CameraView videoRef={videoRef} />

      {scannedData && (
        <USSDButton scannedData={scannedData} onLaunchUSSD={launchUSSD} />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PayScreen;
