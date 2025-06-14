
import React, { useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const autofocusBorderSize = 'min(96vw, 96vh)'; // nearly full screen

const INSIDE_OVERLAY_OPACITY = 0.48; // Adjusted opacity for antiglare effect

const PayScreen = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

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

  return (
    <div className="fixed inset-0 w-full h-full z-50 overflow-hidden bg-black">
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ background: "#000" }}
      />

      {/* 1. Darkest overlay outside autofocus (almost blackout) */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          maskImage: `radial-gradient(circle at 50% 50%, transparent 46%, rgba(0,0,0,1) 52%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent 46%, rgba(0,0,0,1) 52%)`,
          background: 'rgba(0,0,0,0.82)',
          transition: '.3s background',
        }}
      />

      {/* 2. Glassy black anti-glare INSIDE the border */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          ...frameStyle,
          background: `rgba(0,0,0,${INSIDE_OVERLAY_OPACITY})`,
          borderRadius: 32,
          // To avoid seeing the border being overpainted by inside overlay,
          // slightly offset the overlay inset so border stays brightest
          boxShadow: '0 0 0 1px rgba(0,0,0,0.02) inset',
        }}
        aria-label="Anti-glare inner dim"
      />

      {/* 3. Autofocus border: thick, bright, high contrast, accent glow */}
      <div
        className="pointer-events-none absolute z-30"
        style={{
          ...frameStyle,
          border: '5px solid #22f2ff', // bright cyan
          borderRadius: 32,
          boxShadow:
            '0 0 48px 12px #00fff555, 0 0 0 6px #fff3 inset, 0 0 0 2px #00fff5cc',
          background: 'none',
          // Prevent overlaying the border
          pointerEvents: 'none',
        }}
        aria-label="Autofocus border"
      />

      {/* 4. Back arrow (exit) */}
      <button
        className="absolute top-5 left-5 z-40 glass-card text-white p-2 rounded-xl shadow-lg hover:scale-105 transition-all"
        aria-label="Back"
        onClick={() => navigate(-1)}
        style={{ background: 'rgba(0,0,0,0.24)' }}
      >
        <ArrowLeft className="w-7 h-7" />
      </button>

      {/* 5. Help tip: anti-glare advice */}
      <div
        className="pointer-events-none absolute z-40 left-1/2"
        style={{ bottom: "3.5rem", transform: 'translateX(-50%)', maxWidth: "94vw" }}
      >
        <div className="glass-card px-4 py-3 rounded-xl text-center shadow-lg bg-black/60 backdrop-blur-lg">
          <span className="text-white font-medium text-base sm:text-lg">
            Tip: Hold both screens straight<br className="hidden sm:inline" />&nbsp;and avoid direct sunlight to reduce glare.
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayScreen;
