/**
 * Malta DAC6/CRS International Tax Agent
 * 
 * Autonomous agent for cross-border tax arrangement reporting and CRS compliance.
 * 
 * Legal Basis:
 * - S.L. 584.23 (DAC6 Implementation) - Reportable cross-border arrangements
 * - CRS Regulations - Common Reporting Standard for financial accounts
 * - EU Directive 2018/822 (DAC6)
 * - OECD CRS Standard
 * 
 * Features:
 * - Hallmark detection (A, B, C, D, E categories)
 * - Cross-border arrangement classification
 * - Automatic disclosure deadline tracking (30 days)
 * - XML generation for CFR submission
 * - CRS financial account reporting
 * - FATCA interoperability (IGA Model 1)
 */

import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

export enum HallmarkCategory {
  A = 'A',  // Generic hallmarks linked to main benefit test
  B = 'B',  // Specific hallmarks linked to main benefit test
  C = 'C',  // Specific hallmarks related to cross-border transactions
  D = 'D',  // Specific hallmarks concerning automatic exchange of information
  E = 'E',  // Specific hallmarks concerning transfer pricing
}

export interface Hallmark {
  category: HallmarkCategory;
  subCategory: string;  // e.g., 'A1', 'B1', 'C1(b)(i)', 'D1', 'E1'
  description: string;
  triggered: boolean;
  confidence: number;
  evidence: string[];
}

export interface CrossBorderArrangement {
  arrangementId: string;
  internalReference?: string;
  description: string;
  startDate: Date;
  implementationDate?: Date;
  participants: ArrangementParticipant[];
  jurisdictions: string[];  // ISO 2-letter country codes
  hallmarks: Hallmark[];
  mainBenefitTestMet: boolean;
  estimatedTaxBenefit?: number;
  currency: string;
  reportingDeadline: Date;
  status: 'draft' | 'reported' | 'amended' | 'voided';
}

export interface ArrangementParticipant {
  type: 'intermediary' | 'taxpayer' | 'associated_enterprise';
  name: string;
  tin?: string;  // Tax Identification Number
  address: string;
  countryCode: string;
  role: string;
  isReportingEntity: boolean;
}

export interface DAC6Disclosure {
  disclosureId: string;
  arrangementId: string;
  disclosureDate: Date;
  reportingEntity: ArrangementParticipant;
  xmlContent: string;
  submissionReference?: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  errors?: string[];
}

export interface CRSReportingEntity {
  name: string;
  tin: string;
  giin?: string;  // FATCA Global Intermediary ID Number
  entityType: 'financial_institution' | 'reporting_entity';
  countryCode: string;
  address: string;
}

export interface CRSReportableAccount {
  accountNumber: string;
  accountType: 'depository' | 'custodial' | 'equity_interest' | 'debt_interest' | 'cash_value_insurance';
  currency: string;
  accountBalance: number;
  grossInterest?: number;
  grossDividends?: number;
  grossProceeds?: number;
  otherIncome?: number;
  accountHolder: CRSAccountHolder;
  controllingPersons?: CRSAccountHolder[];
}

export interface CRSAccountHolder {
  type: 'individual' | 'entity';
  name: string;
  tin?: string;
  dateOfBirth?: Date;
  address: string;
  countryCode: string;  // Residence country
  entityType?: 'passive_nfe' | 'active_nfe' | 'crs_reportable';
}

export interface CRSReport {
  reportId: string;
  reportingEntity: CRSReportingEntity;
  reportingYear: number;
  reportableAccounts: CRSReportableAccount[];
  submissionDeadline: Date;
  xmlContent?: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
}

