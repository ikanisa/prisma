
import React from "react";
import { Flashlight, FlashlightOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FlashlightButtonProps {
  showFlashButton: boolean;
  flashEnabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFlashToggle: (enabled: boolean) => void;
}

const FlashlightButton: React.FC<FlashlightButtonProps> = ({
  showFlashButton,
  flashEnabled,
  videoRef,
  onFlashToggle
}) => {
  const handleToggleFlash = async () => {
    try {
      const { CameraService } = await import('@/services/CameraService');
      const success = await CameraService.toggleFlash(videoRef, flashEnabled);
      onFlashToggle(success);
      toast({
        title: success ? "Flashlight enabled" : "Flashlight disabled",
        description: "Camera flash turned " + (success ? "on" : "off"),
      });
    } catch {
      toast({
        title: "Flash not supported",
        description: "This device/browser does not support torch control.",
        variant: "destructive"
      });
      onFlashToggle(false);
    }
  };

  if (!showFlashButton) return null;

  return (
    <button
      className={`absolute top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 font-semibold rounded-full bg-yellow-100/90 shadow-lg border border-yellow-300 text-blue-900 backdrop-blur-lg hover:bg-yellow-200 focus-visible:ring-2 focus-visible:ring-yellow-500 transition active:scale-95`}
      onClick={handleToggleFlash}
      aria-label={flashEnabled ? "Disable flashlight" : "Enable flashlight"}
      tabIndex={0}
    >
      {flashEnabled ? (
        <FlashlightOff className="w-5 h-5" />
      ) : (
        <Flashlight className="w-5 h-5" />
      )}
      {flashEnabled ? "Flash On" : "Flash"}
    </button>
  );
};

export default FlashlightButton;
