import assert from 'node:assert/strict';

import { generateQrPayment } from '../src/commerce/qr-payment-generator-core.js';
import { processQrScan } from '../src/commerce/process-qr-scan-core.js';

// ---------------------------------------------------------------------------
// Simple synchronous assertions. Using Node's built-in test facilities keeps
// the runtime footprint tiny and avoids the need for extra tooling that might
// not be permitted in the sandboxed execution environment.
// ---------------------------------------------------------------------------

try {
  const paymentId = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';

  // Validate generator ↔ parser round-trip
  const { qr_code_data } = generateQrPayment({ payment_id: paymentId });
  const { payment_id: parsedId } = processQrScan({ scanned_data: qr_code_data });

  assert.equal(parsedId, paymentId, 'Round-trip payment id mismatch');

  // Invalid scan should throw
  let threw = false;
  try {
    processQrScan({ scanned_data: 'INVALID_DATA' });
  } catch {
    threw = true;
  }
  assert.ok(threw, 'Processing invalid QR data should throw');

  console.log('edge-functions – qr-payment unit tests passed ✔');
} catch (error) {
  console.error(error);
  process.exit(1);
}

