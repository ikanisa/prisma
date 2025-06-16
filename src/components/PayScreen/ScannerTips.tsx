
import React, { useEffect, useState } from "react";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerTipsProps {
  scanStatus: ScanStatus;
  lightLevel?: number | null;
}

const brightLightTips = [
  "Move to shade for better scanning",
  "Tilt phone to reduce glare",
  "Try scanning from different angle",
  "Clean your camera lens"
];

const lowLightTips = [
  "Use flashlight for better visibility",
  "Move to brighter area",
  "Hold phone steady for clear focus",
  "Ensure QR code is well-lit"
];

const normalTips = [
  "Hold steady, scanning for Rwanda MoMo QR...",
  "Move closer to sharpen focus",
  "Ensure good lighting for best results",
  "Keep QR code centered in frame"
];

const ScannerTips: React.FC<ScannerTipsProps> = ({ scanStatus, lightLevel }) => {
  const [showTip, setShowTip] = useState("");
  const [tipIdx, setTipIdx] = useState(0);
  const [scanAttempts, setScanAttempts] = useState(0);

  // Select appropriate tips based on lighting conditions
  const getTipsForCondition = () => {
    if (lightLevel && lightLevel > 600) return brightLightTips;
    if (lightLevel && lightLevel < 50) return lowLightTips;
    return normalTips;
  };

  useEffect(() => {
    let tipCycle: NodeJS.Timeout | null = null;
    const currentTips = getTipsForCondition();
    
    if (scanStatus === "scanning") {
      // Increment scan attempts for intelligent guidance
      setScanAttempts(prev => prev + 1);
      
      setShowTip(currentTips[0]);
      setTipIdx(0);
      
      tipCycle = setInterval(() => {
        setTipIdx((idx) => {
          const next = (idx + 1) % currentTips.length;
          setShowTip(currentTips[next]);
          return next;
        });
      }, 3400);
    } else if (scanStatus === "fail") {
      // Show context-aware failure tips after 7+ seconds (multiple attempts)
      if (scanAttempts >= 3) {
        if (lightLevel && lightLevel > 600) {
          setShowTip("Try moving to shade — bright light can interfere with scanning");
        } else if (lightLevel && lightLevel < 50) {
          setShowTip("Try using flashlight — low light makes scanning difficult");
        } else {
          setShowTip("QR not detected — try moving closer or cleaning camera lens");
        }
      } else {
        setShowTip("QR not detected — try moving closer or better lighting");
      }
    } else if (scanStatus === "processing") {
      setShowTip("Decoding with AI – one moment…");
    } else if (scanStatus === "idle") {
      setShowTip("Align QR within frame to begin");
      setScanAttempts(0); // Reset attempts on new scan session
    } else if (scanStatus === "success") {
      setShowTip("Rwanda MoMo QR detected! Ready to launch payment");
      setScanAttempts(0);
    }
    
    return () => {
      if (tipCycle) clearInterval(tipCycle);
    }
  }, [scanStatus, lightLevel, scanAttempts]);

  // Get tip styling based on conditions
  const getTipStyling = () => {
    if (lightLevel && lightLevel > 600) {
      return "bg-gradient-to-r from-yellow-700/30 to-orange-600/25 text-yellow-100 border-yellow-400/20";
    }
    if (lightLevel && lightLevel < 50) {
      return "bg-gradient-to-r from-purple-700/25 to-blue-600/30 text-purple-100 border-purple-400/20";
    }
    return "bg-gradient-to-r from-blue-700/20 to-indigo-400/20 text-blue-100 border-blue-400/20";
  };

  return (
    <div className="mt-6 mb-2 flex flex-col items-center justify-center pointer-events-none">
      <div
        className={`glass-panel px-5 py-2 rounded-full shadow-md text-center text-sm md:text-base font-semibold border transition-all duration-300 ${getTipStyling()}`}
        aria-live="polite"
      >
        {showTip}
      </div>
      
      {/* Environmental condition indicator */}
      {lightLevel && (
        <div className="mt-2 text-xs text-white/60">
          {lightLevel > 600 ? "Bright conditions detected" : 
           lightLevel < 50 ? "Low light detected" : 
           "Normal lighting"}
        </div>
      )}
    </div>
  );
};

export default ScannerTips;
