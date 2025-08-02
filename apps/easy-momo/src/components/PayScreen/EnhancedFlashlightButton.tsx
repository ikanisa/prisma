
import React, { useState, useEffect } from 'react';
import { Flashlight, FlashlightOff, Sun, Moon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EnhancedCameraService } from '@/services/EnhancedCameraService';

interface EnhancedFlashlightButtonProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onTorchToggle: (enabled: boolean) => void;
  onLightingChange: (condition: string) => void;
}

const EnhancedFlashlightButton: React.FC<EnhancedFlashlightButtonProps> = ({
  videoRef,
  onTorchToggle,
  onLightingChange
}) => {
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lightingCondition, setLightingCondition] = useState<string>('normal');
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    checkTorchSupport();
    detectLighting();
  }, [videoRef.current]);

  const checkTorchSupport = async () => {
    const supported = await EnhancedCameraService.checkTorchSupport(videoRef);
    setTorchSupported(supported);
  };

  const detectLighting = async () => {
    try {
      const condition = await EnhancedCameraService.detectLightingCondition();
      setLightingCondition(condition.level);
      onLightingChange(condition.level);
      
      if (condition.shouldSuggestTorch && torchSupported) {
        setShowSuggestion(true);
        toast({
          title: "Low light detected",
          description: "Consider enabling flashlight for better scanning",
          duration: 4000,
        });
      }
    } catch (error) {
      console.log('Lighting detection failed:', error);
    }
  };

  const handleTorchToggle = async () => {
    try {
      const newState = await EnhancedCameraService.toggleTorch(videoRef);
      setTorchEnabled(newState);
      onTorchToggle(newState);
      setShowSuggestion(false);
      
      toast({
        title: newState ? "Flashlight enabled" : "Flashlight disabled",
        description: `Camera flash turned ${newState ? 'on' : 'off'}`,
      });
    } catch (error) {
      toast({
        title: "Flash control failed",
        description: "Unable to control flashlight on this device",
        variant: "destructive"
      });
    }
  };

  const getLightingIcon = () => {
    switch (lightingCondition) {
      case 'bright': return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'dark': return <Moon className="w-4 h-4 text-blue-400" />;
      default: return null;
    }
  };

  if (!torchSupported) return null;

  return (
    <div className="absolute top-5 right-5 z-50 flex flex-col gap-2">
      {/* Main flashlight button */}
      <button
        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-full shadow-lg border backdrop-blur-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          torchEnabled 
            ? 'bg-yellow-500/90 border-yellow-400 text-white shadow-yellow-500/50' 
            : 'bg-white/90 border-gray-300 text-gray-800 hover:bg-white'
        } ${showSuggestion ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
        onClick={handleTorchToggle}
        aria-label={torchEnabled ? "Disable flashlight" : "Enable flashlight"}
      >
        {torchEnabled ? (
          <FlashlightOff className="w-5 h-5" />
        ) : (
          <Flashlight className="w-5 h-5" />
        )}
        <span className="text-sm">
          {torchEnabled ? "Flash On" : "Flash"}
        </span>
      </button>

      {/* Lighting condition indicator */}
      {getLightingIcon() && (
        <div className="flex items-center justify-center w-8 h-8 bg-black/50 rounded-full backdrop-blur-sm">
          {getLightingIcon()}
        </div>
      )}

      {/* Suggestion tooltip */}
      {showSuggestion && !torchEnabled && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-yellow-500 text-white text-xs rounded-lg shadow-lg animate-fade-in max-w-48">
          Low light detected. Tap flash for better scanning.
        </div>
      )}
    </div>
  );
};

export default EnhancedFlashlightButton;
