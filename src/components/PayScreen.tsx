import React, { useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SmartQRScanner from "./PayScreen/SmartQRScanner";
import OfflineBanner from "./OfflineBanner";

const autofocusBorderSize = 'min(96vw, 96vh)'; // nearly full screen

const INSIDE_OVERLAY_OPACITY = 0.48; // Adjusted opacity for antiglare effect

const PayScreen = () => {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        // silent fail as requested
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Calculate frame position/size
  const frameStyle = {
    left: '50%',
    top: '50%',
    width: autofocusBorderSize,
    height: autofocusBorderSize,
    transform: 'translate(-50%, -50%)',
    boxSizing: 'border-box' as const,
  };

  // Instead of native overlays/useEffect, display our new SmartQRScanner:
  return (
    <div className="fixed inset-0 w-full h-full z-50 bg-black overflow-hidden">
      <OfflineBanner />
      <SmartQRScanner onBack={() => navigate(-1)} />
    </div>
  );
};

export default PayScreen;
