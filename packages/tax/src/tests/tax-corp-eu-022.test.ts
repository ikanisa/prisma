/**
 * Tests for EU Corporate Tax Specialist Agent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EUCorporateTaxAgent } from '../agents/tax-corp-eu-022';

describe('EUCorporateTaxAgent', () => {
  let agent: EUCorporateTaxAgent;

  beforeEach(() => {
    agent = new EUCorporateTaxAgent({
      organizationId: 'test-org-123',
      userId: 'test-user-456'
    });
  });

  describe('Agent Metadata', () => {
    it('should have correct slug', () => {
      expect(agent.slug).toBe('tax-corp-eu-022');
    });

    it('should have correct name', () => {
      expect(agent.name).toBe('EU Corporate Tax Specialist');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct category and type', () => {
      expect(agent.category).toBe('tax');
      expect(agent.type).toBe('specialist');
    });
  });

  describe('Capabilities', () => {
    it('should list all capabilities', () => {
      const capabilities = agent.getCapabilities();
      
      expect(capabilities).toContain('EU-27 corporate tax rates and regulations');
      expect(capabilities).toContain('ATAD I/II compliance checking');
      expect(capabilities).toContain('DAC6 mandatory disclosure guidance');
      expect(capabilities.length).toBeGreaterThan(5);
    });
  });

  describe('Supported Jurisdictions', () => {
    it('should support all 27 EU member states', () => {
      const jurisdictions = agent.getSupportedJurisdictions();
      
      expect(jurisdictions.length).toBe(27);
      expect(jurisdictions.every(j => j.region === 'EU')).toBe(true);
    });

    it('should include major EU countries', () => {
      const jurisdictions = agent.getSupportedJurisdictions();
      const codes = jurisdictions.map(j => j.code);
      
      expect(codes).toContain('DE'); // Germany
      expect(codes).toContain('FR'); // France
      expect(codes).toContain('IT'); // Italy
      expect(codes).toContain('ES'); // Spain
      expect(codes).toContain('NL'); // Netherlands
    });
  });

  describe('Tax Rates', () => {
    it('should return tax rate for Germany', async () => {
      const rates = await agent.getTaxRates({
        code: 'DE',
        name: 'Germany',
        region: 'EU'
      });

      expect(rates).toHaveLength(1);
      expect(rates[0].standardRate).toBe(29.9);
      expect(rates[0].rateType).toBe('corporate');
    });

    it('should return tax rate for Ireland', async () => {
      const rates = await agent.getTaxRates({
        code: 'IE',
        name: 'Ireland',
        region: 'EU'
      });

      expect(rates[0].standardRate).toBe(12.5);
    });

    it('should throw error for non-EU jurisdiction', async () => {
      await expect(
        agent.getTaxRates({
          code: 'US',
          name: 'United States',
          region: 'North America'
        })
      ).rejects.toThrow('Not an EU jurisdiction');
    });
  });

  describe('Query Execution', () => {
    it('should execute basic query', async () => {
      const result = await agent.execute({
        query: 'What is the corporate tax rate in France?',
        jurisdiction: { code: 'FR', name: 'France', region: 'EU' },
        taxYear: 2024
      });

      expect(result.output).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toBeDefined();
      expect(result.sources!.length).toBeGreaterThan(0);
    });

    it('should generate warnings for missing tax year', async () => {
      const result = await agent.execute({
        query: 'Tell me about ATAD compliance'
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('tax year'))).toBe(true);
    });

    it('should generate recommendations', async () => {
      const result = await agent.execute({
        query: 'How do I comply with DAC6?'
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it('should reject non-EU jurisdiction', async () => {
      await expect(
        agent.execute({
          query: 'What is the tax rate?',
          jurisdiction: { code: 'US', name: 'United States' }
        })
      ).rejects.toThrow('Invalid jurisdiction');
    });
  });

  describe('ATAD Compliance', () => {
    it('should check ATAD compliance', async () => {
      const result = await agent.checkATADCompliance({
        revenue: 10000000,
        interest: 500000
      });

      expect(result.complianceType).toBe('ATAD');
      expect(result.jurisdiction.code).toBe('EU');
      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
    });

    it('should identify compliance issues', async () => {
      const result = await agent.checkATADCompliance({});

      const severities = result.issues!.map(i => i.severity);
      expect(severities).toContain('high');
      expect(result.issues!.every(i => i.recommendation)).toBe(true);
    });
  });

  describe('Filing Deadlines', () => {
    it('should return filing deadlines', async () => {
      const deadlines = await agent.getFilingDeadlines({
        code: 'DE',
        name: 'Germany',
        region: 'EU'
      });

      expect(deadlines).toHaveLength(1);
      expect(deadlines[0].filingType).toBe('Corporate Tax Return');
      expect(deadlines[0].frequency).toBe('annual');
      expect(deadlines[0].extensions).toBeDefined();
    });

    it('should include extension information', async () => {
      const deadlines = await agent.getFilingDeadlines({
        code: 'FR',
        name: 'France',
        region: 'EU'
      });

      expect(deadlines[0].extensions!.available).toBe(true);
      expect(deadlines[0].extensions!.maxDays).toBe(60);
    });
  });
});
