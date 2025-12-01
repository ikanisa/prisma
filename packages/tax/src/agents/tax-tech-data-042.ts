/**
 * Tax Technology & Data Quality Agent (tax-tech-data-042)
 *
 * Specialized AI agent for tax technology, ERP mapping, and data quality.
 *
 * Scope: ERP to tax data mapping, VAT/CIT data validation, GL to return reconciliation
 */

export interface TaxTechDataAgentConfig {
  organizationId: string;
  userId: string;
}

export interface DataMapping {
  sourceField: string;
  sourceSystem: string;
  targetField: string;
  targetReport: string;
  transformationRule?: string;
  validationRules: string[];
}

export interface DataQualityCheck {
  checkName: string;
  checkType: 'completeness' | 'accuracy' | 'consistency' | 'timeliness';
  description: string;
  query?: string;
  threshold?: number;
  frequency: string;
}

export interface ReconciliationResult {
  reconciliationType: string;
  periodEnd: string;
  glBalance: number;
  returnAmount: number;
  variance: number;
  variancePercent: number;
  status: 'matched' | 'variance_within_threshold' | 'requires_review';
  explanations: string[];
}

// Configuration thresholds
const VALIDATION_THRESHOLDS = {
  /** Error rate below which validation is considered 'warning' vs 'fail' */
  ERROR_RATE_WARNING: 0.05,
};

export interface TaxDataValidation {
  validationType: string;
  recordsChecked: number;
  errorsFound: number;
  errors: {
    recordId: string;
    field: string;
    issue: string;
    suggestion: string;
  }[];
  overallStatus: 'pass' | 'warning' | 'fail';
}

export class TaxTechDataAgent {
  public readonly slug = 'tax-tech-data-042';
  public readonly name = 'Tax Technology & Data Quality Specialist';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  constructor(private config: TaxTechDataAgentConfig) {}

  async getERPTaxMappings(erpSystem: string): Promise<DataMapping[]> {
    const mappings: Record<string, DataMapping[]> = {
      SAP: [
        {
          sourceField: 'MWSKZ (Tax Code)',
          sourceSystem: 'SAP',
          targetField: 'VAT Rate',
          targetReport: 'VAT Return',
          transformationRule: 'Tax code to rate lookup table',
          validationRules: ['Valid tax code', 'Rate matches jurisdiction'],
        },
        {
          sourceField: 'DMBTR (Local Amount)',
          sourceSystem: 'SAP',
          targetField: 'Net Amount',
          targetReport: 'VAT Return',
          validationRules: ['Currency matches', 'Amount in correct sign'],
        },
        {
          sourceField: 'FWBAS (Tax Base)',
          sourceSystem: 'SAP',
          targetField: 'Taxable Base',
          targetReport: 'VAT Return',
          validationRules: ['Tax base calculation verified'],
        },
        {
          sourceField: 'BUKRS (Company Code)',
          sourceSystem: 'SAP',
          targetField: 'Entity',
          targetReport: 'CIT Return',
          transformationRule: 'Company code to legal entity mapping',
          validationRules: ['Valid company code', 'Entity registered'],
        },
      ],
      Oracle: [
        {
          sourceField: 'TAX_RATE_CODE',
          sourceSystem: 'Oracle',
          targetField: 'VAT Rate',
          targetReport: 'VAT Return',
          validationRules: ['Valid tax rate code', 'Rate effective date check'],
        },
        {
          sourceField: 'ENTERED_DR/ENTERED_CR',
          sourceSystem: 'Oracle',
          targetField: 'Transaction Amount',
          targetReport: 'VAT Return',
          validationRules: ['Debit/Credit balance', 'Currency conversion'],
        },
      ],
      NetSuite: [
        {
          sourceField: 'taxitem',
          sourceSystem: 'NetSuite',
          targetField: 'Tax Code',
          targetReport: 'VAT Return',
          validationRules: ['Tax item active', 'Rate matches'],
        },
        {
          sourceField: 'amount',
          sourceSystem: 'NetSuite',
          targetField: 'Transaction Value',
          targetReport: 'VAT Return',
          validationRules: ['Amount not null', 'Valid number format'],
        },
      ],
    };

    return mappings[erpSystem] || [];
  }

