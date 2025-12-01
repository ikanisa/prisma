import {
  SpecialistAgent,
  AgentConfig,
  AgentTask,
  AgentTier,
  AgentDomain,
  Jurisdiction,
} from '@prisma-glow/core';

/**
 * Agent 042: Licensing & Regulatory Filings Specialist
 *
 * Handles business license mapping, regulatory reporting,
 * and license renewal calendars for Malta and Rwanda.
 */
export class LicensingRegulatoryAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-lic-042',
      name: 'Licensing & Regulatory Filings Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in business licensing requirements, regulatory filings, and ongoing compliance reporting',

      persona: {
        role: 'Regulatory Compliance Advisor',
        personality_traits: ['thorough', 'proactive', 'knowledgeable', 'organized'],
        communication_style: 'technical',
      },

      system_prompt: `You are a Licensing & Regulatory Filings Specialist.

LICENSING FRAMEWORK:
1. MALTA REGULATORS
   - MFSA: Financial services
   - MGA: Gaming
   - MBR: Company registry
   - FIAU: AML compliance
   - Transport Malta: Transport/shipping

2. RWANDA REGULATORS
   - RDB: Business registration
   - BNR: Banking/financial services
   - RRA: Tax compliance
   - RURA: Utilities and transport
   - RCA: Insurance

3. ONGOING REQUIREMENTS
   - Annual reporting
   - License renewals
   - Regulatory returns
   - Compliance certifications
   - Fee payments

4. LICENSE MAPPING
   - Business activity → Required licenses
   - Jurisdictional variations
   - Timeline for applications
   - Associated costs`,

      capabilities: [
        {
          id: 'license_mapping',
          name: 'License Mapping',
          description: 'Map business activities to required licenses',
          requiredTools: ['license_database', 'activity_classifier'],
        },
        {
          id: 'filing_management',
          name: 'Filing Management',
          description: 'Manage regulatory filings and returns',
          requiredTools: ['filing_calendar', 'submission_tracker'],
        },
        {
          id: 'renewal_tracking',
          name: 'Renewal Tracking',
          description: 'Track license renewals and deadlines',
          requiredTools: ['renewal_calendar', 'reminder_system'],
        },
        {
          id: 'compliance_reporting',
          name: 'Compliance Reporting',
          description: 'Prepare regulatory compliance reports',
          requiredTools: ['report_generator', 'data_aggregator'],
        },
      ],

      tools: [
        {
          id: 'license_database',
          name: 'License Database',
          description: 'Database of license requirements by activity and jurisdiction',
        },
        {
          id: 'filing_calendar',
          name: 'Filing Calendar',
          description: 'Calendar of regulatory filing deadlines',
        },
        {
          id: 'submission_tracker',
          name: 'Submission Tracker',
          description: 'Track status of regulatory submissions',
        },
      ],

      guardrails: {
        rules: [
          'Never operate without required licenses',
          'File returns before deadlines',
          'Maintain complete filing records',
          'Verify current regulatory requirements',
        ],
        escalation_triggers: [
          'License application rejection',
          'Missed filing deadline',
          'Regulatory inquiry',
          'License suspension risk',
        ],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.jurisdiction) {
      errors.push('Jurisdiction is required');
    }

    return { valid: errors.length === 0, errors };
  }

  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;

    switch (type) {
      case 'map_licenses':
        return this.mapLicenses(input);

      case 'get_filing_calendar':
        return this.getFilingCalendar(input);

      case 'check_renewals':
        return this.checkRenewals(input);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  async processMessage(message: string, context?: any): Promise<string> {
    this.log('info', 'Processing licensing message', { message, context });
    return 'I can help with business licensing requirements, regulatory filings, and compliance calendars. What jurisdiction and business activity are you interested in?';
  }

  private async mapLicenses(input: any): Promise<any> {
    const { jurisdiction, businessActivity } = input;

    const maltaLicenses: Record<string, any[]> = {
      'financial_services': [
        {
          license: 'MFSA License',
          regulator: 'Malta Financial Services Authority',
          category: 'Investment Services',
          applicationTimeline: '3-6 months',
          fees: 'Varies by category',
          requirements: ['Fit and proper assessment', 'Capital requirements', 'Compliance framework'],
        },
      ],
      'gaming': [
        {
          license: 'MGA Gaming License',
          regulator: 'Malta Gaming Authority',
          category: 'B2C Gaming',
          applicationTimeline: '3-4 months',
          fees: 'EUR 25,000+ application fee',
          requirements: ['Technical audit', 'Financial requirements', 'Key function holders'],
        },
      ],
      'general_trade': [
        {
          license: 'Trade License (where applicable)',
          regulator: 'Various local authorities',
          category: 'General trading',
          applicationTimeline: '1-2 months',
          fees: 'Varies by activity',
          requirements: ['Business registration', 'Premises approval'],
        },
      ],
    };

    const rwandaLicenses: Record<string, any[]> = {
      'general_trade': [
        {
          license: 'Trading License',
          regulator: 'Rwanda Development Board (RDB)',
          category: 'Business registration',
          applicationTimeline: '1-5 days',
          fees: 'RWF 30,000 - 250,000',
          requirements: ['Company registration', 'Tax clearance', 'Business plan'],
        },
      ],
      'financial_services': [
        {
          license: 'BNR License',
          regulator: 'National Bank of Rwanda',
          category: 'Banking/Financial Services',
          applicationTimeline: '6-12 months',
          fees: 'Varies by license type',
          requirements: ['Capital requirements', 'Fit and proper test', 'Business plan'],
        },
      ],
      'insurance': [
        {
          license: 'Insurance License',
          regulator: 'Rwanda Cooperative Agency',
          category: 'Insurance services',
          applicationTimeline: '3-6 months',
          fees: 'Based on category',
          requirements: ['Capital requirements', 'Actuarial assessment', 'Reinsurance arrangements'],
        },
      ],
    };

    const licenses = jurisdiction === 'MT'
      ? maltaLicenses[businessActivity] || maltaLicenses['general_trade']
      : rwandaLicenses[businessActivity] || rwandaLicenses['general_trade'];

    return {
      jurisdiction,
      businessActivity,
      requiredLicenses: licenses,
      nextSteps: [
        'Confirm specific activity scope',
        'Prepare application documentation',
        'Budget for fees and timeline',
        'Engage local advisors if needed',
      ],
    };
  }

  private async getFilingCalendar(input: any): Promise<any> {
    const { jurisdiction, entityType } = input;

    const maltaFilings = [
      {
        filing: 'Annual Return',
        regulator: 'Malta Business Registry',
        deadline: '42 days from anniversary',
        frequency: 'Annual',
        penalty: 'Late filing fees apply',
      },
      {
        filing: 'Financial Statements',
        regulator: 'Malta Business Registry',
        deadline: '10 months from year-end',
        frequency: 'Annual',
        penalty: 'Striking off risk',
      },
      {
        filing: 'BO Register Update',
        regulator: 'Malta Business Registry',
        deadline: '14 days from change',
        frequency: 'As required',
        penalty: 'Administrative penalties',
      },
      {
        filing: 'MFSA Regulatory Return',
        regulator: 'MFSA',
        deadline: 'Various (monthly/quarterly)',
        frequency: 'Periodic',
        penalty: 'Regulatory action',
        applicable: 'Licensed entities only',
      },
    ];

    const rwandaFilings = [
      {
        filing: 'Annual General Report',
        regulator: 'RDB',
        deadline: 'Within 3 months of year-end',
        frequency: 'Annual',
        penalty: 'Compliance certificate issues',
      },
      {
        filing: 'Tax Returns',
        regulator: 'RRA',
        deadline: 'By March 31',
        frequency: 'Annual',
        penalty: '20% penalty + 1.5% monthly interest',
      },
      {
        filing: 'Trading License Renewal',
        regulator: 'RDB',
        deadline: 'Before expiry',
        frequency: 'Annual',
        penalty: 'Operating without valid license',
      },
      {
        filing: 'BNR Returns',
        regulator: 'BNR',
        deadline: 'Monthly/Quarterly',
        frequency: 'Periodic',
        penalty: 'Regulatory sanctions',
        applicable: 'Licensed financial institutions',
      },
    ];

    const filings = jurisdiction === 'MT' ? maltaFilings : rwandaFilings;

    return {
      jurisdiction,
      entityType,
      filings,
      recommendations: [
        'Set up calendar reminders',
        'Prepare documents in advance',
        'Maintain filing records',
        'Track confirmation receipts',
      ],
    };
  }

  private async checkRenewals(input: any): Promise<any> {
    const { companyName, licenses } = input;

    const renewalStatus = (licenses || []).map((license: any) => ({
      license: license.name,
      expiryDate: license.expiry,
      renewalDeadline: 'Apply 30 days before expiry',
      status: 'Review required',
      action: 'Confirm renewal requirements',
    }));

    return {
      companyName,
      renewals: renewalStatus,
      upcomingDeadlines: renewalStatus.filter((r: any) => r.status !== 'Current'),
      recommendations: [
        'Review license conditions annually',
        'Budget for renewal fees',
        'Update compliance documentation',
        'Monitor regulatory changes',
      ],
    };
  }
}


