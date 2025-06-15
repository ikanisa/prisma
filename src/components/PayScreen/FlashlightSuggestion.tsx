
import React, { useState } from "react";
import { Flashlight } from "lucide-react";

interface FlashlightSuggestionProps {
  showFlashSuggestion: boolean;
}

const FlashlightSuggestion: React.FC<FlashlightSuggestionProps> = ({ showFlashSuggestion }) => {
  const [flashEnabled, setFlashEnabled] = useState(false);

  const handleToggleFlash = async () => {
    setFlashEnabled((f) => !f);
  };

  if (!showFlashSuggestion) return null;

  return (
    <div className="absolute left-1/2 top-8 -translate-x-1/2 flex gap-2 items-center pointer-events-auto select-none animate-fade-in">
      <button
        className={`flex items-center gap-2 px-5 py-2 font-semibold rounded-full bg-yellow-500/85 shadow-lg border border-yellow-400 text-yellow-950 backdrop-blur-sm hover:scale-105 transition active:scale-100 ${
          flashEnabled ? "ring-2 ring-yellow-400" : ""
        }`}
        onClick={handleToggleFlash}
      >
        <Flashlight className="mr-2 w-6 h-6" />
        Tap to {flashEnabled ? "disable" : "enable"} flashlight for low light
      </button>
    </div>
  );
};

export default FlashlightSuggestion;
