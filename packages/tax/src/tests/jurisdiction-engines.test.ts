/**
 * Multi-Jurisdiction Tax Engine Tests
 * 
 * Tests for Malta VAT, Canada GST/HST, and Rwanda EBM engines
 */

import { describe, it, expect } from 'vitest';
import { MaltaVATEngine, MALTA_VAT_RATES } from '../services/malta-vat-engine.js';
import { CanadaGSTEngine, CANADA_PROVINCIAL_RATES } from '../services/canada-gst-engine.js';
import { RwandaEBMService, RWANDA_TAX_RATES } from '../services/rwanda-ebm-service.js';

describe('MaltaVATEngine', () => {
    const engine = new MaltaVATEngine();

    describe('VAT Calculation', () => {
        it('should calculate standard rate (18%)', () => {
            const result = engine.calculateVAT(1000, 'standard');
            expect(result.vatRate).toBe(18);
            expect(result.vatAmount).toBe(180);
            expect(result.grossAmount).toBe(1180);
            expect(result.currency).toBe('EUR');
        });

        it('should calculate reduced rate 12%', () => {
            const result = engine.calculateVAT(1000, 'reduced_12');
            expect(result.vatRate).toBe(12);
            expect(result.vatAmount).toBe(120);
        });

        it('should calculate reduced rate 7%', () => {
            const result = engine.calculateVAT(1000, 'reduced_7');
            expect(result.vatRate).toBe(7);
            expect(result.vatAmount).toBe(70);
        });

        it('should calculate reduced rate 5%', () => {
            const result = engine.calculateVAT(1000, 'reduced_5');
            expect(result.vatRate).toBe(5);
            expect(result.vatAmount).toBe(50);
        });

        it('should calculate zero rate', () => {
            const result = engine.calculateVAT(1000, 'zero');
            expect(result.vatRate).toBe(0);
            expect(result.vatAmount).toBe(0);
        });

        it('should apply reverse charge for EU B2B', () => {
            const result = engine.calculateVAT(1000, 'standard', {
                customerCountry: 'DE',
                customerVATNumber: 'DE123456789',
                isB2B: true,
            });
            expect(result.reverseCharge).toBe(true);
            expect(result.vatAmount).toBe(0);
        });
    });

    describe('SME Scheme Eligibility', () => {
        it('should detect Article 11 eligibility for domestic SME', () => {
            const result = engine.checkSMESchemeEligibility(30000, 0);
            expect(result.article11Eligible).toBe(true);
            expect(result.article11AEligible).toBe(true);
        });

        it('should detect exceeded domestic threshold', () => {
            const result = engine.checkSMESchemeEligibility(40000, 0);
            expect(result.article11Eligible).toBe(false);
            expect(result.nextAction).toBe('REGISTER_ARTICLE_10');
        });
    });
});

describe('CanadaGSTEngine', () => {
    const engine = new CanadaGSTEngine();

    describe('HST Provinces', () => {
        it('should calculate Ontario HST (13%)', () => {
            const result = engine.calculateTax(1000, 'ON');
            expect(result.method).toBe('HST');
            expect(result.hstAmount).toBe(130);
            expect(result.totalTax).toBe(130);
            expect(result.grossAmount).toBe(1130);
        });

        it('should calculate Nova Scotia HST (15%)', () => {
            const result = engine.calculateTax(1000, 'NS');
            expect(result.hstAmount).toBe(150);
        });
    });

    describe('GST + PST Provinces', () => {
        it('should calculate BC GST (5%) + PST (7%)', () => {
            const result = engine.calculateTax(1000, 'BC');
            expect(result.method).toBe('GST_PST');
            expect(result.gstAmount).toBe(50);
            expect(result.pstAmount).toBe(70);
            expect(result.totalTax).toBe(120);
        });

        it('should calculate SK GST (5%) + PST (6%)', () => {
            const result = engine.calculateTax(1000, 'SK');
            expect(result.gstAmount).toBe(50);
            expect(result.pstAmount).toBe(60);
            expect(result.totalTax).toBe(110);
        });
    });

    describe('GST + QST (Quebec)', () => {
        it('should calculate Quebec GST (5%) + QST (9.975%)', () => {
            const result = engine.calculateTax(1000, 'QC');
            expect(result.method).toBe('GST_QST');
            expect(result.gstAmount).toBe(50);
            expect(result.qstAmount).toBeCloseTo(99.75, 1);
            expect(result.totalTax).toBeCloseTo(149.75, 1);
        });
    });

    describe('GST Only Provinces', () => {
        it('should calculate Alberta GST only (5%)', () => {
            const result = engine.calculateTax(1000, 'AB');
            expect(result.method).toBe('GST_ONLY');
            expect(result.gstAmount).toBe(50);
            expect(result.totalTax).toBe(50);
        });
    });

    describe('ITC Calculation', () => {
        it('should calculate ITCs for eligible expenses', () => {
            const expenses = [
                { amount: 1000, gstHstPaid: 130, documentation: 'complete' as const },
                { amount: 500, gstHstPaid: 65, documentation: 'complete' as const },
            ];
            const result = engine.calculateITC(expenses, '2025-Q1');
            expect(result.itcAmount).toBe(195);
            expect(result.documentation).toBe('complete');
        });

        it('should exclude incomplete documentation from ITCs', () => {
            const expenses = [
                { amount: 1000, gstHstPaid: 130, documentation: 'complete' as const },
                { amount: 500, gstHstPaid: 65, documentation: 'missing' as const },
            ];
            const result = engine.calculateITC(expenses, '2025-Q1');
            expect(result.itcAmount).toBe(130); // Only complete docs
            expect(result.documentation).toBe('missing');
        });
    });

    describe('Filing Frequency', () => {
        it('should return annual for small businesses', () => {
            expect(engine.getFilingFrequency(500_000)).toBe('annual');
        });

        it('should return quarterly for medium businesses', () => {
            expect(engine.getFilingFrequency(3_000_000)).toBe('quarterly');
        });

        it('should return monthly for large businesses', () => {
            expect(engine.getFilingFrequency(10_000_000)).toBe('monthly');
        });
    });
});

