
import React from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ScannerBackButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      className="absolute top-4 left-4 z-50 glass-card p-2 rounded-2xl text-white shadow-xl bg-black/30 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 transition-all"
      aria-label="Back to home screen"
      onClick={() => navigate("/")}
      tabIndex={0}
    >
      <X className="w-8 h-8" />
      <span className="sr-only">Back</span>
    </button>
  );
};

export default ScannerBackButton;
