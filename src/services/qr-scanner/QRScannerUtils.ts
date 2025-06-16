
export class QRScannerUtils {
  createTelURI(ussdCode: string): string {
    const cleanCode = ussdCode.replace(/[^\d*#]/g, '');
    return `tel:${encodeURIComponent(cleanCode)}`;
  }
}
