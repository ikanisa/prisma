
import React, { useEffect, useState } from "react";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerTipsProps {
  scanStatus: ScanStatus;
  lightLevel?: number | null;
  scanAttempts?: number;
  scanDuration?: number;
}

const brightLightTips = [
  "Move to shade for better scanning",
  "Tilt phone to reduce glare",
  "Try scanning from different angle",
  "Clean your camera lens for clarity"
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

const persistentFailureTips = [
  "Try cleaning your camera lens",
  "Move to different lighting conditions",
  "Check if QR code is Rwanda MoMo format",
  "Use AI processing for damaged codes"
];

const ScannerTips: React.FC<ScannerTipsProps> = ({ 
  scanStatus, 
  lightLevel, 
  scanAttempts = 0, 
  scanDuration = 0 
}) => {
  const [showTip, setShowTip] = useState("");
  const [tipIdx, setTipIdx] = useState(0);
  const [urgencyLevel, setUrgencyLevel] = useState<"normal" | "medium" | "high">("normal");

  // Determine urgency based on attempts and duration
  const calculateUrgency = () => {
    if (scanDuration > 7000 || scanAttempts >= 3) return "high";
    if (scanDuration > 4000 || scanAttempts >= 2) return "medium";
    return "normal";
  };

  // Select appropriate tips based on lighting conditions and persistence
  const getTipsForCondition = () => {
    const currentUrgency = calculateUrgency();
    
    // After 7+ seconds or 3+ attempts, show persistent failure tips
    if (currentUrgency === "high") {
      return persistentFailureTips;
    }
    
    if (lightLevel && lightLevel > 600) return brightLightTips;
    if (lightLevel && lightLevel < 50) return lowLightTips;
    return normalTips;
  };

  // Enhanced haptic feedback for different scenarios
  const triggerHapticFeedback = (pattern: "light" | "medium" | "strong") => {
    if ("vibrate" in navigator) {
      switch (pattern) {
        case "light":
          navigator.vibrate(50);
          break;
        case "medium":
          navigator.vibrate([100, 50, 100]);
          break;
        case "strong":
          navigator.vibrate([200, 100, 200, 100, 200]);
          break;
      }
    }
  };

  // Audio feedback for accessibility
  const triggerAudioFeedback = (type: "start" | "success" | "fail" | "urgent") => {
    if ("speechSynthesis" in window && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.volume = 0.3;
      utterance.rate = 1.2;
      
      switch (type) {
        case "start":
          utterance.text = "Scanning started";
          break;
        case "success":
          utterance.text = "QR code detected";
          break;
        case "fail":
          utterance.text = "Scan failed, try again";
          break;
        case "urgent":
          utterance.text = "Having trouble? Try different lighting or clean your lens";
          break;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    let tipCycle: NodeJS.Timeout | null = null;
    const currentTips = getTipsForCondition();
    const newUrgency = calculateUrgency();
    setUrgencyLevel(newUrgency);
    
    if (scanStatus === "scanning") {
      setShowTip(currentTips[0]);
      setTipIdx(0);
      
      // Audio feedback on scan start (first attempt only)
      if (scanAttempts === 1) {
        triggerAudioFeedback("start");
      }
      
      // Cycle through tips based on urgency
      const cycleInterval = newUrgency === "high" ? 2000 : newUrgency === "medium" ? 2800 : 3400;
      
      tipCycle = setInterval(() => {
        setTipIdx((idx) => {
          const next = (idx + 1) % currentTips.length;
          setShowTip(currentTips[next]);
          
          // Light haptic on tip change for high urgency
          if (newUrgency === "high") {
            triggerHapticFeedback("light");
          }
          
          return next;
        });
      }, cycleInterval);
      
    } else if (scanStatus === "fail") {
      triggerHapticFeedback("medium");
      triggerAudioFeedback("fail");
      
      // Context-aware failure messages
      if (newUrgency === "high") {
        if (lightLevel && lightLevel > 600) {
          setShowTip("Persistent scanning issues — try moving to shade or cleaning camera lens");
        } else if (lightLevel && lightLevel < 50) {
          setShowTip("Still having trouble — use flashlight or move to brighter area");
        } else {
          setShowTip("Multiple scan failures — try AI processing or check QR code quality");
        }
        triggerAudioFeedback("urgent");
      } else {
        if (lightLevel && lightLevel > 600) {
          setShowTip("Try moving to shade — bright light can interfere with scanning");
        } else if (lightLevel && lightLevel < 50) {
          setShowTip("Try using flashlight — low light makes scanning difficult");
        } else {
          setShowTip("QR not detected — try moving closer or cleaning camera lens");
        }
      }
      
    } else if (scanStatus === "processing") {
      setShowTip("Decoding with AI – one moment…");
      triggerHapticFeedback("light");
      
    } else if (scanStatus === "idle") {
      setShowTip("Align QR within frame to begin");
      
    } else if (scanStatus === "success") {
      setShowTip("Rwanda MoMo QR detected! Ready to launch payment");
      triggerHapticFeedback("strong");
      triggerAudioFeedback("success");
    }
    
    return () => {
      if (tipCycle) clearInterval(tipCycle);
    }
  }, [scanStatus, lightLevel, scanAttempts, scanDuration]);

  // Get tip styling based on urgency and conditions
  const getTipStyling = () => {
    const baseClasses = "bg-gradient-to-r text-center border transition-all duration-300";
    
    if (urgencyLevel === "high") {
      return `${baseClasses} from-red-700/40 to-orange-600/35 text-red-100 border-red-400/30 shadow-lg animate-pulse`;
    }
    
    if (urgencyLevel === "medium") {
      return `${baseClasses} from-yellow-700/35 to-orange-600/30 text-yellow-100 border-yellow-400/25 shadow-md`;
    }
    
    if (lightLevel && lightLevel > 600) {
      return `${baseClasses} from-yellow-700/30 to-orange-600/25 text-yellow-100 border-yellow-400/20`;
    }
    
    if (lightLevel && lightLevel < 50) {
      return `${baseClasses} from-purple-700/25 to-blue-600/30 text-purple-100 border-purple-400/20`;
    }
    
    return `${baseClasses} from-blue-700/20 to-indigo-400/20 text-blue-100 border-blue-400/20`;
  };

  return (
    <div className="mt-6 mb-2 flex flex-col items-center justify-center pointer-events-none">
      <div
        className={`glass-panel px-5 py-2 rounded-full shadow-md text-sm md:text-base font-semibold ${getTipStyling()}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {showTip}
      </div>
      
      {/* Enhanced environmental and guidance indicators */}
      <div className="mt-2 flex items-center space-x-4 text-xs text-white/60">
        {lightLevel && (
          <div>
            {lightLevel > 600 ? "☀️ Bright" : 
             lightLevel < 50 ? "🌙 Low light" : 
             "💡 Normal"}
          </div>
        )}
        
        {urgencyLevel === "high" && (
          <div className="text-red-300 animate-pulse">⚠️ Need help?</div>
        )}
        
        {scanAttempts > 0 && (
          <div>Attempt {scanAttempts}</div>
        )}
      </div>
    </div>
  );
};

export default ScannerTips;
