
import { transactionService } from "@/services/transactionService";
import { toast } from "@/hooks/use-toast";

export const useScannerActions = () => {
  const handleUSSDLaunch = async (scanResult: string | null, transactionId: string | null) => {
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
    handleUSSDLaunch
  };
};
