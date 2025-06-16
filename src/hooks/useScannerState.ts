
import { useState } from "react";

type ScanStatus = "idle" | "scanning" | "success" | "fail" | "processing";

export const useScannerState = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);

  const resetScanState = () => {
    setScanStatus("idle");
    setScanResult(null);
    setTransactionId(null);
    setScanAttempts(0);
  };

  const incrementAttempts = () => {
    setScanAttempts(prev => prev + 1);
  };

  const resetAttempts = () => {
    setScanAttempts(0);
  };

  return {
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
  };
};
