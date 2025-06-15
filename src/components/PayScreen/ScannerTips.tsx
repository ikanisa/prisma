
import React, { useEffect, useState } from "react";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerTipsProps {
  scanStatus: ScanStatus;
}

const holdTips = [
  "Hold steady, scanning for Rwanda MoMo QR...",
  "Move closer to sharpen focus",
  "Ensure good lighting for best results",
];

const ScannerTips: React.FC<ScannerTipsProps> = ({ scanStatus }) => {
  const [showTip, setShowTip] = useState(holdTips[0]);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    let tipCycle: NodeJS.Timeout | null = null;
    setShowTip(holdTips[0]);
    setTipIdx(0);
    
    if (scanStatus === "scanning") {
      tipCycle = setInterval(() => {
        setTipIdx((idx) => {
          const next = (idx + 1) % holdTips.length;
          setShowTip(holdTips[next]);
          return next;
        });
      }, 3400);
    } else if (scanStatus === "fail") {
      setShowTip("QR not detected — try moving closer or better lighting");
    } else if (scanStatus === "processing") {
      setShowTip("Decoding with AI – one moment…");
    } else if (scanStatus === "idle") {
      setShowTip("Align QR within frame to begin");
    } else if (scanStatus === "success") {
      setShowTip("Rwanda MoMo QR detected! Ready to launch payment");
    }
    
    return () => {
      if (tipCycle) clearInterval(tipCycle);
    }
  }, [scanStatus]);

  return (
    <div className="mt-6 mb-2 flex flex-col items-center justify-center pointer-events-none">
      <div
        className="glass-panel px-5 py-2 rounded-full shadow-md text-center text-sm md:text-base bg-gradient-to-r from-blue-700/20 to-indigo-400/20 text-blue-100 font-semibold"
        aria-live="polite"
      >
        {showTip}
      </div>
    </div>
  );
};

export default ScannerTips;
