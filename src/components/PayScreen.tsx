
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Flashlight } from 'lucide-react';
import QRScannerFrame from './PayScreen/QRScannerFrame';
import USSDButton from './PayScreen/USSDButton';

/*
  This screen is redesigned entirely per latest standards:
  - Prominent oversized QR frame, centered, no scrolling or wasted space
  - Glass, gradients, high contrast for CTAs
  - Top floating header (back + torch), dark glass, always visible
  - Clear Kinyarwanda instruction (centered under the QR frame)
  - Responsive, everything centered and proportionate for both mobile and desktop
*/

const PayScreen = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scannedData, setScannedData] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Simulate camera initialization delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Simulate scanning a QR code after 3s for demo
  useEffect(() => {
    if (!isLoading && !scannedData) {
      const timer = setTimeout(() => {
        // DEMO: use a real code if you wire a real QR scanner
        setScannedData('*182*1*1*0788767676*5000#');
        toast({
          title: 'QR code yasomwe!',
          description: 'Kode yo kwishyura imaze kuboneka.',
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, scannedData]);

  const handleToggleFlash = () => {
    setFlashEnabled(f => !f);
    toast({
      title: flashEnabled ? 'Itara rya camera ryarazimye' : 'Itara rya camera ryaratse',
      description: 'Gukanda iyi button bituma itara rya camera ritwika (demo).',
    });
  };

  const handleLaunchUSSD = () => {
    if (scannedData) {
      navigator.clipboard.writeText(scannedData);
      toast({
        title: 'Kode ya USSD Igiye!',
        description: 'Kopeye kode, shyira kuri telefoni yawe uyishyiremo.',
      });
    }
  };

  if (isLoading) {
    // Simple dark overlay with spinner, perfectly centered
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900 z-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg font-semibold animate-pulse">Camera irimo gutangira…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-gradient-to-br from-[#192248] via-zinc-900 to-[#1141a2] overflow-hidden z-0">
      {/* Floating header */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)] flex items-center justify-between px-3 sm:px-8 py-4">
        <button
          onClick={() => navigate('/')}
          className="glass-card p-2 text-white hover:scale-110 transition-transform"
          aria-label="Subira inyuma"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-white text-lg font-black tracking-tight drop-shadow-xl select-none">
          Skanira QR kwishyura
        </span>
        <button
          onClick={handleToggleFlash}
          className={`glass-card p-2 transition-all ${flashEnabled ? 'bg-yellow-400/30' : ''}`}
          aria-label="Shyiraho itara"
        >
          <Flashlight className={`w-6 h-6 ${flashEnabled ? 'text-yellow-300' : 'text-white'}`} />
        </button>
      </div>

      {/* Content area - QR SCAN BIG */}
      <div className="flex flex-1 flex-col items-center justify-center z-10 mt-28 sm:mt-24">
        {/* Responsive, very large frame */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 'min(96vw, 430px)',
            height: 'min(96vw, 430px)',
            maxWidth: 430,
            maxHeight: 430,
          }}
        >
          {/* Camera simulated background */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gray-800 via-gray-700/80 to-gray-900" />
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-25 rounded-3xl"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.10) 3px,
                rgba(255,255,255,0.10) 7px
              )`,
            }}
          />
          {/* Scanner frame itself */}
          <QRScannerFrame />
        </div>
        {/* Instruction */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 select-none">
          <span className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-base sm:text-xl backdrop-blur-sm shadow -mt-4">
            Fata camera uyereke ku QR code yo kwishyura
          </span>
          <span className="text-blue-100 text-xs sm:text-base">Kuramo kode ni ukwandika aho ikiboneka neza</span>
        </div>
      </div>

      {/* USSD Button - Kinyarwanda, visual harmony */}
      {scannedData && (
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]">
          <USSDButton
            scannedData={scannedData}
            onLaunchUSSD={handleLaunchUSSD}
          />
        </div>
      )}

      {/* Hidden video element for demo compatibility */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
    </div>
  );
};

export default PayScreen;
