/**
 * Unit Tests for Malta Tax Agents
 * 
 * Tests for:
 * - CIT Refund Calculation Agent
 * - VAT Compliance Agent
 * - PAYE & Social Security Agent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CITRefundCalculationAgent, ProfitType, TaxAccountType } from '../agents/malta/cit-refund-agent.js';
import { VatClassifier, VatRate, VatReturnGenerator } from '../agents/malta/vat-compliance-agent.js';
import { PayeCalculator, PayPeriod } from '../agents/malta/paye-agent.js';

describe('CIT Refund Calculation Agent', () => {
  let agent: CITRefundCalculationAgent;

    beforeEach(() => {
    agent = new CITRefundCalculationAgent();
  });

  describe('Profit Type Classification', () => {
    it('should classify trading income correctly', () => {
      const income = {
        amount: 100000,
        type: 'trading' as const,
        isActiveBusiness: true,
        isMaltaSourced: true
      };

      const profitType = agent.classifyProfitType(income);
      expect(profitType).toBe(ProfitType.TRADING);
    });

    it('should classify participating holding correctly', () => {
      const income = {
        amount: 50000,
        type: 'dividend' as const,
        isActiveBusiness: false,
        isMaltaSourced: false,
        shareholdingPercentage: 10,
        holdingPeriod: 365
      };

      const profitType = agent.classifyProfitType(income);
      expect(profitType).toBe(ProfitType.PARTICIPATING_HOLDING);
    });

    it('should classify passive interest/royalties correctly', () => {
      const income = {
        amount: 25000,
        type: 'interest' as const,
        isActiveBusiness: false,
        isMaltaSourced: true
      };

      const profitType = agent.classifyProfitType(income);
      expect(profitType).toBe(ProfitType.PASSIVE_INTEREST_ROYALTIES);
    });

    it('should classify foreign income with DTT correctly', () => {
      const income = {
        amount: 75000,
        type: 'trading' as const,
        isActiveBusiness: true,
        isMaltaSourced: false,
        isForeign: true,
        hasDoubleTaxTreatyRelief: true
      };

      const profitType = agent.classifyProfitType(income);
      expect(profitType).toBe(ProfitType.FOREIGN_WITH_DTT);
    });
  });

  describe('Refund Calculations', () => {
    it('should calculate 6/7ths refund correctly for trading income', () => {
      const dividendAmount = 65000;  // After 35% CIT
      const citPaid = 35000;         // 35% of €100,000
      const profitType = ProfitType.TRADING;

      const result = agent.calculateRefund(dividendAmount, profitType, citPaid);

      expect(result.refundAmount).toBe(30000);  // 6/7 × €35,000
      expect(result.effectiveTax).toBe(5000);   // €35,000 - €30,000
      expect(result.effectiveRate).toBe(5.0);   // 5% of €100,000
      expect(result.shareholderNetReceipt).toBe(95000);  // €65,000 + €30,000
      expect(result.sourceAccount).toBe(TaxAccountType.MTA);
    });

    it('should calculate 5/7ths refund correctly for passive income', () => {
      const dividendAmount = 65000;
      const citPaid = 35000;
      const profitType = ProfitType.PASSIVE_INTEREST_ROYALTIES;

      const result = agent.calculateRefund(dividendAmount, profitType, citPaid);

      expect(result.refundAmount).toBe(25000);  // 5/7 × €35,000
      expect(result.effectiveTax).toBe(10000);  // €35,000 - €25,000
      expect(result.effectiveRate).toBe(10.0);  // 10% of €100,000
    });

    it('should calculate 2/3rds refund correctly for foreign income with DTT', () => {
      const dividendAmount = 65000;
      const citPaid = 35000;
      const profitType = ProfitType.FOREIGN_WITH_DTT;

      const result = agent.calculateRefund(dividendAmount, profitType, citPaid);

      expect(result.refundAmount).toBeCloseTo(23333.33, 2);  // 2/3 × €35,000
      expect(result.effectiveTax).toBeCloseTo(11666.67, 2);
      expect(result.effectiveRate).toBeCloseTo(11.67, 2);
    });

    it('should calculate full refund for participating holding', () => {
      const dividendAmount = 65000;
      const citPaid = 35000;
      const profitType = ProfitType.PARTICIPATING_HOLDING;

      const result = agent.calculateRefund(dividendAmount, profitType, citPaid);

      expect(result.refundAmount).toBe(35000);  // Full refund
      expect(result.effectiveTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });
});

  describe('Tax Account Allocation', () => {
    it('should allocate trading income to MTA', () => {
      const allocation = agent.allocateProfitToTaxAccounts(
        100000,
        ProfitType.TRADING,
        'entity-123',
        2024
      );

      expect(allocation.mtaBalance).toBe(100000);
      expect(allocation.fiaBalance).toBe(0);
      expect(allocation.ipaBalance).toBe(0);
      expect(allocation.untaxedBalance).toBe(0);
    });

    it('should allocate foreign income with DTT to FIA', () => {
      const allocation = agent.allocateProfitToTaxAccounts(
        100000,
        ProfitType.FOREIGN_WITH_DTT,
        'entity-123',
        2024
      );

      expect(allocation.fiaBalance).toBe(100000);
      expect(allocation.mtaBalance).toBe(0);
    });

    it('should allocate participating holding to untaxed balance', () => {
      const allocation = agent.allocateProfitToTaxAccounts(
        100000,
        ProfitType.PARTICIPATING_HOLDING,
        'entity-123',
        2024
      );

      expect(allocation.untaxedBalance).toBe(100000);
      expect(allocation.mtaBalance).toBe(0);
    });
  });

  describe('Refund Eligibility', () => {
    it('should verify eligible shareholder', () => {
      const eligibility = agent.verifyRefundEligibility({
        isDirectShareholder: true,
        beneficialOwnersDisclosed: true,
        taxExempt: false
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.errors).toHaveLength(0);
    });

    it('should reject indirect shareholder', () => {
      const eligibility = agent.verifyRefundEligibility({
        isDirectShareholder: false,
        beneficialOwnersDisclosed: true,
        taxExempt: false
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.errors.length).toBeGreaterThan(0);
      expect(eligibility.errors[0]).toContain('direct shareholder');
    });

    it('should reject if beneficial owners not disclosed', () => {
      const eligibility = agent.verifyRefundEligibility({
        isDirectShareholder: true,
        beneficialOwnersDisclosed: false,
        taxExempt: false
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.errors[0]).toContain('Beneficial owners');
        });
    });
});

describe('VAT Compliance Agent', () => {
  let classifier: VatClassifier;

    beforeEach(() => {
    classifier = new VatClassifier();
  });

  describe('VAT Classification', () => {
    it('should classify standard rate supply correctly', () => {
      const transaction = {
        id: 'txn-1',
        description: 'Professional services',
        amount: 1180,  // €1,000 + 18% VAT
        customerType: 'B2B' as const,
        customerCountry: 'MT',
        supplierMgaLicensed: false,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.STANDARD_18);
      expect(classification.rateDescription).toContain('Standard 18%');
      expect(classification.netAmount).toBeCloseTo(1000, 2);
      expect(classification.vatAmount).toBeCloseTo(180, 2);
      expect(classification.isExempt).toBe(false);
    });

    it('should classify iGaming B2C as zero-rated', () => {
      const transaction = {
        id: 'txn-2',
        description: 'Online slot gaming',
        amount: 1000,
        customerType: 'B2C' as const,
        customerCountry: 'DE',
        supplierMgaLicensed: true,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.ZERO_RATED);
      expect(classification.rateDescription).toContain('B2C iGaming');
      expect(classification.vatAmount).toBe(0);
      expect(classification.classification).toContain('Gaming');
    });

    it('should classify iGaming B2B as standard rate', () => {
      const transaction = {
        id: 'txn-3',
        description: 'White-label gaming platform',
        amount: 11800,
        customerType: 'B2B' as const,
        customerCountry: 'MT',
        supplierMgaLicensed: true,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.STANDARD_18);
      expect(classification.classification).toContain('B2B Gaming');
    });

    it('should classify hotel accommodation as reduced 7%', () => {
      const transaction = {
        id: 'txn-4',
        description: 'Hotel accommodation',
        amount: 1070,
        customerType: 'B2C' as const,
        customerCountry: 'MT',
        supplierMgaLicensed: false,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.REDUCED_7);
      expect(classification.rateDescription).toContain('7%');
      expect(classification.netAmount).toBeCloseTo(1000, 2);
      expect(classification.vatAmount).toBeCloseTo(70, 2);
    });

    it('should classify books as reduced 5%', () => {
      const transaction = {
        id: 'txn-5',
        description: 'Books and publications',
        amount: 1050,
        customerType: 'B2C' as const,
        customerCountry: 'MT',
        supplierMgaLicensed: false,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.REDUCED_5);
      expect(classification.rateDescription).toContain('5%');
    });

    it('should classify exports as zero-rated', () => {
      const transaction = {
        id: 'txn-6',
        description: 'Software license',
        amount: 1000,
        customerType: 'B2B' as const,
        customerCountry: 'US',
        supplierMgaLicensed: false,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.ZERO_RATED);
      expect(classification.classification).toContain('Export');
      expect(classification.vatAmount).toBe(0);
    });

    it('should classify financial services as exempt', () => {
      const transaction = {
        id: 'txn-7',
        description: 'Banking services',
        amount: 1000,
        customerType: 'B2B' as const,
        customerCountry: 'MT',
        supplierMgaLicensed: false,
        type: 'sale' as const,
        date: new Date()
      };

      const classification = classifier.classifyTransaction(transaction);

      expect(classification.rate).toBe(VatRate.EXEMPT);
      expect(classification.isExempt).toBe(true);
      expect(classification.vatAmount).toBe(0);
      expect(classification.justification).toContain('No VAT charged');
    });
});

  describe('VAT Return Generation', () => {
    it('should generate VAT return from transactions', () => {
      const generator = new VatReturnGenerator();

      const transactions = [
        {
          id: 'txn-1',
          description: 'Standard services',
          amount: 1180,
          customerType: 'B2B' as const,
          customerCountry: 'MT',
          supplierMgaLicensed: false,
          type: 'sale' as const,
          date: new Date('2024-01-15')
        },
        {
          id: 'txn-2',
          description: 'Hotel accommodation',
          amount: 1070,
          customerType: 'B2C' as const,
          customerCountry: 'MT',
          supplierMgaLicensed: false,
          type: 'sale' as const,
          date: new Date('2024-01-20')
        }
      ];

      const vatReturn = generator.generateVatReturn(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'MT12345678',
        transactions
      );

      expect(vatReturn.vatNumber).toBe('MT12345678');
      expect(vatReturn.sales.standardRate.grossAmount).toBeGreaterThan(0);
      expect(vatReturn.sales.reduced7Rate.grossAmount).toBeGreaterThan(0);
      expect(vatReturn.totalOutputVat).toBeGreaterThan(0);
    });
  });
});

describe('PAYE & Social Security Agent', () => {
  let calculator: PayeCalculator;

  beforeEach(() => {
    calculator = new PayeCalculator();
  });

  describe('PAYE Calculation', () => {
    it('should calculate PAYE for single employee with no allowances', () => {
      const employee = {
        id: 'emp-1',
        idCardNumber: '12345678M',
        fullName: 'John Doe',
        maritalStatus: 'single' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const calculation = calculator.calculatePAYE(employee, 2000, PayPeriod.MONTHLY);

      expect(calculation.grossSalary).toBe(2000);
      expect(calculation.incomeTax).toBeGreaterThan(0);
      expect(calculation.socialSecurity).toBe(200);  // 10% of €2,000
      expect(calculation.employerNI).toBe(200);
      expect(calculation.netPay).toBeLessThan(calculation.grossSalary);
      expect(calculation.totalCost).toBe(2200);  // €2,000 + €200 employer NI
    });

    it('should apply married allowance', () => {
      const singleEmployee = {
        id: 'emp-2',
        idCardNumber: '87654321M',
        fullName: 'Jane Single',
        maritalStatus: 'single' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const marriedEmployee = {
        id: 'emp-3',
        idCardNumber: '11223344M',
        fullName: 'Jane Married',
        maritalStatus: 'married' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const singleCalc = calculator.calculatePAYE(singleEmployee, 1500, PayPeriod.MONTHLY);
      const marriedCalc = calculator.calculatePAYE(marriedEmployee, 1500, PayPeriod.MONTHLY);

      // Married employee should have lower tax due to higher allowance
      expect(marriedCalc.incomeTax).toBeLessThan(singleCalc.incomeTax);
    });

    it('should apply parent allowance per child', () => {
      const employeeNoChildren = {
        id: 'emp-4',
        idCardNumber: '55667788M',
        fullName: 'Parent Zero',
        maritalStatus: 'married' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const employeeTwoChildren = {
        id: 'emp-5',
        idCardNumber: '99887766M',
        fullName: 'Parent Two',
        maritalStatus: 'married' as const,
        numberOfChildren: 2,
        hasDisability: false
      };

      const noChildrenCalc = calculator.calculatePAYE(employeeNoChildren, 2000, PayPeriod.MONTHLY);
      const twoChildrenCalc = calculator.calculatePAYE(employeeTwoChildren, 2000, PayPeriod.MONTHLY);

      // Employee with 2 children should have lower tax
      expect(twoChildrenCalc.incomeTax).toBeLessThan(noChildrenCalc.incomeTax);
    });

    it('should calculate social security correctly (10% no cap)', () => {
      const employee = {
        id: 'emp-6',
        idCardNumber: '11111111M',
        fullName: 'High Earner',
        maritalStatus: 'single' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const highSalary = 10000;  // €10,000 monthly
      const calculation = calculator.calculatePAYE(employee, highSalary, PayPeriod.MONTHLY);

      expect(calculation.socialSecurity).toBe(1000);  // 10% of €10,000
      expect(calculation.employerNI).toBe(1000);
      expect(calculation.totalCost).toBe(11000);
    });
});

  describe('FS3 Reconciliation', () => {
    it('should calculate FS3 totals correctly', () => {
      const payrollRecords: Array<{ employeeId: string; grossSalary: number; payPeriod: PayPeriod; incomeTax: number; socialSecurity: number; netPay: number; employerNI: number; totalCost: number; annualizedSalary: number; taxableIncome: number }> = [];

      const employee1 = {
        id: 'emp-1',
        idCardNumber: '12345678M',
        fullName: 'Employee 1',
        maritalStatus: 'single' as const,
        numberOfChildren: 0,
        hasDisability: false
      };

      const employee2 = {
        id: 'emp-2',
        idCardNumber: '87654321M',
        fullName: 'Employee 2',
        maritalStatus: 'married' as const,
        numberOfChildren: 1,
        hasDisability: false
      };

      // Generate multiple payroll records
      for (let month = 1; month <= 12; month++) {
        payrollRecords.push(calculator.calculatePAYE(employee1, 2000, PayPeriod.MONTHLY));
        payrollRecords.push(calculator.calculatePAYE(employee2, 2500, PayPeriod.MONTHLY));
      }

      const reconciliation = calculator.calculateFS3Reconciliation(
        'entity-123',
        2024,
        payrollRecords
      );

      expect(reconciliation.entityId).toBe('entity-123');
      expect(reconciliation.fiscalYear).toBe(2024);
      expect(reconciliation.employeeCount).toBe(2);
      expect(reconciliation.totalGrossPay).toBeGreaterThan(0);
      expect(reconciliation.totalIncomeTax).toBeGreaterThan(0);
      expect(reconciliation.totalEmployeeNI).toBeGreaterThan(0);
      expect(reconciliation.totalEmployerNI).toBeGreaterThan(0);
      expect(reconciliation.totalNetPay).toBeLessThan(reconciliation.totalGrossPay);
        });
    });
});
