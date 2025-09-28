import { describe, expect, it } from 'vitest';

import {
  calculateNid,
  calculatePatentBox,
  calculateInterestLimitation,
  calculateCfcInclusion,
  calculateFiscalUnity,
  calculateVatReturn,
  calculatePillarTwo,
} from '@/lib/tax/calculators';
import {
  calculateTreatyWht,
  calculateGilti,
  calculateSection163J,
  calculateCamt,
  calculateExcise4501,
  calculateUsOverlay,
} from '@/lib/tax/calculators';

describe('Malta tax calculators', () => {
  describe('calculateNid', () => {
    it('computes deduction with default risk premium and carryforward', () => {
      const result = calculateNid({
        equityBase: 500_000,
        riskFreeRate: 0.01,
        riskPremium: 0.05,
        priorDeduction: 5_000,
        chargeableIncomeBeforeNid: 400_000,
      });

      expect(result.referenceRate).toBeCloseTo(0.06, 6);
      expect(result.grossDeduction).toBeCloseTo(30_000, 2);
      expect(result.cappedDeduction).toBeCloseTo(30_000, 2);
      expect(result.deductionAfterCarryforward).toBeCloseTo(25_000, 2);
      expect(result.adjustmentAmount).toBeCloseTo(-25_000, 2);
    });

    it('applies statutory cap when deduction exceeds 90% of income', () => {
      const result = calculateNid({
        equityBase: 1_000_000,
        referenceRateOverride: 0.1,
        chargeableIncomeBeforeNid: 50_000,
      });

      // Gross deduction 100,000, but 90% cap of 50,000 = 45,000
      expect(result.cappedDeduction).toBeCloseTo(45_000, 2);
      expect(result.deductionAfterCarryforward).toBeCloseTo(45_000, 2);
      expect(result.adjustmentAmount).toBeCloseTo(-45_000, 2);
    });
  });

  describe('calculatePatentBox', () => {
    it('computes deduction using nexus fraction and deduction rate', () => {
      const result = calculatePatentBox({
        qualifyingIpIncome: 250_000,
        qualifyingExpenditure: 120_000,
        overallExpenditure: 160_000,
        routineReturnRate: 0.1,
        upliftCap: 0.3,
        deductionRate: 0.95,
      });

      expect(result.routineReturn).toBeCloseTo(25_000, 2);
      expect(result.uplift).toBeCloseTo(36_000, 2); // 120k * 0.3, below overall cap of 40k
      expect(result.nexusFraction).toBeCloseTo((120_000 + 36_000) / 160_000, 6);
      const expectedDeduction = (250_000 - 25_000) * result.nexusFraction * 0.95;
      expect(result.deductionAmount).toBeCloseTo(expectedDeduction, 2);
      expect(result.adjustmentAmount).toBeCloseTo(-expectedDeduction, 2);
    });

    it('caps uplift at overall expenditure limit', () => {
      const result = calculatePatentBox({
        qualifyingIpIncome: 100_000,
        qualifyingExpenditure: 90_000,
        overallExpenditure: 100_000,
        routineReturnRate: 0.05,
        upliftCap: 0.5,
      });

      // Max uplift is overall - qualifying = 10,000
      expect(result.uplift).toBeCloseTo(10_000, 2);
      expect(result.nexusFraction).toBeCloseTo(1, 6);
    });
  });

  describe('calculateInterestLimitation', () => {
    it('applies safe harbour plus carryforward capacity', () => {
      const result = calculateInterestLimitation({
        exceedingBorrowingCosts: 6_000_000,
        taxEbitda: 12_000_000,
        carryforwardCapacity: 500_000,
        carryforwardInterest: 250_000,
        standaloneAllowance: 100_000,
      });

      const baseCapacity = Math.max(12_000_000 * 0.3, 3_000_000); // 3.6m vs 3m -> 3.6m
      const expectedCapacity = baseCapacity + 500_000 + 100_000;
      expect(result.capacityAvailable).toBeCloseTo(expectedCapacity, 2);
      expect(result.disallowedInterest).toBeGreaterThan(0);
      expect(result.adjustmentAmount).toBe(result.disallowedInterest);
    });
  });

  describe('calculateCfcInclusion', () => {
    it('computes inclusion net of foreign rate and participation', () => {
      const result = calculateCfcInclusion({
        cfcProfit: 400_000,
        foreignTaxPaid: 40_000,
        foreignJurisdictionRate: 0.1,
        domesticRate: 0.35,
        participationPercentage: 0.8,
        profitAttributionRatio: 0.75,
      });

      expect(result.effectiveForeignRate).toBeCloseTo(0.1, 6);
      const attributableProfit = 400_000 * 0.8 * 0.75;
      const expectedInclusion = attributableProfit * (0.35 - 0.1);
      expect(result.inclusionAmount).toBeCloseTo(expectedInclusion, 2);
      expect(result.adjustmentAmount).toBeCloseTo(expectedInclusion, 2);
      expect(result.taxCreditEligible).toBeLessThanOrEqual(result.inclusionAmount);
    });
  });

  describe('calculateFiscalUnity', () => {
    it('aggregates member incomes and allocates net tax payable', () => {
      const result = calculateFiscalUnity({
        parentTaxEntityId: 'parent',
        period: '2025',
        members: [
          { taxEntityId: 'parent', chargeableIncome: 600_000, taxCredits: 20_000 },
          { taxEntityId: 'sub', chargeableIncome: 400_000, taxCredits: 10_000 },
        ],
        adjustments: -50_000,
        taxRate: 0.35,
        openingTaxAccount: 100_000,
        paymentsMade: 80_000,
      });

      expect(result.totalChargeableIncome).toBeCloseTo(1_000_000, 2);
      expect(result.consolidatedCit).toBeCloseTo((1_000_000 - 50_000) * 0.35, 2);
      expect(result.totalTaxCredits).toBeCloseTo(30_000, 2);
      expect(result.netTaxPayable).toBeCloseTo(result.adjustmentAmount, 2);
      expect(result.memberAllocations).toHaveLength(2);
      const parentAllocation = result.memberAllocations.find((entry) => entry.taxEntityId === 'parent');
      expect(parentAllocation?.share).toBeCloseTo(0.6, 6);
    });
  });

  describe('calculateVatReturn', () => {
    it('computes net VAT payable with adjustments', () => {
      const result = calculateVatReturn({
        taxEntityId: 'vat-1',
        period: '2025-Q1',
        outputsStandard: 500_000,
        outputsReduced: 40_000,
        inputsStandard: 120_000,
        inputsCapitalGoods: 30_000,
        inputVatRecoveryRate: 0.9,
        intraCommunityAcquisitions: 20_000,
        distanceSales: 10_000,
        manualAdjustments: -2_000,
      });

      expect(result.taxableOutputs).toBeCloseTo(570_000, 2);
      expect(result.outputVat).toBeGreaterThan(0);
      expect(result.inputVat).toBeGreaterThan(0);
      expect(result.netPayableAfterAdjustments).toBeCloseTo(result.netVatDue - 2_000, 2);
      expect(result.adjustmentAmount).toBeCloseTo(result.netPayableAfterAdjustments, 2);
    });
  });

  describe('calculatePillarTwo', () => {
    it('computes QDMTT credit and residual IIR for jurisdictions', () => {
      const result = calculatePillarTwo({
        rootTaxEntityId: 'parent',
        period: '2025',
        jurisdictions: [
          {
            taxEntityId: 'parent',
            jurisdiction: 'Malta',
            globeIncome: 500_000,
            coveredTaxes: 90_000,
            substanceCarveOut: 50_000,
            ownershipPercentage: 1,
          },
          {
            taxEntityId: 'sub',
            jurisdiction: 'Germany',
            globeIncome: 300_000,
            coveredTaxes: 20_000,
            substanceCarveOut: 60_000,
            qdmtPaid: 10_000,
            ownershipPercentage: 1,
          },
        ],
      });

      expect(result.totalTopUpTax).toBeCloseTo(20_000, 2);
      expect(result.qdmtTopUpTax).toBeCloseTo(10_000, 2);
      expect(result.iirTopUpTax).toBeCloseTo(10_000, 2);
      expect(result.safeHarbourApplied.map((entry) => entry.jurisdiction)).toContain('Malta');

      const germany = result.jurisdictions.find((entry) => entry.jurisdiction === 'Germany');
      expect(germany?.effectiveTaxRate).toBeLessThan(0.15);
      expect(germany?.residualTopUp).toBeCloseTo(10_000, 2);
    });

    it('uses safe harbour thresholds to zeroise top-up tax', () => {
      const result = calculatePillarTwo({
        rootTaxEntityId: 'parent',
        period: '2025',
        jurisdictions: [
          {
            taxEntityId: 'low',
            jurisdiction: 'LowTax',
            globeIncome: 500_000,
            coveredTaxes: 40_000,
            substanceCarveOut: 480_000,
            qdmtPaid: 0,
            ownershipPercentage: 1,
            safeHarbourThreshold: 600_000,
          },
        ],
      });

      expect(result.totalTopUpTax).toBe(0);
      expect(result.iirTopUpTax).toBe(0);
      expect(result.safeHarbourApplied).toHaveLength(1);
    });
  });

  describe('calculateTreatyWht', () => {
    it('applies treaty rate relief and caps at domestic rate', () => {
      const result = calculateTreatyWht({
        grossAmount: 100_000,
        domesticRate: 0.25,
        treatyRate: 0.10,
      });

      expect(result.withholdingBefore).toBeCloseTo(25_000, 2);
      expect(result.withholdingAfter).toBeCloseTo(10_000, 2);
      expect(result.reliefAmount).toBeCloseTo(15_000, 2);
      expect(result.reliefRate).toBeCloseTo(0.15, 6);
    });

    it('normalises percentage inputs over 1 and prevents treaty rate exceeding domestic', () => {
      const result = calculateTreatyWht({
        grossAmount: 50_000,
        domesticRate: 30,
        treatyRate: 20,
      });

      // domestic rate -> 0.3, treaty rate -> 0.2
      expect(result.withholdingBefore).toBeCloseTo(15_000, 2);
      expect(result.withholdingAfter).toBeCloseTo(10_000, 2);
      expect(result.reliefAmount).toBeCloseTo(5_000, 2);
    });
  });

  describe('US tax overlays', () => {
    it('computes GILTI inclusion with 250 deduction and FTC cap', () => {
      const result = calculateGilti({
        testedIncome: 500_000,
        testedLoss: 50_000,
        qbaI: 200_000,
        interestExpense: 20_000,
        foreignTaxesPaid: 30_000,
        ftcLimit: 0.8,
        section250DeductionRate: 0.5,
      });

      expect(result.giltiBase).toBeGreaterThan(0);
      expect(result.netGiltiTax).toBeGreaterThanOrEqual(0);
      expect(result.usTaxLiability).toBeGreaterThanOrEqual(result.netGiltiTax);
    });

    it('applies §163(j) limitation and carryforward handling', () => {
      const result = calculateSection163J({
        businessInterestExpense: 400_000,
        businessInterestIncome: 10_000,
        adjustedTaxableIncome: 1_000_000,
        floorPlanInterest: 5_000,
        carryforwardInterest: 50_000,
      });

      expect(result.limitation).toBeCloseTo(315_000, 2);
      expect(result.allowedInterest).toBeLessThanOrEqual(450_000);
      expect(result.updatedCarryforward).toBeGreaterThanOrEqual(0);
    });

    it('calculates CAMT top-up liability after credits', () => {
      const result = calculateCamt({
        adjustedFinancialStatementIncome: 2_000_000,
        camtCreditCarryforward: 100_000,
        regularTaxLiability: 250_000,
      });

      expect(result.camtLiability).toBeGreaterThan(0);
      expect(result.camtTopUp).toBeGreaterThanOrEqual(0);
    });

    it('computes stock buyback excise tax base', () => {
      const result = calculateExcise4501({ netRepurchase: 300_000, permittedExceptions: 50_000 });
      expect(result.exciseBase).toBeCloseTo(250_000, 2);
      expect(result.exciseTax).toBeCloseTo(2_500, 2);
    });

    it('routes overlay calculation via calculateUsOverlay helper', () => {
      const gilti = calculateUsOverlay({ overlayType: 'GILTI', testedIncome: 200_000, qbaI: 50_000 });
      expect(gilti.overlayType).toBe('GILTI');

      const section163j = calculateUsOverlay({ overlayType: '163J', businessInterestExpense: 100_000, adjustedTaxableIncome: 200_000 });
      expect(section163j.overlayType).toBe('163J');
    });
  });
});
