
import React, { useRef, useEffect } from 'react';

const autofocusBorderSize = 80; // px, very small focus frame

const PayScreen = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to get camera on mount
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
        // no fallback/error UI per request
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

      {/* Tiny autofocus border (centered) */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: '50%',
          top: '50%',
          width: autofocusBorderSize,
          height: autofocusBorderSize,
          transform: 'translate(-50%, -50%)',
          boxSizing: 'border-box',
          border: '2px solid #00fff5',
          borderRadius: 12,
          boxShadow: '0 0 8px 1px #00fff530',
          background: 'none'
        }}
        aria-label="Autofocus border"
      />
    </div>
  );
};

export default PayScreen;
