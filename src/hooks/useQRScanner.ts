
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { transactionService } from "@/services/transactionService";
import { validateUSSDFormat, extractPaymentDetails } from "@/utils/ussdHelper";
import { toast } from "@/hooks/use-toast";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

export const useQRScanner = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);

  // Start/stop QR scanner
  useEffect(() => {
    let stopped = false;
    async function startQRScan() {
      setScanStatus("scanning");
      setScanResult(null);
      setTransactionId(null);
      
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
          async (result, err) => {
            if (stopped) return;
            if (result) {
              const ussdCode = result.getText();
              
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
                // Log the scan to Supabase
                const transaction = await transactionService.logQRScan(ussdCode);
                setTransactionId(transaction.id);
                setScanResult(ussdCode);
                setScanStatus("success");
                
                if ("vibrate" in navigator) {
                  navigator.vibrate(120);
                }
                
                toast({
                  title: "QR Code Scanned!",
                  description: `${details.type === 'phone' ? 'Phone' : 'Code'} payment: ${details.amount} RWF`,
                });
                
                scannerControls.current?.stop();
              } catch (error) {
                console.error('Failed to log scan:', error);
                toast({
                  title: "Logging Error",
                  description: "Scan successful but failed to save. You can still proceed.",
                  variant: "destructive"
                });
                setScanResult(ussdCode);
                setScanStatus("success");
                scannerControls.current?.stop();
              }
            }
          }
        );
      } catch (e) {
        console.error('QR Scanner error:', e);
        setScanStatus("fail");
        toast({
          title: "Camera Error",
          description: "Unable to access camera. Please check permissions.",
          variant: "destructive"
        });
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
    setTransactionId(null);
    scannerControls.current?.stop();
    window.location.reload();
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
    videoRef,
    handleRetry,
    handleUSSDLaunch
  };
};
