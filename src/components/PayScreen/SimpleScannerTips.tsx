
import React, { useMemo } from "react";

interface SimpleScannerTipsProps {
  scanStatus: string;
  lightLevel?: number | null;
  scanAttempts: number;
  scanDuration: number;
}

const SimpleScannerTips: React.FC<SimpleScannerTipsProps> = ({
  scanStatus,
  lightLevel,
  scanAttempts,
  scanDuration
}) => {
  const { tipLevel, tip } = useMemo(() => {
    let level: "normal" | "urgent" | "critical" = "normal";
    let message = "";

    if (scanDuration > 7000 && scanAttempts >= 3) {
      level = "critical";
      message = "🔴 Having trouble? Try manual input below";
    } else if (scanDuration > 4000 && scanAttempts >= 2) {
      level = "urgent";
      if (lightLevel && lightLevel > 800) {
        message = "⚠️ Very bright - move to shade if possible";
      } else if (lightLevel && lightLevel < 20) {
        message = "⚠️ Very dark - enable flashlight";
      } else {
        message = "⚠️ Multiple attempts - check QR code clarity";
      }
    } else {
      if (lightLevel && lightLevel > 600) {
        message = "☀️ Good lighting - position QR code clearly";
      } else if (lightLevel && lightLevel < 50) {
        message = "🌙 Low light - try using flashlight";
      } else {
        message = "📱 Position QR code within the frame";
      }
    }

    return { tipLevel: level, tip: message };
  }, [lightLevel, scanAttempts, scanDuration]);

  const containerStyles = useMemo(() => {
    const baseClasses = "fixed bottom-4 left-4 right-4 z-20 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300";
    
    if (tipLevel === "critical") {
      return `${baseClasses} bg-red-500/20 border-red-400/40 shadow-red-400/20`;
    } else if (tipLevel === "urgent") {
      return `${baseClasses} bg-yellow-500/20 border-yellow-400/40 shadow-yellow-400/20`;
    }
    
    return `${baseClasses} bg-blue-500/15 border-blue-400/30 shadow-blue-400/15`;
  }, [tipLevel]);

  const textColor = useMemo(() => {
    if (tipLevel === "critical") return "text-red-100";
    if (tipLevel === "urgent") return "text-yellow-100";
    return "text-blue-100";
  }, [tipLevel]);

  if (scanStatus === "success") return null;

  return (
    <div className={containerStyles}>
      <div className="text-center">
        <p className={`${textColor} text-sm font-medium`}>{tip}</p>
      </div>
    </div>
  );
};

export default SimpleScannerTips;