  async getDataQualityChecks(taxType: 'VAT' | 'CIT' | 'WHT'): Promise<DataQualityCheck[]> {
    const checks: Record<string, DataQualityCheck[]> = {
      VAT: [
        {
          checkName: 'Missing Tax Codes',
          checkType: 'completeness',
          description: 'Identify transactions without tax codes',
          query: 'SELECT * FROM transactions WHERE tax_code IS NULL',
          threshold: 0,
          frequency: 'Daily',
        },
        {
          checkName: 'Invalid VAT Numbers',
          checkType: 'accuracy',
          description: 'Validate customer/supplier VAT registration numbers',
          query: 'Regex validation against jurisdiction format',
          threshold: 0,
          frequency: 'Weekly',
        },
        {
          checkName: 'Duplicate Invoices',
          checkType: 'accuracy',
          description: 'Check for duplicate invoice entries',
          query: 'GROUP BY invoice_number HAVING COUNT > 1',
          threshold: 0,
          frequency: 'Daily',
        },
        {
          checkName: 'Tax Rate Consistency',
          checkType: 'consistency',
          description: 'Verify tax rates match configured rates',
          query: 'Compare applied rate vs master rate table',
          threshold: 0.01,
          frequency: 'Daily',
        },
        {
          checkName: 'Period Cutoff',
          checkType: 'timeliness',
          description: 'Ensure transactions posted in correct period',
          query: 'Check posting date vs document date',
          frequency: 'Monthly',
        },
      ],
      CIT: [
        {
          checkName: 'Intercompany Balance',
          checkType: 'consistency',
          description: 'Intercompany balances should net to zero',
          query: 'SUM of IC receivables = SUM of IC payables',
          threshold: 0,
          frequency: 'Monthly',
        },
        {
          checkName: 'Depreciation Calculation',
          checkType: 'accuracy',
          description: 'Verify depreciation matches asset register',
          query: 'Compare GL depreciation to FA subledger',
          threshold: 1,
          frequency: 'Monthly',
        },
        {
          checkName: 'Accrual Completeness',
          checkType: 'completeness',
          description: 'All expected accruals recorded',
          query: 'Check against accrual checklist',
          frequency: 'Monthly',
        },
      ],
      WHT: [
        {
          checkName: 'WHT Certificate Match',
          checkType: 'completeness',
          description: 'WHT paid matches certificates issued',
          frequency: 'Monthly',
        },
        {
          checkName: 'Rate Application',
          checkType: 'accuracy',
          description: 'Correct WHT rate applied per payment type',
          frequency: 'Per payment',
        },
      ],
    };

    return checks[taxType] || [];
  }

  async performReconciliation(input: {
    taxType: 'VAT' | 'CIT';
    periodEnd: string;
    glData: { account: string; balance: number }[];
    returnData: { line: string; amount: number }[];
  }): Promise<ReconciliationResult> {
    const { taxType, periodEnd, glData, returnData } = input;

    // Sum GL balances
    const glBalance = glData.reduce((sum, item) => sum + item.balance, 0);

    // Sum return amounts
    const returnAmount = returnData.reduce((sum, item) => sum + item.amount, 0);

    // Calculate variance
    const variance = glBalance - returnAmount;
    const variancePercent = glBalance !== 0 ? (variance / glBalance) * 100 : 0;

    // Determine status
    let status: 'matched' | 'variance_within_threshold' | 'requires_review';
    const explanations: string[] = [];

    if (Math.abs(variance) < 1) {
      status = 'matched';
      explanations.push('GL and return amounts match within rounding tolerance');
    } else if (Math.abs(variancePercent) < 0.5) {
      status = 'variance_within_threshold';
      explanations.push('Variance within 0.5% threshold');
      explanations.push('Common causes: timing differences, rounding');
    } else {
      status = 'requires_review';
      explanations.push('Variance exceeds threshold');
      explanations.push('Investigate: missed transactions, incorrect posting, classification errors');
    }

    return {
      reconciliationType: `${taxType} GL to Return`,
      periodEnd,
      glBalance,
      returnAmount,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
      status,
      explanations,
    };
  }