/**
 * Agent 043: Share Capital & Corporate Actions Specialist
 *
 * Handles share issues, transfers, buybacks, dividend declarations,
 * and capital restructuring.
 */
export class ShareCapitalAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-share-043',
      name: 'Share Capital & Corporate Actions Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in share capital management, corporate actions, and equity transactions',

      persona: {
        role: 'Corporate Finance Advisor',
        personality_traits: ['analytical', 'precise', 'knowledgeable', 'compliant'],
        communication_style: 'technical',
      },

      system_prompt: `You are a Share Capital & Corporate Actions Specialist.

SHARE CAPITAL MANAGEMENT:
1. SHARE ISSUES
   - Initial allotment
   - Rights issues
   - Bonus issues
   - Private placements

2. SHARE TRANSFERS
   - Transfer procedures
   - Pre-emption rights
   - Stamp duty
   - Register updates

3. BUYBACKS & REDEMPTIONS
   - Treasury shares
   - Capital reduction
   - Redemption of redeemables

4. DIVIDENDS
   - Interim dividends
   - Final dividends
   - Dividend policy
   - Withholding tax

5. CAPITAL RESTRUCTURING
   - Share splits/consolidation
   - Class rights variations
   - Capital increases
   - Share premium`,

      capabilities: [
        {
          id: 'share_allotment',
          name: 'Share Allotment',
          description: 'Process share allotments and issues',
          requiredTools: ['share_calculator', 'registry_interface'],
        },
        {
          id: 'share_transfer',
          name: 'Share Transfer',
          description: 'Process share transfers',
          requiredTools: ['transfer_form', 'duty_calculator'],
        },
        {
          id: 'dividend_processing',
          name: 'Dividend Processing',
          description: 'Process dividend declarations and payments',
          requiredTools: ['dividend_calculator', 'payment_system'],
        },
        {
          id: 'capital_actions',
          name: 'Capital Actions',
          description: 'Handle capital restructuring actions',
          requiredTools: ['corporate_action_processor'],
        },
      ],

      tools: [
        {
          id: 'share_register',
          name: 'Share Register',
          description: 'Maintain share register',
        },
        {
          id: 'dividend_calculator',
          name: 'Dividend Calculator',
          description: 'Calculate dividends and withholding',
        },
      ],

      guardrails: {
        rules: [
          'Verify authorized share capital',
          'Check pre-emption rights',
          'Calculate stamp duty correctly',
          'File statutory returns timely',
        ],
        escalation_triggers: [
          'Exceeding authorized capital',
          'Pre-emption rights waiver needed',
          'Complex restructuring',
        ],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA, Jurisdiction.UK],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input.companyName) errors.push('Company name is required');
    return { valid: errors.length === 0, errors };
  }

  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;

    switch (type) {
      case 'allot_shares':
        return this.allotShares(input);
      case 'transfer_shares':
        return this.transferShares(input);
      case 'declare_dividend':
        return this.declareDividend(input);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  async processMessage(message: string): Promise<string> {
    return 'I can help with share issues, transfers, dividends, and capital actions. What do you need?';
  }

  private async allotShares(input: any): Promise<any> {
    const { companyName, shares, pricePerShare, subscriber } = input;
    return {
      companyName,
      allotment: {
        shares,
        pricePerShare,
        totalConsideration: shares * pricePerShare,
        subscriber,
        allotmentDate: new Date().toISOString().split('T')[0],
      },
      requiredActions: [
        'Board resolution approving allotment',
        'Share application and payment',
        'Issue share certificate',
        'Update share register',
        'File return of allotments (Form B)',
      ],
      filingDeadline: '14 days from allotment',
    };
  }

  private async transferShares(input: any): Promise<any> {
    const { companyName, shares, transferor, transferee, consideration } = input;
    return {
      companyName,
      transfer: { shares, transferor, transferee, consideration },
      stampDuty: consideration * 0.05, // 5% example rate
      requiredActions: [
        'Execute share transfer form',
        'Pay stamp duty',
        'Submit transfer for registration',
        'Cancel old certificate',
        'Issue new certificate',
        'Update share register',
      ],
    };
  }

  private async declareDividend(input: any): Promise<any> {
    const { companyName, dividendType, amountPerShare, recordDate, paymentDate } = input;
    return {
      companyName,
      dividend: {
        type: dividendType || 'final',
        amountPerShare,
        recordDate,
        paymentDate,
      },
      requiredActions: [
        'Verify distributable reserves',
        'Board/shareholder approval',
        'Notify shareholders',
        'Calculate withholding tax',
        'Process payments',
        'Issue dividend statements',
      ],
      withholdingTaxNote: 'Withholding tax may apply based on shareholder residency',
    };
  }
}


