import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { transactionService } from "@/services/transactionService";
import { validateUSSDFormat, extractPaymentDetails } from "@/utils/ussdHelper";
import { toast } from "@/hooks/use-toast";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

export const useQRScanner = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [scanDuration, setScanDuration] = useState(0);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraDevices, setCameraDevices] = useState<any[]>([]);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced camera device enumeration
  const getCameraDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      console.log("Available camera devices:", devices);
      setCameraDevices(devices);
      return devices;
    } catch (error) {
      console.error("Failed to get camera devices:", error);
      return [];
    }
  };

  // Performance-optimized duration tracking
  const startDurationTracking = () => {
    const startTime = Date.now();
    setScanStartTime(startTime);
    setScanDuration(0);
    
    // Use lower frequency timer for better performance
    durationTimerRef.current = setInterval(() => {
      setScanDuration(Date.now() - startTime);
    }, 1000); // Update every second instead of more frequently
  };

  const stopDurationTracking = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  // Performance-aware scanner configuration
  const getPerformanceOptimizedConfig = () => {
    // Detect device performance
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    let fps = 10;
    let qrBoxSize = 280;
    
    // Adjust for low-performance devices
    if (memory < 3 || cores < 4) {
      fps = 6;
      qrBoxSize = 240;
    } else if (memory >= 8 && cores >= 8) {
      fps = 15;
      qrBoxSize = 320;
    }
    
    return {
      fps,
      qrbox: { width: qrBoxSize, height: qrBoxSize },
      aspectRatio: 1.0,
      disableFlip: false,
      // Disable some features for better performance on low-end devices
      showTorchButtonIfSupported: memory >= 4,
      showZoomSliderIfSupported: memory >= 6
    };
  };

  // Start QR scanner with performance optimizations
  const startScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.log("Scanner was not running");
      }
    }

    setScanStatus("scanning");
    setScanResult(null);
    setTransactionId(null);
    setScanAttempts(prev => prev + 1);
    
    // Start tracking scan duration
    startDurationTracking();

    try {
      const devices = await getCameraDevices();
      
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

      // Create new Html5Qrcode instance with performance-optimized configuration
      const html5QrCode = new Html5Qrcode("reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        // Disable experimental features for better compatibility
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      });
      html5QrCodeRef.current = html5QrCode;

      // Performance-optimized scanning configuration
      const config = getPerformanceOptimizedConfig();

      // Smart camera selection with fallback logic
      let selectedDeviceId = null;
      const rearCamera = devices.find(device => 
        device.label?.toLowerCase().includes('back') || 
        device.label?.toLowerCase().includes('rear') ||
        device.label?.toLowerCase().includes('environment')
      );
      
      if (rearCamera) {
        selectedDeviceId = rearCamera.id;
      } else {
        selectedDeviceId = devices[0].id;
      }

      console.log(`[Scanner] Starting with camera: ${selectedDeviceId}, attempt: ${scanAttempts + 1}, config:`, config);

      // Start scanning with enhanced error handling
      await html5QrCode.start(
        selectedDeviceId,
        config,
        async (decodedText) => {
          console.log("QR Code detected:", decodedText);
          stopDurationTracking();
          await handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Silent error handling during scanning - reduce console spam for performance
          if (errorMessage.includes("NotFoundException")) {
            // Only log every 10th "not found" error to reduce console spam
            if (Math.random() < 0.1) {
              console.log("Scan error (periodic):", errorMessage);
            }
          } else {
            console.log("Scan error (normal):", errorMessage);
          }
        }
      );

      // Set up 7-second failure detection for intelligent guidance
      setTimeout(() => {
        if (scanStatus === "scanning" && scanDuration > 7000) {
          console.log("[Scanner] 7-second timeout reached, suggesting alternatives");
          // Don't auto-fail, but the tips component will show urgent guidance
        }
      }, 7000);

    } catch (error) {
      console.error("Scanner initialization error:", error);
      setScanStatus("fail");
      stopDurationTracking();
      
      // Enhanced error messages with context
      if (error.message?.includes("Permission")) {
        toast({
          title: "Camera Permission Required",
          description: "Please allow camera access to scan QR codes",
          variant: "destructive"
        });
      } else if (error.message?.includes("NotFoundError")) {
        toast({
          title: "Camera Not Available",
          description: "No camera found or camera is being used by another app",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Scanner Error",
          description: `Failed to initialize camera (attempt ${scanAttempts}). Please try again.`,
          variant: "destructive"
        });
      }
    }
  };

  const handleScanSuccess = async (ussdCode: string) => {
    // Validate Rwanda MoMo USSD format
    if (!validateUSSDFormat(ussdCode)) {
      toast({
        title: "Invalid QR Code",
        description: "This QR code doesn't contain a valid Rwanda MoMo payment code",
        variant: "destructive"
      });
      setScanStatus("fail");
      return;
    }

    // Extract payment details for validation
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
      // Stop scanner
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
      }

      // Log the scan to Supabase with attempt count
      const transaction = await transactionService.logQRScan(ussdCode);
      setTransactionId(transaction.id);
      setScanResult(ussdCode);
      setScanStatus("success");
      
      // Enhanced haptic feedback for success
      if ("vibrate" in navigator) {
        navigator.vibrate([120, 50, 120]);
      }
      
      toast({
        title: "QR Code Scanned!",
        description: `${details.type === 'phone' ? 'Phone' : 'Code'} payment: ${details.amount} RWF (${scanAttempts} attempts)`,
      });
      
      console.log(`[Scanner] Success after ${scanAttempts} attempts in ${scanDuration}ms`);
      
    } catch (error) {
      console.error('Failed to log scan:', error);
      toast({
        title: "Logging Error",
        description: "Scan successful but failed to save. You can still proceed.",
        variant: "destructive"
      });
      setScanResult(ussdCode);
      setScanStatus("success");
      
      // Stop scanner even if logging fails
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (stopError) {
          console.error("Error stopping scanner:", stopError);
        }
      }
    }
  };

  // Start scanner on mount
  useEffect(() => {
    startScanner();

    // Cleanup on unmount
    return () => {
      stopDurationTracking();
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleRetry = async () => {
    setScanStatus("idle");
    setScanResult(null);
    setTransactionId(null);
    // Reset attempt counter on manual retry
    setScanAttempts(0);
    setScanDuration(0);
    stopDurationTracking();
    
    // Stop current scanner if running
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.log("Scanner was not running");
      }
    }
    
    // Restart scanner
    await startScanner();
  };

  const handleUSSDLaunch = async () => {
    if (!scanResult) return;
    
    // Log USSD launch if we have a transaction ID
    if (transactionId) {
      try {
        await transactionService.logUSSDLaunch(transactionId);
        toast({
          title: "Launch Logged",
          description: "Payment launch has been recorded",
        });
      } catch (error) {
        console.error('Failed to log USSD launch:', error);
      }
    }
    
    // Launch USSD dialer
    const telUri = `tel:${encodeURIComponent(scanResult)}`;
    window.location.href = telUri;
  };

  return {
    scanStatus,
    setScanStatus,
    scanResult,
    setScanResult,
    transactionId,
    scanAttempts,
    scanDuration,
    videoRef,
    handleRetry,
    handleUSSDLaunch,
    cameraDevices
  };
};
