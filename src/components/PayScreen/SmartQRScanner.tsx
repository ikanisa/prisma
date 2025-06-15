
import React, { useEffect, useRef, useState } from "react";
import QRScannerFrame from "./QRScannerFrame";
import { Flashlight, QrCode } from "lucide-react";
import { useAmbientLightSensor } from "@/hooks/useAmbientLightSensor";
import LoadingSpinner from "../LoadingSpinner";
import { Button } from "../ui/button";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

const SCAN_BOX_SIZE = "min(84vw, 80vh)";

type ScanStatus = "idle" | "scanning" | "success" | "fail";

interface SmartQRScannerProps {
  onBack: () => void;
}

const SmartQRScanner: React.FC<SmartQRScannerProps> = ({ onBack }) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [showFlashSuggestion, setShowFlashSuggestion] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ZXing controls
  const scannerControls = useRef<IScannerControls | null>(null);

  // Low light detection
  const light = useAmbientLightSensor();

  // Show flash suggestion if low light
  useEffect(() => {
    setShowFlashSuggestion(typeof light === "number" && light < 16);
  }, [light]);

  // Start/stop QR scanner
  useEffect(() => {
    let stopped = false;
    async function startQRScan() {
      setScanStatus("scanning");
      setScanResult(null);
      const codeReader = new BrowserQRCodeReader();
      try {
        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
        // Use the first available device
        const selectedDeviceId = videoInputDevices?.[0]?.deviceId;
        if (!selectedDeviceId) {
          setScanStatus("fail");
          return;
        }
        // Attach to <video>
        scannerControls.current = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, err) => {
            if (stopped) return;
            if (result) {
              // Found QR!
              setScanResult(result.getText());
              setScanStatus("success");
              if ("vibrate" in navigator) {
                navigator.vibrate(120);
              }
              // Stop scanning (pause at first QR found)
              scannerControls.current?.stop();
            } else if (err) {
              // Logging possible errors (not shown)
            }
          }
        );
      } catch (e) {
        setScanStatus("fail");
      }
    }
    startQRScan();
    return () => {
      stopped = true;
      scannerControls.current?.stop();
    };
  }, []); // Only run on mount

  // Allow retry after fail/success
  const handleRetry = () => {
    setScanStatus("scanning");
    setScanResult(null);
    scannerControls.current?.stop();
    // Effect will automatically re-trigger scan on remount (just force remount via key could work, or better:
    // simple hack: set key on outer div using scanStatus, so that "scanning" state remounts QR logic)
    // Instead, just reload page for now, or see useEffect for scanStatus if needed
    window.location.reload();
  };

  // Flashlight stub: invert state & shimmer anim (browser support for torch is very limited; mostly Android)
  const handleToggleFlash = async () => {
    setFlashEnabled((f) => !f);
    // TODO: Could implement torch via MediaStreamTrack if supported by device.
    // Leave no-op for now; demo purpose.
  };

  // Tap to auto-launch USSD: copy + vibrate
  const handleUSSDPress = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult);
    if ("vibrate" in navigator) navigator.vibrate([50, 40, 65]);
  };

  // Remount scan when retrying
  useEffect(() => {
    if (scanStatus === "scanning" && !scannerControls.current) {
      // Already handled by first useEffect, so don't double mount.
    }
  }, [scanStatus]);

  return (
    <div className="absolute inset-0 flex flex-col w-full h-full items-center justify-start z-50">
      {/* Camera background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover bg-black"
      />
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />

      {/* Animated scan box */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: SCAN_BOX_SIZE,
          height: SCAN_BOX_SIZE,
          maxWidth: 370,
          maxHeight: 370,
        }}
      >
        <div className="relative w-full h-full">
          <div className="absolute inset-0 z-10">
            <QRScannerFrame />
            {/* Animated pulse - scanning */}
            {scanStatus === "scanning" && (
              <div className="absolute inset-0 rounded-4xl animate-pulse bg-gradient-to-br from-blue-500/10 via-blue-700/10 to-indigo-500/10 shadow-[0_0_0_8px_rgba(57,106,252,0.12)] pointer-events-none" />
            )}
            <div className="absolute inset-0 rounded-4xl bg-white/6 backdrop-blur-[4px] shadow-inner pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SCANNING shimmer/loader */}
      {scanStatus === "scanning" && (
        <div className="absolute left-1/2 bottom-[18vh] -translate-x-1/2 flex flex-col items-center">
          <LoadingSpinner />
          <span className="mt-2 text-base font-semibold text-white/90">Scanning…</span>
        </div>
      )}

      {/* Show decoded QR result - animate in */}
      {scanStatus === "success" && scanResult && (
        <div className="absolute left-1/2 bottom-[15vh] -translate-x-1/2 w-[90vw] max-w-lg flex items-center justify-center transition-all animate-fade-in">
          <button
            onClick={handleUSSDPress}
            className="w-full py-5 px-6 text-2xl sm:text-3xl font-black rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 shadow-lg hover:scale-105 transition active:scale-95 text-white tracking-widest text-center ring-2 ring-blue-400/40 glow outline-none animate-pulse"
            style={{
              letterSpacing: "0.1em",
            }}
          >
            {scanResult}
          </button>
        </div>
      )}

      {/* If scan failed, show error and retry */}
      {scanStatus === "fail" && (
        <div className="absolute left-1/2 bottom-[15vh] -translate-x-1/2 w-[90vw] max-w-lg flex flex-col items-center transition-all animate-fade-in">
          <div className="bg-red-700/85 rounded-2xl px-5 py-4 text-white font-semibold text-center mb-3 shadow-xl">
            Scan failed — try again or enter manually
          </div>
          <Button variant="secondary" size="lg" onClick={handleRetry} className="shadow-xl animate-pulse flex items-center gap-2">
            <QrCode className="mr-1" /> Retry Scan
          </Button>
        </div>
      )}

      {/* Flashlight suggestion - animated */}
      {showFlashSuggestion && (
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
      )}

      {/* Back button (top left, always visible) */}
      <button
        className="absolute top-4 left-4 z-50 glass-card p-2 rounded-2xl text-white shadow-xl bg-black/30 hover:scale-110 transition-all"
        aria-label="Back"
        onClick={onBack}
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
    </div>
  );
};
export default SmartQRScanner;