export interface DAC6CRSAgentConfig {
  openaiApiKey?: string;
  organizationId?: string;
  userId?: string;
  enableAIHallmarkDetection?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAC6_HALLMARKS: Record<string, { description: string; requiresMainBenefitTest: boolean }> = {
  // Category A - Generic hallmarks linked to main benefit test
  'A1': { 
    description: 'Confidentiality condition regarding arrangement',
    requiresMainBenefitTest: true 
  },
  'A2(a)': { 
    description: 'Intermediary fee linked to tax advantage obtained',
    requiresMainBenefitTest: true 
  },
  'A2(b)': { 
    description: 'Intermediary fee contingent on tax advantage preservation',
    requiresMainBenefitTest: true 
  },
  'A3': { 
    description: 'Standardised documentation/structure arrangement',
    requiresMainBenefitTest: true 
  },
  
  // Category B - Specific hallmarks linked to main benefit test
  'B1': { 
    description: 'Acquisition of loss-making company to reduce tax liability',
    requiresMainBenefitTest: true 
  },
  'B2': { 
    description: 'Conversion of income into lower-taxed categories',
    requiresMainBenefitTest: true 
  },
  'B3': { 
    description: 'Circular transactions resulting in round-tripping of funds',
    requiresMainBenefitTest: true 
  },
  
  // Category C - Specific hallmarks related to cross-border transactions
  'C1(a)': { 
    description: 'Deductible cross-border payments to associated enterprises in zero/low tax territories',
    requiresMainBenefitTest: false 
  },
  'C1(b)(i)': { 
    description: 'Deductible cross-border payment not included in recipient income',
    requiresMainBenefitTest: false 
  },
  'C1(b)(ii)': { 
    description: 'Beneficial tax regime applicable to cross-border payment',
    requiresMainBenefitTest: false 
  },
  'C1(c)': { 
    description: 'Exemption from corporate tax applied in recipient jurisdiction',
    requiresMainBenefitTest: false 
  },
  'C1(d)': { 
    description: 'Preferential tax regime applied in recipient jurisdiction',
    requiresMainBenefitTest: false 
  },
  'C2': { 
    description: 'Depreciation deduction claimed in more than one jurisdiction',
    requiresMainBenefitTest: false 
  },
  'C3': { 
    description: 'Double tax relief claimed in more than one jurisdiction',
    requiresMainBenefitTest: false 
  },
  'C4': { 
    description: 'Asset transfer with material valuation difference between jurisdictions',
    requiresMainBenefitTest: false 
  },
  
  // Category D - Hallmarks concerning automatic exchange of information
  'D1': { 
    description: 'Arrangement undermining CRS reporting obligation',
    requiresMainBenefitTest: false 
  },
  'D2': { 
    description: 'Arrangement involving non-transparent legal/beneficial ownership chain',
    requiresMainBenefitTest: false 
  },
  
  // Category E - Specific hallmarks concerning transfer pricing
  'E1': { 
    description: 'Unilateral safe harbour rules arrangement',
    requiresMainBenefitTest: false 
  },
  'E2': { 
    description: 'Transfer of hard-to-value intangibles',
    requiresMainBenefitTest: false 
  },
  'E3': { 
    description: 'Intragroup transfer of functions/risks/assets with significant EBIT reduction',
    requiresMainBenefitTest: false 
  },
};

const CRS_REPORTING_DEADLINE_DAY = 31;  // May 31st
const CRS_REPORTING_DEADLINE_MONTH = 4; // May (0-indexed)

const DAC6_REPORTING_DAYS = 30;  // 30 days from trigger date

const LOW_TAX_JURISDICTIONS = [
  'BM', 'KY', 'VG', 'BZ', 'PA', 'SC', 'MU', 'JE', 'GG', 'IM', 'GI',
  'BS', 'AI', 'TC', 'LI', 'MC', 'AD', 'SM', 'AE', 'BH',
];

// ============================================================================
// DAC6/CRS AGENT
// ============================================================================

export class DAC6CRSAgent {
  public readonly name = 'Malta DAC6/CRS International Tax Agent';
  public readonly version = '1.0.0';
  public readonly category = 'tax';
  public readonly type = 'specialist';

