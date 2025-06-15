
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

export const useQRScanner = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);

  // Start/stop QR scanner
  useEffect(() => {
    let stopped = false;
    async function startQRScan() {
      setScanStatus("scanning");
      setScanResult(null);
      const codeReader = new BrowserQRCodeReader();
      try {
        const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
        const selectedDeviceId = videoInputDevices?.[0]?.deviceId;
        if (!selectedDeviceId) {
          setScanStatus("fail");
          return;
        }
        
        scannerControls.current = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, err) => {
            if (stopped) return;
            if (result) {
              setScanResult(result.getText());
              setScanStatus("success");
              if ("vibrate" in navigator) {
                navigator.vibrate(120);
              }
              scannerControls.current?.stop();
            }
          }
        );
      } catch (e) {
        console.error('QR Scanner error:', e);
        setScanStatus("fail");
      }
    }
    startQRScan();
    return () => {
      stopped = true;
      scannerControls.current?.stop();
    };
  }, []);

  const handleRetry = () => {
    setScanStatus("scanning");
    setScanResult(null);
    scannerControls.current?.stop();
    window.location.reload();
  };

  return {
    scanStatus,
    setScanStatus,
    scanResult,
    setScanResult,
    videoRef,
    handleRetry
  };
};
