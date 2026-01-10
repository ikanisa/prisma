
import { describe, it, expect, beforeEach } from 'vitest';
import {
    createGSTFilingAgent,
    GSTFilingAgent
} from '../gst-hst-agent.js';
import type { FinancialStatements } from '@prisma/accounting-canada';

describe('GSTFilingAgent', () => {
    let agent: GSTFilingAgent;

    beforeEach(() => {
        agent = createGSTFilingAgent();
    });

    // Mock transactions
    const mockSales = [
        { id: '1', date: new Date('2025-01-15'), amount: 1000, type: 'sale', customerLocation: 'ON', taxCollected: 130 }, // HST 13%
        { id: '2', date: new Date('2025-01-20'), amount: 1000, type: 'sale', customerLocation: 'AB', taxCollected: 50 },  // GST 5%
        { id: '3', date: new Date('2025-01-25'), amount: 1000, type: 'sale', customerLocation: 'QC', taxCollected: 149.75 }, // GST+QST 14.975%
    ];

    const mockPurchases = [
        { id: '4', date: new Date('2025-01-05'), amount: 500, type: 'expense', vendorLocation: 'ON', taxAmount: 65, category: 'supplies' }, // HST 13%
        { id: '5', date: new Date('2025-01-10'), amount: 200, type: 'expense', vendorLocation: 'ON', taxAmount: 26, category: 'Meals & Entertainment' }, // 50% restricted
    ];

    describe('calculateITCs', () => {
        it('should correctly calculate ITCs', async () => {
            // Access public method
            const result = agent.calculateITCs(mockPurchases, { provinces: ['ON'] } as any);

            // Supplies: 65 (100% claimable)
            // Meals: 26 * 50% = 13 (50% claimable) -> restricted is 13.
            // Total ITCs: 65 + 13 = 78

            expect(result.gstHstPaid).toBeCloseTo(91, 2); // 65 + 26
            expect(result.totalITCs).toBeCloseTo(78, 2);
        });
    });

    describe('validateTaxRates', () => {
        it('should validate Ontario HST rate (13%)', () => {
            const result = agent.validateTaxRate('ON', 0.13);
            expect(result).toBe(true);
        });

        it('should reject incorrect Ontario HST rate', () => {
            const result = agent.validateTaxRate('ON', 0.15); // Old rate or wrong
            expect(result).toBe(false);
        });

        it('should validate Alberta GST rate (5%)', () => {
            const result = agent.validateTaxRate('AB', 0.05);
            expect(result).toBe(true);
        });
    });
});
