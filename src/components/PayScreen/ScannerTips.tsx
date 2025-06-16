import React, { useMemo } from "react";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerTipsProps {
  scanStatus?: ScanStatus;
  lightLevel?: number | null;
  scanAttempts?: number;
  scanDuration?: number;
  performanceConfig?: {
    fps: number;
    enableAnimations: boolean;
    enableBlur: boolean;
    enableShadows: boolean;
  };
}

const ScannerTips: React.FC<ScannerTipsProps> = ({
  scanStatus,
  lightLevel,
  scanAttempts = 0,
  scanDuration = 0,
  performanceConfig
}) => {
  const { tipLevel, primaryTip, secondaryTip, shouldShowAIOption } = useMemo(() => {
    let level: "normal" | "urgent" | "critical" = "normal";
    let primary = "";
    let secondary = "";
    let showAI = false;

    // Determine urgency level based on scan duration and attempts
    if (scanDuration > 7000 && scanAttempts >= 3) {
      level = "critical";
      showAI = true;
    } else if (scanDuration > 4000 && scanAttempts >= 2) {
      level = "urgent";
    }

    // Generate contextual tips based on conditions
    if (lightLevel && lightLevel > 800) {
      primary = level === "critical" 
        ? "🔴 Try moving to shade or using AI processing"
        : level === "urgent"
          ? "⚠️ Very bright - move to shade if possible"
          : "☀️ Good lighting - position QR code clearly";
      secondary = level !== "normal" ? "Tap AI process if scanning continues to fail" : "";
    } else if (lightLevel && lightLevel < 20) {
      primary = level === "critical"
        ? "🔴 Use flashlight or try AI processing"
        : level === "urgent"
          ? "⚠️ Very dark - enable flashlight"
          : "🌙 Low light - try using flashlight";
      secondary = level !== "normal" ? "AI processing works better in poor light" : "";
    } else if (scanAttempts >= 3) {
      primary = level === "critical"
        ? "🔴 Having trouble? Try AI processing"
        : "⚠️ Multiple attempts - check QR code clarity";
      secondary = level === "critical" ? "AI can process blurry or damaged codes" : "";
    } else {
      primary = "📱 Position QR code within the frame";
      secondary = scanDuration > 3000 ? "Keep device steady and ensure good lighting" : "";
    }

    return { tipLevel: level, primaryTip: primary, secondaryTip: secondary, shouldShowAIOption: showAI };
  }, [lightLevel, scanAttempts, scanDuration]);

  // Performance-optimized styling
  const containerStyles = useMemo(() => {
    const baseClasses = "fixed bottom-4 left-4 right-4 z-20 px-4 py-3 rounded-xl border transition-all";
    const blurClass = performanceConfig?.enableBlur ? "backdrop-blur-md" : "backdrop-blur-sm";
    const shadowClass = performanceConfig?.enableShadows ? "shadow-lg" : "shadow-md";
    const animationClass = performanceConfig?.enableAnimations ? "duration-300" : "";
    
    if (tipLevel === "critical") {
      return `${baseClasses} ${blurClass} ${shadowClass} ${animationClass} bg-red-500/20 border-red-400/40 shadow-red-400/20`;
    } else if (tipLevel === "urgent") {
      return `${baseClasses} ${blurClass} ${shadowClass} ${animationClass} bg-yellow-500/20 border-yellow-400/40 shadow-yellow-400/20`;
    }
    
    return `${baseClasses} ${blurClass} ${shadowClass} ${animationClass} bg-blue-500/15 border-blue-400/30 shadow-blue-400/15`;
  }, [tipLevel, performanceConfig]);

  // Performance-optimized text styling
  const textColor = useMemo(() => {
    if (tipLevel === "critical") return "text-red-100";
    if (tipLevel === "urgent") return "text-yellow-100";
    return "text-blue-100";
  }, [tipLevel]);

  if (scanStatus === "success") return null;

  return (
    <div className={containerStyles} aria-live="polite" aria-atomic="true">
      <div className="text-center space-y-1">
        <p className={`${textColor} text-sm font-medium`}>
          {primaryTip}
        </p>
        {secondaryTip && (
          <p className={`${textColor} text-xs opacity-90`}>
            {secondaryTip}
          </p>
        )}
        
        {/* Performance info for development */}
        {process.env.NODE_ENV === 'development' && performanceConfig && (
          <p className="text-gray-400 text-xs mt-2">
            Performance: {performanceConfig.fps}fps | Animations: {performanceConfig.enableAnimations ? 'On' : 'Off'}
          </p>
        )}
        
        {/* Audio accessibility cue */}
        <span className="sr-only">
          {tipLevel === "critical" ? "Critical scanning issue detected" :
           tipLevel === "urgent" ? "Scanning difficulty detected" :
           "Scanner guidance"}
        </span>
      </div>
    </div>
  );
};

export default ScannerTips;
