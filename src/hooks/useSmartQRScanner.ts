
import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { validateUSSDFormat, extractPaymentDetails } from "@/utils/ussdHelper";
import { transactionService } from "@/services/transactionService";
import { toast } from "@/hooks/use-toast";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

export const useSmartQRScanner = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [scanDuration, setScanDuration] = useState(0);
  const [lightLevel, setLightLevel] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanStartTimeRef = useRef<number | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Light sensor with fallback
  useEffect(() => {
    if ("AmbientLightSensor" in window) {
      try {
        // @ts-ignore
        const sensor = new window.AmbientLightSensor({ frequency: 2 });
        sensor.addEventListener("reading", () => {
          setLightLevel(sensor.illuminance);
        });
        sensor.start();
        return () => sensor.stop();
      } catch (e) {
        // Fallback based on time
        const hour = new Date().getHours();
        const fallbackLight = hour >= 6 && hour <= 18 ? 400 : 20;
        setLightLevel(fallbackLight);
      }
    }
  }, []);

  // Show flash button based on light and attempts
  useEffect(() => {
    const needsFlash = (lightLevel && lightLevel < 80) || scanAttempts >= 2;
    setShowFlash(needsFlash);
  }, [lightLevel, scanAttempts]);

  const startDurationTracking = useCallback(() => {
    const startTime = Date.now();
    scanStartTimeRef.current = startTime;
    setScanDuration(0);
    
    durationTimerRef.current = setInterval(() => {
      setScanDuration(Date.now() - startTime);
    }, 1000);
  }, []);

  const stopDurationTracking = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const handleScanSuccess = useCallback(async (ussdCode: string) => {
    if (!validateUSSDFormat(ussdCode)) {
      toast({
        title: "Invalid QR Code",
        description: "This QR code doesn't contain a valid Rwanda MoMo payment code",
        variant: "destructive"
      });
      setScanStatus("fail");
      return;
    }

    const details = extractPaymentDetails(ussdCode);
    if (details.type === 'unknown') {
      toast({
        title: "Unsupported Format",
        description: "This payment format is not supported",
        variant: "destructive"
      });
      setScanStatus("fail");
      return;
    }

    try {
      await stopScanner();
      const transaction = await transactionService.logQRScan(ussdCode);
      setScanResult(ussdCode);
      setScanStatus("success");
      stopDurationTracking();
      
      if ("vibrate" in navigator) {
        navigator.vibrate([120, 50, 120]);
      }
      
      toast({
        title: "QR Code Scanned!",
        description: `Payment: ${details.amount} RWF`,
      });
      
    } catch (error) {
      console.error('Scan logging failed:', error);
      setScanResult(ussdCode);
      setScanStatus("success");
      stopDurationTracking();
    }
  }, [scanAttempts, scanDuration]);

  const getOptimalConfig = useCallback(() => {
    const memory = (navigator as any).deviceMemory || 4;
    const fps = memory < 3 ? 6 : memory >= 8 ? 15 : 10;
    const qrBoxSize = memory < 3 ? 240 : memory >= 8 ? 320 : 280;
    
    return {
      fps,
      qrbox: { width: qrBoxSize, height: qrBoxSize },
      aspectRatio: 1.0,
      disableFlip: false
    };
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();
    setScanStatus("scanning");
    setScanResult(null);
    setScanAttempts(prev => prev + 1);
    startDurationTracking();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setScanStatus("fail");
        stopDurationTracking();
        toast({
          title: "No Camera Found",
          description: "No camera devices found on this device",
          variant: "destructive"
        });
        return;
      }

      const rearCamera = devices.find(device => 
        device.label?.toLowerCase().includes('back') || 
        device.label?.toLowerCase().includes('rear')
      );
      const selectedDeviceId = rearCamera ? rearCamera.id : devices[0].id;

      const html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      const config = getOptimalConfig();
      
      await html5QrCode.start(
        selectedDeviceId,
        config,
        handleScanSuccess,
        () => {} // Silent error handling
      );

    } catch (error) {
      console.error("Scanner error:", error);
      setScanStatus("fail");
      stopDurationTracking();
      
      if (error.message?.includes("Permission")) {
        toast({
          title: "Camera Permission Required",
          description: "Please allow camera access to scan QR codes",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Scanner Error",
          description: "Failed to initialize camera. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [handleScanSuccess, getOptimalConfig, startDurationTracking, stopDurationTracking]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        // Silent fail
      }
    }
  }, []);

  const retryScanning = useCallback(async () => {
    setScanAttempts(0);
    setScanDuration(0);
    await startScanner();
  }, [startScanner]);

  // Start scanner on mount
  useEffect(() => {
    startScanner();
    return () => {
      stopDurationTracking();
      stopScanner();
    };
  }, []);

  return {
    scanStatus,
    setScanStatus,
    scanResult,
    scanAttempts,
    scanDuration,
    lightLevel,
    showFlash,
    retryScanning,
    stopScanner
  };
};