  private openai: OpenAI | null = null;
  private config: DAC6CRSAgentConfig;

  constructor(config: DAC6CRSAgentConfig = {}) {
    this.config = config;
    
    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (apiKey && config.enableAIHallmarkDetection !== false) {
      try {
        this.openai = new OpenAI({ apiKey });
      } catch {
        // OpenAI client initialization failed - continue without AI
        this.openai = null;
      }
    }
  }

  // ============================================================================
  // DAC6 HALLMARK DETECTION
  // ============================================================================

  /**
   * Analyze an arrangement for DAC6 hallmarks
   */
  async analyzeArrangement(arrangement: {
    description: string;
    participants: ArrangementParticipant[];
    transactionDetails: string;
    estimatedTaxBenefit?: number;
    contractTerms?: string;
  }): Promise<{
    hallmarks: Hallmark[];
    mainBenefitTestMet: boolean;
    isReportable: boolean;
    reportingDeadline: Date;
    recommendations: string[];
  }> {
    const hallmarks: Hallmark[] = [];
    const recommendations: string[] = [];

    // Check each hallmark
    for (const [code, hallmarkInfo] of Object.entries(DAC6_HALLMARKS)) {
      const result = await this.checkHallmark(code, hallmarkInfo, arrangement);
      if (result.triggered) {
        hallmarks.push(result);
      }
    }

    // Assess main benefit test for hallmarks that require it
    const mainBenefitTestMet = this.assessMainBenefitTest(arrangement);

    // Determine if reportable
    const isReportable = this.isArrangementReportable(hallmarks, mainBenefitTestMet);

    // Calculate reporting deadline (30 days from first step)
    const reportingDeadline = new Date();
    reportingDeadline.setDate(reportingDeadline.getDate() + DAC6_REPORTING_DAYS);

    // Generate recommendations
    if (isReportable) {
      recommendations.push(`Arrangement is reportable under DAC6 - file within ${DAC6_REPORTING_DAYS} days`);
      recommendations.push('Ensure all participant information is complete and accurate');
      recommendations.push('Prepare supporting documentation for CFR disclosure');
    }

    if (hallmarks.some(h => h.category === HallmarkCategory.D)) {
      recommendations.push('Review CRS reporting obligations - potential reporting undermining detected');
    }

    if (hallmarks.some(h => h.category === HallmarkCategory.E)) {
      recommendations.push('Ensure transfer pricing documentation supports arm\'s length principle');
    }

    return {
      hallmarks,
      mainBenefitTestMet,
      isReportable,
      reportingDeadline,
      recommendations,
    };
  }

  /**
   * Check if a specific hallmark is triggered
   */
  private async checkHallmark(
    code: string,
    info: { description: string; requiresMainBenefitTest: boolean },
    arrangement: {
      description: string;
      participants: ArrangementParticipant[];
      transactionDetails: string;
      contractTerms?: string;
    }
  ): Promise<Hallmark> {
    const category = code.charAt(0) as HallmarkCategory;
    const evidence: string[] = [];
    let triggered = false;
    let confidence = 0;

    // Rule-based checks
    switch (code) {
      case 'A1':
        // Confidentiality condition
        triggered = this.checkConfidentialityClause(arrangement);
        confidence = triggered ? 0.85 : 0.1;
        if (triggered) evidence.push('Confidentiality clause detected in arrangement');
        break;

      case 'A2(a)':
      case 'A2(b)':
        // Contingent fee arrangements
        triggered = this.checkContingentFees(arrangement);
        confidence = triggered ? 0.80 : 0.1;
        if (triggered) evidence.push('Fee arrangement linked to tax benefit');
        break;

      case 'C1(a)':
        // Cross-border payments to low-tax jurisdictions
        triggered = this.checkLowTaxPayments(arrangement);
        confidence = triggered ? 0.90 : 0.1;
        if (triggered) evidence.push('Deductible payment to low/zero tax jurisdiction detected');
        break;

      case 'D1':
        // CRS undermining
        triggered = this.checkCRSUndermining(arrangement);
        confidence = triggered ? 0.75 : 0.1;
        if (triggered) evidence.push('Arrangement may undermine CRS reporting');
        break;

      case 'E2':
        // Hard-to-value intangibles
        triggered = this.checkHTVITransfer(arrangement);
        confidence = triggered ? 0.70 : 0.1;
        if (triggered) evidence.push('Transfer of hard-to-value intangible assets detected');
        break;

      default:
        // Use AI for complex hallmark detection if available
        if (this.openai && this.config.enableAIHallmarkDetection !== false) {
          const aiResult = await this.aiHallmarkCheck(code, info.description, arrangement);
          triggered = aiResult.triggered;
          confidence = aiResult.confidence;
          evidence.push(...aiResult.evidence);
        }
    }

    return {
      category,
      subCategory: code,
      description: info.description,
      triggered,
      confidence,
      evidence,
    };
  }

