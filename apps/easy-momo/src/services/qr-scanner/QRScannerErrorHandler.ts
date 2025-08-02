
import { toastService } from '../toastService';

export class QRScannerErrorHandler {
  handleInitializationError(error: any): void {
    const errorMessage = this.getErrorMessage(error);
    toastService.error('Camera Error', errorMessage);
  }

  getErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Please allow camera access in your browser settings.';
    } else if (error.name === 'NotFoundError') {
      return 'No camera found on this device.';
    } else if (error.name === 'NotSupportedError') {
      return 'Camera not supported on this device.';
    } else if (error.name === 'NotReadableError') {
      return 'Camera is being used by another application.';
    }
    return 'Unable to access camera. Please try again.';
  }
}
