
import { useEffect } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { transactionService } from "@/services/transactionService";
import { validateUSSDFormat, extractPaymentDetails } from "@/utils/ussdHelper";
import { toast } from "@/hooks/use-toast";
import { useScannerState } from "./useScannerState";
import { useCameraManager } from "./useCameraManager";
import { useScannerPerformance } from "./useScannerPerformance";
import { useScannerActions } from "./useScannerActions";

export const useQRScanner = () => {
  const {
    scanStatus,
    setScanStatus,
    scanResult,
    setScanResult,
    transactionId,
    setTransactionId,
    scanAttempts,
    resetScanState,
    incrementAttempts,
    resetAttempts
  } = useScannerState();

  const {
    cameraDevices,
    html5QrCodeRef,
    videoRef,
    getCameraDevices,
    getPerformanceOptimizedConfig,
    selectOptimalCamera,
    stopScanner
  } = useCameraManager();

  const {
    scanDuration,
    startDurationTracking,
    stopDurationTracking,
    resetDuration
  } = useScannerPerformance();

  const { handleUSSDLaunch: handleUSSDLaunchAction } = useScannerActions();

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
      await stopScanner();

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
      await stopScanner();
    }
  };

  // Start QR scanner with performance optimizations
  const startScanner = async () => {
    await stopScanner();

    setScanStatus("scanning");
    setScanResult(null);
    setTransactionId(null);
    incrementAttempts();
    
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
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      });
      html5QrCodeRef.current = html5QrCode;

      // Performance-optimized scanning configuration
      const config = getPerformanceOptimizedConfig();
      const selectedDeviceId = selectOptimalCamera(devices);

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

  // Start scanner on mount
  useEffect(() => {
    startScanner();

    // Cleanup on unmount
    return () => {
      stopDurationTracking();
      stopScanner();
    };
  }, []);

  const handleRetry = async () => {
    resetScanState();
    resetAttempts();
    resetDuration();
    
    await stopScanner();
    await startScanner();
  };

  const handleUSSDLaunch = () => {
    handleUSSDLaunchAction(scanResult, transactionId);
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