  /**
   * AI-powered hallmark detection for complex cases
   */
  private async aiHallmarkCheck(
    code: string,
    description: string,
    arrangement: {
      description: string;
      transactionDetails: string;
      contractTerms?: string;
    }
  ): Promise<{ triggered: boolean; confidence: number; evidence: string[] }> {
    if (!this.openai) {
      return { triggered: false, confidence: 0, evidence: [] };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a DAC6 tax expert analyzing cross-border arrangements for reportable hallmarks under EU Directive 2018/822. 
Analyze the arrangement and determine if hallmark ${code} (${description}) is triggered.
Respond in JSON format: {"triggered": boolean, "confidence": 0-1, "evidence": ["reason1", "reason2"]}`,
          },
          {
            role: 'user',
            content: `Arrangement: ${arrangement.description}
Transaction Details: ${arrangement.transactionDetails}
Contract Terms: ${arrangement.contractTerms || 'Not provided'}

Is hallmark ${code} triggered?`,
          },
        ],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch {
      // AI check failed - fall back to not triggered
    }

    return { triggered: false, confidence: 0, evidence: [] };
  }

  // ============================================================================
  // HALLMARK RULE CHECKS
  // ============================================================================

  private checkConfidentialityClause(arrangement: { description: string; contractTerms?: string }): boolean {
    const text = `${arrangement.description} ${arrangement.contractTerms || ''}`.toLowerCase();
    const patterns = [
      'confidential', 'non-disclosure', 'nda', 'secret', 'proprietary',
      'not to be disclosed', 'keep private', 'restricted information',
    ];
    return patterns.some(p => text.includes(p));
  }

  private checkContingentFees(arrangement: { description: string; contractTerms?: string }): boolean {
    const text = `${arrangement.description} ${arrangement.contractTerms || ''}`.toLowerCase();
    const patterns = [
      'success fee', 'contingent fee', 'performance fee', 'tax savings',
      'percentage of savings', 'refund sharing', 'benefit sharing',
    ];
    return patterns.some(p => text.includes(p));
  }

  private checkLowTaxPayments(arrangement: { participants: ArrangementParticipant[] }): boolean {
    return arrangement.participants.some(p => 
      LOW_TAX_JURISDICTIONS.includes(p.countryCode.toUpperCase())
    );
  }

  private checkCRSUndermining(arrangement: { description: string; transactionDetails: string }): boolean {
    const text = `${arrangement.description} ${arrangement.transactionDetails}`.toLowerCase();
    const patterns = [
      'avoid reporting', 'circumvent crs', 'non-participating jurisdiction',
      'shell company', 'nominee', 'undisclosed account', 'bearer shares',
    ];
    return patterns.some(p => text.includes(p));
  }

  private checkHTVITransfer(arrangement: { description: string; transactionDetails: string }): boolean {
    const text = `${arrangement.description} ${arrangement.transactionDetails}`.toLowerCase();
    const patterns = [
      'intangible', 'ip transfer', 'license', 'royalty', 'brand',
      'trademark', 'patent', 'technology transfer', 'know-how',
    ];
    return patterns.some(p => text.includes(p));
  }

  // ============================================================================
  // MAIN BENEFIT TEST
  // ============================================================================

  private assessMainBenefitTest(arrangement: { estimatedTaxBenefit?: number; description: string }): boolean {
    // If significant tax benefit is quantified, likely meets test
    if (arrangement.estimatedTaxBenefit && arrangement.estimatedTaxBenefit > 10000) {
      return true;
    }

    // Check for tax-focused language
    const text = arrangement.description.toLowerCase();
    const taxBenefitPatterns = [
      'tax saving', 'reduce tax', 'minimize tax', 'avoid tax', 'tax efficient',
      'lower effective rate', 'refund', 'deduction', 'exemption',
    ];

    const matchCount = taxBenefitPatterns.filter(p => text.includes(p)).length;
    return matchCount >= 2;  // If 2+ patterns match, likely tax-motivated
  }

  private isArrangementReportable(hallmarks: Hallmark[], mainBenefitTestMet: boolean): boolean {
    if (hallmarks.length === 0) return false;

    // Check if any hallmark that requires main benefit test is triggered
    for (const hallmark of hallmarks) {
      if (!hallmark.triggered) continue;

      const hallmarkInfo = DAC6_HALLMARKS[hallmark.subCategory];
      if (!hallmarkInfo) continue;

      // If hallmark requires main benefit test and it's not met, skip
      if (hallmarkInfo.requiresMainBenefitTest && !mainBenefitTestMet) {
        continue;
      }

      // Otherwise, this hallmark makes arrangement reportable
      return true;
    }

    return false;
  }

  // ============================================================================
  // DAC6 DISCLOSURE GENERATION
  // ============================================================================

  /**
   * Generate DAC6 disclosure XML for CFR submission
   */
  generateDAC6Disclosure(arrangement: CrossBorderArrangement): DAC6Disclosure {
    const disclosureId = this.generateDisclosureId();
    const reportingEntity = arrangement.participants.find(p => p.isReportingEntity);

    if (!reportingEntity) {
      throw new Error('No reporting entity designated for arrangement');
    }

    const xmlContent = this.generateDAC6XML(arrangement, reportingEntity);

    return {
      disclosureId,
      arrangementId: arrangement.arrangementId,
      disclosureDate: new Date(),
      reportingEntity,
      xmlContent,
      status: 'pending',
    };
  }

  private generateDAC6XML(arrangement: CrossBorderArrangement, reportingEntity: ArrangementParticipant): string {
    const triggeredHallmarks = arrangement.hallmarks.filter(h => h.triggered);

    return `<?xml version="1.0" encoding="UTF-8"?>
<DAC6_OECD version="1.0" xmlns="urn:oecd:ties:dac6:v1">
  <MessageSpec>
    <TransmittingCountry>MT</TransmittingCountry>
    <MessageType>DAC6NEW</MessageType>
    <MessageRefId>${this.generateDisclosureId()}</MessageRefId>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </MessageSpec>
  <DAC6Disclosures>
    <Disclosure>
      <DisclosureID>${arrangement.arrangementId}</DisclosureID>
      <DisclosurePurpose>MAKE_AVAILABLE</DisclosurePurpose>
      <Summary>${this.escapeXml(arrangement.description)}</Summary>
      <ArrangementDetails>
        <ImplementationDate>${arrangement.implementationDate?.toISOString().split('T')[0] || ''}</ImplementationDate>
        <Value currCode="${arrangement.currency}">${arrangement.estimatedTaxBenefit || 0}</Value>
      </ArrangementDetails>
      <Hallmarks>
        ${triggeredHallmarks.map(h => `
        <Hallmark>
          <MainHallmark>${h.category}</MainHallmark>
          <SubHallmark>${h.subCategory}</SubHallmark>
        </Hallmark>`).join('')}
      </Hallmarks>
      <AffectedPerson>
        ${arrangement.participants.filter(p => p.type === 'taxpayer').map(p => `
        <Person>
          <Name>${this.escapeXml(p.name)}</Name>
          <TIN>${p.tin || ''}</TIN>
          <Address>${this.escapeXml(p.address)}</Address>
          <ResCountryCode>${p.countryCode}</ResCountryCode>
        </Person>`).join('')}
      </AffectedPerson>
      <Discloser>
        <Name>${this.escapeXml(reportingEntity.name)}</Name>
        <TIN>${reportingEntity.tin || ''}</TIN>
        <Address>${this.escapeXml(reportingEntity.address)}</Address>
        <ResCountryCode>${reportingEntity.countryCode}</ResCountryCode>
        <Role>${reportingEntity.type === 'intermediary' ? 'INTERMEDIARY' : 'TAXPAYER'}</Role>
      </Discloser>
      <AffectedCountries>
        ${arrangement.jurisdictions.map(j => `<Country>${j}</Country>`).join('')}
      </AffectedCountries>
    </Disclosure>
  </DAC6Disclosures>
</DAC6_OECD>`;
  }

  // ============================================================================
  // CRS REPORTING
  // ============================================================================

  /**
   * Generate CRS report for financial institution
   */
  generateCRSReport(
    reportingEntity: CRSReportingEntity,
    reportableAccounts: CRSReportableAccount[],
    reportingYear: number
  ): CRSReport {
    const reportId = this.generateCRSReportId(reportingEntity.tin, reportingYear);
    
    // CRS deadline is May 31st of following year
    const submissionDeadline = new Date(reportingYear + 1, CRS_REPORTING_DEADLINE_MONTH, CRS_REPORTING_DEADLINE_DAY);

    const report: CRSReport = {
      reportId,
      reportingEntity,
      reportingYear,
      reportableAccounts,
      submissionDeadline,
      status: 'draft',
    };

    // Generate XML
    report.xmlContent = this.generateCRSXML(report);

    return report;
  }

  /**
   * Classify account holder for CRS purposes
   */
  classifyAccountHolder(accountHolder: CRSAccountHolder): {
    isReportable: boolean;
    reportingCountries: string[];
    classification: string;
  } {
    // Malta residents are not reportable to other jurisdictions
    if (accountHolder.countryCode === 'MT') {
      return {
        isReportable: false,
        reportingCountries: [],
        classification: 'Malta resident - not reportable',
      };
    }

    // Check if entity type is reportable
    if (accountHolder.type === 'entity' && accountHolder.entityType === 'active_nfe') {
      return {
        isReportable: false,
        reportingCountries: [],
        classification: 'Active NFE - not reportable',
      };
    }

    // All other non-resident accounts are reportable
    return {
      isReportable: true,
      reportingCountries: [accountHolder.countryCode],
      classification: 'Non-resident - reportable to ' + accountHolder.countryCode,
    };
  }

  private generateCRSXML(report: CRSReport): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<CrsBody xmlns="urn:oecd:ties:crs:v1">
  <ReportingFI>
    <ResCountryCode>${report.reportingEntity.countryCode}</ResCountryCode>
    <IN INType="TIN">${report.reportingEntity.tin}</IN>
    <Name>${this.escapeXml(report.reportingEntity.name)}</Name>
    ${report.reportingEntity.giin ? `<GIIN>${report.reportingEntity.giin}</GIIN>` : ''}
    <Address>
      <AddressFree>${this.escapeXml(report.reportingEntity.address)}</AddressFree>
    </Address>
    <DocSpec>
      <DocTypeIndic>OECD1</DocTypeIndic>
      <DocRefId>${report.reportId}</DocRefId>
    </DocSpec>
  </ReportingFI>
  <ReportingGroup>
    ${report.reportableAccounts.map(account => `
    <AccountReport>
      <DocSpec>
        <DocTypeIndic>OECD1</DocTypeIndic>
        <DocRefId>${this.generateAccountRefId(account.accountNumber)}</DocRefId>
      </DocSpec>
      <AccountNumber>${account.accountNumber}</AccountNumber>
      <AccountHolder>
        <Individual>
          <Name>
            <NameFree>${this.escapeXml(account.accountHolder.name)}</NameFree>
          </Name>
          ${account.accountHolder.tin ? `<TIN>${account.accountHolder.tin}</TIN>` : ''}
          <Address>
            <AddressFree>${this.escapeXml(account.accountHolder.address)}</AddressFree>
          </Address>
          ${account.accountHolder.dateOfBirth ? `<BirthDate>${account.accountHolder.dateOfBirth.toISOString().split('T')[0]}</BirthDate>` : ''}
        </Individual>
      </AccountHolder>
      <AccountBalance currCode="${account.currency}">${account.accountBalance.toFixed(2)}</AccountBalance>
      <Payment>
        ${account.grossInterest ? `<Type>CRS501</Type><PaymentAmnt currCode="${account.currency}">${account.grossInterest.toFixed(2)}</PaymentAmnt>` : ''}
        ${account.grossDividends ? `<Type>CRS502</Type><PaymentAmnt currCode="${account.currency}">${account.grossDividends.toFixed(2)}</PaymentAmnt>` : ''}
        ${account.grossProceeds ? `<Type>CRS503</Type><PaymentAmnt currCode="${account.currency}">${account.grossProceeds.toFixed(2)}</PaymentAmnt>` : ''}
        ${account.otherIncome ? `<Type>CRS504</Type><PaymentAmnt currCode="${account.currency}">${account.otherIncome.toFixed(2)}</PaymentAmnt>` : ''}
      </Payment>
    </AccountReport>`).join('')}
  </ReportingGroup>
</CrsBody>`;
  }

  // ============================================================================
  // DEADLINE TRACKING
  // ============================================================================

  /**
   * Get upcoming DAC6/CRS filing deadlines
   */
  getUpcomingDeadlines(arrangements: CrossBorderArrangement[], crsReports: CRSReport[]): {
    dac6Deadlines: { arrangement: CrossBorderArrangement; daysRemaining: number }[];
    crsDeadlines: { report: CRSReport; daysRemaining: number }[];
  } {
    const now = new Date();
    
    const dac6Deadlines = arrangements
      .filter(a => a.status === 'draft' && a.reportingDeadline > now)
      .map(arrangement => ({
        arrangement,
        daysRemaining: Math.ceil((arrangement.reportingDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const crsDeadlines = crsReports
      .filter(r => r.status === 'draft' && r.submissionDeadline > now)
      .map(report => ({
        report,
        daysRemaining: Math.ceil((report.submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { dac6Deadlines, crsDeadlines };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateDisclosureId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MT-DAC6-${timestamp}-${random}`;
  }

  private generateCRSReportId(tin: string, year: number): string {
    return `MT-CRS-${tin}-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  private generateAccountRefId(accountNumber: string): string {
    const hash = accountNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `ACC-${hash.toString(36).toUpperCase()}-${Date.now().toString(36)}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Round currency to 2 decimal places
   */
  roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDAC6CRSAgent(config?: DAC6CRSAgentConfig): DAC6CRSAgent {
  return new DAC6CRSAgent(config);
}

// Lazy singleton
let _dac6crsAgent: DAC6CRSAgent | null = null;

export const dac6crsAgent = {
  instance(config?: DAC6CRSAgentConfig): DAC6CRSAgent {
    if (!_dac6crsAgent) {
      _dac6crsAgent = new DAC6CRSAgent(config);
    }
    return _dac6crsAgent;
  },
};

export default DAC6CRSAgent;
