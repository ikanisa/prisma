
import React from "react";
import { QrCode } from "lucide-react";
import LoadingSpinner from "../LoadingSpinner";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerStatusDisplayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  isProcessingWithAI: boolean;
  onRetry: () => void;
  onProcessWithAI: () => void;
  onUSSDPress: () => void;
}

const ScannerStatusDisplay: React.FC<ScannerStatusDisplayProps> = ({
  scanStatus,
  scanResult,
  isProcessingWithAI,
  onRetry,
  onProcessWithAI,
  onUSSDPress
}) => {
  if (scanStatus === "scanning") {
    return (
      <div className="absolute left-1/2 bottom-[18vh] -translate-x-1/2 flex flex-col items-center">
        <LoadingSpinner />
        <span className="mt-2 text-base font-semibold text-white/90">Scanning…</span>
      </div>
    );
  }

  if (scanStatus === "processing") {
    return (
      <div className="absolute left-1/2 bottom-[18vh] -translate-x-1/2 flex flex-col items-center">
        <LoadingSpinner />
        <span className="mt-2 text-base font-semibold text-white/90">AI Processing...</span>
      </div>
    );
  }

  if (scanStatus === "success" && scanResult) {
    return (
      <div className="absolute left-1/2 bottom-[15vh] -translate-x-1/2 w-[90vw] max-w-lg flex items-center justify-center transition-all animate-fade-in">
        <button
          onClick={onUSSDPress}
          className="w-full py-5 px-6 text-2xl sm:text-3xl font-black rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-lg hover:scale-105 transition active:scale-95 text-white tracking-widest text-center ring-2 ring-blue-400/40 glow outline-none animate-pulse"
          style={{ letterSpacing: "0.1em" }}
          aria-label="Copy USSD code"
        >
          {scanResult}
        </button>
      </div>
    );
  }

  if (scanStatus === "fail") {
    return (
      <div className="absolute left-1/2 bottom-[15vh] -translate-x-1/2 w-[90vw] max-w-lg flex flex-col items-center transition-all animate-fade-in">
        <div className="bg-red-700/85 rounded-2xl px-5 py-4 text-white font-semibold text-center mb-3 shadow-xl" role="alert">
          Scan failed — try AI processing or enter manually
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={onRetry} 
            className="shadow-xl flex items-center gap-2"
            aria-label="Retry scan"
          >
            <QrCode className="mr-1" aria-hidden="true" focusable="false" /> Retry Scan
          </Button>
          <Button 
            onClick={onProcessWithAI}
            variant="default" 
            size="lg" 
            className="shadow-xl bg-blue-500 hover:bg-blue-600"
            disabled={isProcessingWithAI}
            aria-label="Attempt AI decode"
          >
            {isProcessingWithAI ? "Processing..." : "AI Decode"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default ScannerStatusDisplay;
