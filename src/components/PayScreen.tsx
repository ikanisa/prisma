
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { CameraService } from '../services/CameraService';
import PayScreenHeader from './PayScreen/PayScreenHeader';
import CameraView from './PayScreen/CameraView';
import CameraErrorView from './PayScreen/CameraErrorView';
import USSDButton from './PayScreen/USSDButton';

const PayScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [hasCamera, setHasCamera] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeCamera();
    return () => {
      CameraService.stopCamera(videoRef);
    };
  }, []);

  const initializeCamera = async () => {
    setIsLoading(true);
    console.log('Initializing camera...');
    
    const success = await CameraService.startCamera(videoRef);
    
    if (success) {
      console.log('Camera started successfully');
      setIsScanning(true);
      setHasCamera(true);
    } else {
      console.log('Camera failed to start');
      setHasCamera(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const handleToggleFlash = async () => {
    const newFlashState = await CameraService.toggleFlash(videoRef, flashEnabled);
    setFlashEnabled(newFlashState);
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

      {hasCamera ? (
        <CameraView videoRef={videoRef} />
      ) : (
        <CameraErrorView onSimulateScan={simulateQRScan} />
      )}

      {scannedData && (
        <USSDButton scannedData={scannedData} onLaunchUSSD={launchUSSD} />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default PayScreen;
