
import { ScanResult } from '@/services/QRScannerService';
import { aiUssdValidationService, AIValidationResult } from '@/services/aiUssdValidationService';
import { transactionService, Transaction } from '@/services/transactionService';
import { extractUssdFromQR } from '@/utils/universalUssdHelper';

export const useUniversalQRScannerActions = () => {
  const processScanResult = async (
    result: ScanResult,
    onSuccess: (enhancedResult: ScanResult, validation: AIValidationResult, transaction?: Transaction) => void
  ) => {
    console.log('useUniversalQRScannerActions: Processing scan result:', result);
    
    // Extract and validate USSD with AI enhancement
    const extractedUssd = extractUssdFromQR(result.code);
    const validation = await aiUssdValidationService.validateWithAI(extractedUssd || result.code);
    
    // Enhanced result with validation
    const enhancedResult: ScanResult = {
      ...result,
      ussdCode: validation.sanitized,
      confidence: validation.isValid ? result.confidence : 0.3
    };
    
    // Log transaction with enhanced data
    try {
      const transaction = await transactionService.logQRScan(result.code, validation);
      onSuccess(enhancedResult, validation, transaction);
    } catch (error) {
      console.error('Failed to log transaction:', error);
      onSuccess(enhancedResult, validation);
    }
  };

  const processManualInput = async (
    code: string,
    onSuccess: (result: ScanResult, validation: AIValidationResult, transaction?: Transaction) => void
  ) => {
    const extractedUssd = extractUssdFromQR(code);
    const validation = await aiUssdValidationService.validateWithAI(extractedUssd || code);
    
    if (validation.isValid || code.length > 5) {
      const result: ScanResult = {
        success: true,
        code,
        ussdCode: validation.sanitized,
        confidence: validation.isValid ? 0.8 : 0.5,
        timestamp: Date.now()
      };
      
      // Log transaction for manual input
      try {
        const transaction = await transactionService.logQRScan(code, validation);
        onSuccess(result, validation, transaction);
      } catch (error) {
        console.error('Failed to log manual transaction:', error);
        onSuccess(result, validation);
      }
    }
  };

  const launchUssd = async (ussdCode: string, transactionId?: string) => {
    try {
      const telURI = `tel:${encodeURIComponent(ussdCode)}`;
      
      // Log USSD launch
      if (transactionId) {
        await transactionService.logUSSDLaunch(transactionId);
      }
      
      window.location.href = telURI;
      console.log('useUniversalQRScannerActions: Launched USSD with:', telURI);
    } catch (error) {
      console.error('useUniversalQRScannerActions: Failed to launch USSD:', error);
      throw new Error('Failed to launch dialer');
    }
  };

  return {
    processScanResult,
    processManualInput,
    launchUssd
  };
};