describe('RwandaEBMService', () => {
    const service = new RwandaEBMService();

    describe('VAT Calculation', () => {
        it('should calculate 18% VAT', () => {
            const result = service.calculateVAT(100000);
            expect(result.vatRate).toBe(18);
            expect(result.vatAmount).toBe(18000);
            expect(result.grossAmount).toBe(118000);
            expect(result.currency).toBe('RWF');
        });
    });

    describe('Digital Services Tax', () => {
        it('should calculate 1.5% DST', () => {
            const result = service.calculateDigitalServicesTax(1000000);
            expect(result.dstRate).toBe(1.5);
            expect(result.dstAmount).toBe(15000);
        });
    });

    describe('Tourism Levy', () => {
        it('should calculate 3% tourism levy', () => {
            const result = service.calculateTourismLevy(500000);
            expect(result.levy).toBe(15000);
            expect(result.total).toBe(515000);
        });
    });

    describe('EBM Invoice', () => {
        it('should create valid EBM invoice', () => {
            const invoice = service.createEBMInvoice({
                invoiceNumber: 'INV-001',
                taxpayerTIN: '123456789',
                customerName: 'Test Customer',
                items: [
                    { description: 'Product A', quantity: 2, unitPrice: 50000, totalPrice: 100000 },
                ],
            });

            expect(invoice.taxableAmount).toBe(100000);
            expect(invoice.vatAmount).toBe(18000);
            expect(invoice.totalAmount).toBe(118000);
            expect(invoice.ebmStatus).toBe('pending');
        });

        it('should validate EBM invoice format', () => {
            const invoice = service.createEBMInvoice({
                invoiceNumber: 'INV-001',
                taxpayerTIN: '123456789',
                customerName: 'Test Customer',
                items: [{ description: 'Test', quantity: 1, unitPrice: 10000, totalPrice: 10000 }],
            });

            const validation = service.validateEBMInvoice(invoice);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('should fail validation for missing TIN', () => {
            const invoice = {
                invoiceNumber: 'INV-001',
                taxpayerTIN: '',
                issueDate: '2025-01-10',
                customerName: 'Test',
                items: [{ description: 'Test', quantity: 1, unitPrice: 10000, totalPrice: 10000, vatAmount: 1800 }],
                taxableAmount: 10000,
                vatAmount: 1800,
                totalAmount: 11800,
                ebmStatus: 'pending' as const,
            };

            const validation = service.validateEBMInvoice(invoice);
            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Taxpayer TIN is required');
        });
    });

    describe('VAT Registration', () => {
        it('should require registration above annual threshold', () => {
            const result = service.checkVATRegistrationRequired(25000000);
            expect(result.required).toBe(true);
            expect(result.thresholdType).toBe('annual');
        });

        it('should require registration above quarterly threshold', () => {
            const result = service.checkVATRegistrationRequired(15000000, 6000000);
            expect(result.required).toBe(true);
            expect(result.thresholdType).toBe('quarterly');
        });

        it('should not require registration below thresholds', () => {
            const result = service.checkVATRegistrationRequired(15000000, 3000000);
            expect(result.required).toBe(false);
        });
    });

    describe('Withholding Tax', () => {
        it('should calculate 15% withholding on services', () => {
            const result = service.calculateWithholdingTax(100000, 'services');
            expect(result.rate).toBe(15);
            expect(result.withholdingAmount).toBe(15000);
        });
    });
});
