import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');

export const qrScanInputSchema = z.object({
  scanned_data: z.string().min(1, 'scanned_data must be a non-empty string'),
});

/**
 * Parse the *fake* QR-code string produced by `generateQrPayment` and recover
 * the embedded payment UUID.
 *
 * @param {{ scanned_data: string }} input
 * @returns {{ payment_id: string }}
 */
export function processQrScan(input) {
  const { scanned_data } = qrScanInputSchema.parse(input);

  const PREFIX = 'FAKE_QR::';
  if (!scanned_data.startsWith(PREFIX)) {
    throw new Error('Invalid QR data – missing expected prefix');
  }

  const reversedId = scanned_data.slice(PREFIX.length);
  const payment_id = [...reversedId].reverse().join('');

  uuidSchema.parse(payment_id); // Will throw if not a valid uuid

  return { payment_id };
}
