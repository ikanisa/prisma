
import React from "react";
import { QrCode, Phone } from "lucide-react";
import LoadingSpinner from "../LoadingSpinner";
import { Button } from "../ui/button";
import { extractPaymentDetails } from "@/utils/ussdHelper";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

interface ScannerStatusDisplayProps {
  scanStatus: ScanStatus;
  scanResult: string | null;
  isProcessingWithAI: boolean;
  onRetry: () => void;
  onProcessWithAI: () => void;
  onUSSDLaunch: () => void;
}

const ScannerStatusDisplay: React.FC<ScannerStatusDisplayProps> = ({
  scanStatus,
  scanResult,
  isProcessingWithAI,
  onRetry,
  onProcessWithAI,
  onUSSDLaunch
}) => {
  if (scanStatus === "scanning") {
    return (
      <div className="absolute left-1/2 bottom-[18vh] -translate-x-1/2 flex flex-col items-center">
        <LoadingSpinner />
        <span className="mt-2 text-base font-semibold text-white/90">Scanning for QR code...</span>
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
    const details = extractPaymentDetails(scanResult);
    const paymentInfo = details.type === 'phone' 
      ? `${details.phone} • ${details.amount} RWF`
      : `Code ${details.code} • ${details.amount} RWF`;

    return (
      <div className="absolute left-1/2 bottom-[10vh] -translate-x-1/2 w-[90vw] max-w-lg space-y-4 animate-fade-in">
        {/* USSD Code Display */}
        <div className="bg-blue-900/90 backdrop-blur-md rounded-2xl p-4 text-center border border-blue-400/30">
          <p className="text-white/80 text-sm mb-2">Rwanda MoMo Payment Code:</p>
          <p className="text-white font-mono text-lg tracking-wider break-all">
            {scanResult}
          </p>
          <p className="text-blue-200 text-sm mt-2">{paymentInfo}</p>
        </div>

        {/* Launch Button */}
        <button 
          onClick={onUSSDLaunch}
          className="w-full py-4 px-6 text-xl font-bold rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 shadow-lg hover:scale-105 transition active:scale-95 text-white tracking-wide text-center ring-2 ring-green-400/40 flex items-center justify-center space-x-3"
          aria-label="Launch MoMo payment dialer"
        >
          <Phone className="w-6 h-6" />
          <span>Launch MoMo Payment</span>
        </button>

        {/* Rescan Button */}
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Scan Another QR
        </Button>
      </div>
    );
  }

  if (scanStatus === "fail") {
    return (
      <div className="absolute left-1/2 bottom-[15vh] -translate-x-1/2 w-[90vw] max-w-lg flex flex-col items-center transition-all animate-fade-in">
        <div className="bg-red-700/85 rounded-2xl px-5 py-4 text-white font-semibold text-center mb-3 shadow-xl" role="alert">
          QR scan failed — try AI processing or check the code format
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" onClick={onRetry} className="shadow-xl flex items-center gap-2" aria-label="Retry scan">
            <QrCode className="w-4 h-4" /> Retry Scan
          </Button>
          <Button onClick={onProcessWithAI} variant="default" size="lg" className="shadow-xl bg-blue-500 hover:bg-blue-600" disabled={isProcessingWithAI} aria-label="Attempt AI decode">
            {isProcessingWithAI ? "Processing..." : "AI Decode"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default ScannerStatusDisplay;
