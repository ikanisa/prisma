
import React, { useRef, useEffect } from 'react';

const autofocusBorderSize = 'min(96vw, 96vh)'; // nearly full screen

const PayScreen = () => {
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

  // For the mask overlay: same size as border, center at 50%/50%
  // We use "mask-image: radial-gradient" to create a transparent hole in the center

  return (
    <div className="fixed inset-0 w-full h-full z-50 overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ background: "#000" }}
      />

      {/* Dark overlay mask except autofocus area */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          // the center transparent area is autofocusBorderSize, rest is semi-transparent black
          maskImage: `radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,1) 53%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,1) 53%)`,
          background: 'rgba(0,0,0,0.50)',
          transition: '.3s background',
        }}
      />

      {/* Huge autofocus border (centered, spanning nearly both sides) */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: '50%',
          top: '50%',
          width: autofocusBorderSize,
          height: autofocusBorderSize,
          transform: 'translate(-50%, -50%)',
          boxSizing: 'border-box',
          border: '3px solid #00fff5',    // slightly thicker for visibility
          borderRadius: 32,
          boxShadow: '0 0 24px 2px #00fff590',
          background: 'none',
        }}
        aria-label="Autofocus border"
      />
    </div>
  );
};

export default PayScreen;
