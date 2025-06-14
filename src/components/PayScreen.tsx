
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

  useEffect(() => {
    initializeCamera();
    return () => {
      CameraService.stopCamera(videoRef);
    };
  }, []);

  const initializeCamera = async () => {
    const success = await CameraService.startCamera(videoRef);
    if (success) {
      setIsScanning(true);
      setHasCamera(true);
    } else {
      setHasCamera(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive"
      });
    }
  };

  const handleToggleFlash = async () => {
    const newFlashState = await CameraService.toggleFlash(videoRef, flashEnabled);
    setFlashEnabled(newFlashState);
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
    <div className="fixed inset-0 w-full h-full relative overflow-hidden">
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