/**
 * Agent 044: HR & Payroll Corporate Services Specialist
 *
 * Bridges tax/payroll with corporate services - employment contracts,
 * onboarding/offboarding, links to PAYE agents.
 */
export class HRPayrollCorporateAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-hr-044',
      name: 'HR & Payroll Corporate Services Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in employment contracts, HR compliance, and payroll coordination',

      persona: {
        role: 'HR & Compliance Advisor',
        personality_traits: ['organized', 'empathetic', 'detail-oriented', 'compliant'],
        communication_style: 'technical',
      },

      system_prompt: `You are an HR & Payroll Corporate Services Specialist.

HR SERVICES:
1. EMPLOYMENT CONTRACTS
   - Contract drafting
   - Terms and conditions
   - Statutory requirements
   - Contract amendments

2. ONBOARDING
   - Documentation collection
   - Right to work verification
   - Tax registrations
   - Benefits enrollment

3. OFFBOARDING
   - Termination procedures
   - Final payments
   - Certificate of service
   - Reference handling

4. COMPLIANCE
   - Employment law
   - Data protection
   - Health and safety
   - Working time regulations

5. PAYROLL COORDINATION
   - PAYE compliance
   - Social security
   - Benefits administration`,

      capabilities: [
        {
          id: 'contract_management',
          name: 'Contract Management',
          description: 'Draft and manage employment contracts',
        },
        {
          id: 'onboarding',
          name: 'Onboarding',
          description: 'Process new employee onboarding',
        },
        {
          id: 'offboarding',
          name: 'Offboarding',
          description: 'Process employee terminations',
        },
        {
          id: 'payroll_coordination',
          name: 'Payroll Coordination',
          description: 'Coordinate with payroll and tax agents',
        },
      ],

      tools: [
        {
          id: 'contract_templates',
          name: 'Contract Templates',
          description: 'Employment contract templates',
        },
        {
          id: 'checklist_manager',
          name: 'Checklist Manager',
          description: 'Onboarding/offboarding checklists',
        },
      ],

      guardrails: {
        rules: [
          'Ensure compliance with employment law',
          'Verify right to work',
          'Protect personal data',
          'Complete statutory filings',
        ],
        escalation_triggers: [
          'Wrongful termination risk',
          'Data protection concerns',
          'Workplace disputes',
        ],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  protected async execute(task: AgentTask): Promise<any> {
    return { status: 'completed', message: 'HR task processed' };
  }

  async processMessage(message: string): Promise<string> {
    return 'I can help with employment contracts, onboarding, offboarding, and HR compliance. What do you need?';
  }
}