  async validateTaxData(input: {
    dataType: 'invoice' | 'payment' | 'journal';
    records: Record<string, unknown>[];
  }): Promise<TaxDataValidation> {
    const { dataType, records } = input;
    const errors: TaxDataValidation['errors'] = [];

    for (const record of records) {
      // Validate required fields
      if (dataType === 'invoice') {
        if (!record['invoiceNumber']) {
          errors.push({
            recordId: String(record['id'] || 'unknown'),
            field: 'invoiceNumber',
            issue: 'Missing invoice number',
            suggestion: 'Add unique invoice reference',
          });
        }
        if (!record['taxCode']) {
          errors.push({
            recordId: String(record['id'] || 'unknown'),
            field: 'taxCode',
            issue: 'Missing tax code',
            suggestion: 'Assign appropriate tax code based on transaction type',
          });
        }
        if (!record['vatNumber'] && record['countryCode'] === 'EU') {
          errors.push({
            recordId: String(record['id'] || 'unknown'),
            field: 'vatNumber',
            issue: 'Missing VAT number for EU transaction',
            suggestion: 'Obtain and validate customer VAT number',
          });
        }
      }
    }

    const overallStatus = errors.length === 0 ? 'pass' : errors.length < records.length * VALIDATION_THRESHOLDS.ERROR_RATE_WARNING ? 'warning' : 'fail';

    return {
      validationType: dataType,
      recordsChecked: records.length,
      errorsFound: errors.length,
      errors,
      overallStatus,
    };
  }

  async getTaxTechnologyRecommendations(currentState: {
    erpSystem: string;
    manualProcesses: string[];
    dataIssues: string[];
  }): Promise<{
    category: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedBenefit: string;
  }[]> {
    const recommendations = [];

    if (currentState.manualProcesses.includes('VAT return preparation')) {
      recommendations.push({
        category: 'Automation',
        recommendation: 'Implement VAT return automation tool',
        priority: 'high' as const,
        expectedBenefit: '50% reduction in compliance time, improved accuracy',
      });
    }

    if (currentState.dataIssues.includes('tax code errors')) {
      recommendations.push({
        category: 'Data Quality',
        recommendation: 'Implement tax determination engine in ERP',
        priority: 'high' as const,
        expectedBenefit: 'Automated tax code assignment, reduced errors',
      });
    }

    if (currentState.manualProcesses.includes('transfer pricing documentation')) {
      recommendations.push({
        category: 'Documentation',
        recommendation: 'Deploy TP documentation automation platform',
        priority: 'medium' as const,
        expectedBenefit: 'Consistent documentation, audit trail',
      });
    }

    recommendations.push({
      category: 'Analytics',
      recommendation: 'Implement tax data analytics dashboard',
      priority: 'medium' as const,
      expectedBenefit: 'Real-time visibility, proactive issue identification',
    });

    return recommendations;
  }

  getCapabilities(): string[] {
    return [
      'ERP to tax system data mapping',
      'Tax code configuration and validation',
      'VAT data quality checks',
      'Corporate tax data validation',
      'GL to tax return reconciliation',
      'Tax determination engine configuration',
      'Intercompany transaction validation',
      'Tax technology assessment',
      'Data migration support',
      'Tax analytics and dashboards',
      'Audit trail maintenance',
      'Tax process automation advisory',
    ];
  }
}
