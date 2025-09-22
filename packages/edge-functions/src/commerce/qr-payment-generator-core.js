import { z } from 'zod';

// Local, lightweight UUID validator – keeps the core completely self-contained
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format');

export const qrPaymentGeneratorInputSchema = z.object({
  payment_id: uuidSchema,
});

/**
 * Generate a *deterministic* fake QR code string for a payment. The goal is to
 * make the behaviour easy to unit-test without pulling heavy binary
 * dependencies into the edge package.
 *
 * @param {{ payment_id: string }} input
 * @returns {{ payment_id: string; qr_code_data: string }}
 */
export function generateQrPayment(input) {
  const { payment_id } = qrPaymentGeneratorInputSchema.parse(input);

  // Reverse the uuid so that we can reliably extract it later on.
  const qr_code_data = `FAKE_QR::${[...payment_id].reverse().join('')}`;

  return { payment_id, qr_code_data };
}