/**
 * Agent 045: Entity Migration & Cross-border Structuring Specialist
 *
 * Handles cross-border mergers, redomiciliation, holding structure optimization,
 * and substance requirements.
 */
export class EntityMigrationAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-migration-045',
      name: 'Entity Migration & Cross-border Structuring Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in cross-border restructuring, redomiciliation, and international holding structures',

      persona: {
        role: 'International Structuring Advisor',
        personality_traits: ['strategic', 'analytical', 'creative', 'detail-oriented'],
        communication_style: 'executive',
      },

      system_prompt: `You are an Entity Migration & Cross-border Structuring Specialist.

CROSS-BORDER SERVICES:
1. REDOMICILIATION
   - Continuation in/out procedures
   - Jurisdiction requirements
   - Tax implications
   - Timeline and costs

2. CROSS-BORDER MERGERS
   - EU Cross-border Merger Directive
   - Merger procedures
   - Employee consultation
   - Creditor protection

3. HOLDING STRUCTURES
   - Malta holding company
   - Participation exemption
   - Substance requirements
   - Tax efficiency

4. SUBSTANCE REQUIREMENTS
   - Economic substance
   - Director residence
   - Decision-making location
   - Key employees

5. CONSIDERATIONS
   - Tax implications
   - Regulatory approvals
   - Employment issues
   - Asset transfers`,

      capabilities: [
        {
          id: 'redomiciliation',
          name: 'Redomiciliation',
          description: 'Advise on entity redomiciliation',
        },
        {
          id: 'cross_border_merger',
          name: 'Cross-border Merger',
          description: 'Manage cross-border mergers',
        },
        {
          id: 'structure_optimization',
          name: 'Structure Optimization',
          description: 'Optimize international structures',
        },
        {
          id: 'substance_advisory',
          name: 'Substance Advisory',
          description: 'Advise on substance requirements',
        },
      ],

      tools: [
        {
          id: 'jurisdiction_comparator',
          name: 'Jurisdiction Comparator',
          description: 'Compare jurisdiction features',
        },
        {
          id: 'structure_modeler',
          name: 'Structure Modeler',
          description: 'Model corporate structures',
        },
      ],

      guardrails: {
        rules: [
          'Consider all tax implications',
          'Verify regulatory requirements',
          'Ensure adequate substance',
          'Document commercial rationale',
        ],
        escalation_triggers: [
          'Tax authority inquiry',
          'Substance concerns',
          'Regulatory approval issues',
        ],
        approval_required: ['All restructuring transactions'],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA, Jurisdiction.UK, Jurisdiction.EU_LUXEMBOURG],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  protected async execute(task: AgentTask): Promise<any> {
    return { status: 'completed', message: 'Cross-border task processed' };
  }

  async processMessage(message: string): Promise<string> {
    return 'I can help with entity migration, cross-border mergers, and international structuring. What are you looking to achieve?';
  }
}
