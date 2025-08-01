import { describe, it, expect } from 'vitest';

import { generateQrPayment } from '../src/commerce/qr-payment-generator-core';
import { processQrScan } from '../src/commerce/process-qr-scan-core';

describe('QR-payment generator & scan processor', () => {
  it('generates a deterministic fake QR string for a given payment id', () => {
    const paymentId = '123e4567-e89b-12d3-a456-426614174000';

    const { qr_code_data } = generateQrPayment({ payment_id: paymentId });

    // Expected format: FAKE_QR::<reversed-payment-id>
    const expected = `FAKE_QR::${[...paymentId].reverse().join('')}`;
    expect(qr_code_data).toBe(expected);
  });

  it('processes a scanned QR string and recovers the original payment id', () => {
    const paymentId = '987e6543-e21b-45d3-b654-426614174111';
    const qrData = generateQrPayment({ payment_id: paymentId }).qr_code_data;

    const { payment_id: extracted } = processQrScan({ scanned_data: qrData });

    expect(extracted).toBe(paymentId);
  });

  it('throws if scanned data has an unexpected format', () => {
    expect(() => processQrScan({ scanned_data: 'INVALID_DATA' })).toThrow();
  });
});

