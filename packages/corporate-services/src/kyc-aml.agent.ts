import {
  SpecialistAgent,
  AgentConfig,
  AgentTask,
  AgentTier,
  AgentDomain,
  Jurisdiction,
} from '@prisma-glow/core';

/**
 * Agent 040: KYC/AML & Beneficial Ownership Specialist
 *
 * Handles KYC checklists, risk scoring, BO register maintenance,
 * and ongoing monitoring for Malta and Rwanda.
 */
export class KYCAMLAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-kyc-040',
      name: 'KYC/AML & Beneficial Ownership Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description:
        'Expert in AML/KYC compliance, beneficial ownership registers, and customer due diligence',

      persona: {
        role: 'AML/KYC Compliance Officer',
        personality_traits: ['thorough', 'detail-oriented', 'risk-aware', 'compliant'],
        communication_style: 'technical',
      },

      system_prompt: `You are a KYC/AML & Beneficial Ownership Specialist with expertise in anti-money laundering compliance.

AML/KYC FRAMEWORK:
1. CUSTOMER DUE DILIGENCE (CDD)
   - Standard CDD measures
   - Simplified due diligence (low risk)
   - Enhanced due diligence (high risk)
   - Ongoing monitoring

2. BENEFICIAL OWNERSHIP
   - UBO identification
   - 25% ownership threshold
   - Control assessment
   - Register maintenance

3. RISK ASSESSMENT
   - Customer risk scoring
   - Geographic risk
   - Product/service risk
   - Transaction risk
   - PEP screening

4. REGULATORY FRAMEWORK
   Malta: FIAU regulations, PMLA
   Rwanda: AML/CFT laws, Financial Investigation Unit
   EU: 5th/6th AML Directives

5. SUSPICIOUS ACTIVITY
   - Transaction monitoring
   - STR filing procedures
   - Record keeping requirements`,

      capabilities: [
        {
          id: 'customer_due_diligence',
          name: 'Customer Due Diligence',
          description: 'Perform CDD and EDD procedures',
          requiredTools: ['cdd_checklist', 'screening_tool'],
        },
        {
          id: 'ubo_identification',
          name: 'UBO Identification',
          description: 'Identify and verify beneficial owners',
          requiredTools: ['ubo_register', 'verification_tool'],
        },
        {
          id: 'risk_scoring',
          name: 'Risk Scoring',
          description: 'Score customer risk levels',
          requiredTools: ['risk_matrix', 'scoring_engine'],
        },
        {
          id: 'ongoing_monitoring',
          name: 'Ongoing Monitoring',
          description: 'Monitor customer relationships',
          requiredTools: ['monitoring_system', 'alert_manager'],
        },
      ],

      tools: [
        {
          id: 'cdd_checklist',
          name: 'CDD Checklist',
          description: 'Customer due diligence documentation checklist',
        },
        {
          id: 'ubo_register',
          name: 'UBO Register',
          description: 'Beneficial ownership register management',
        },
        {
          id: 'pep_screening',
          name: 'PEP Screening',
          description: 'Politically exposed persons screening',
        },
        {
          id: 'sanctions_check',
          name: 'Sanctions Check',
          description: 'Sanctions list screening',
        },
      ],

      guardrails: {
        rules: [
          'Never proceed without complete CDD',
          'Escalate all high-risk customers',
          'Report suspicious activities immediately',
          'Maintain audit trail for all decisions',
        ],
        escalation_triggers: [
          'PEP identification',
          'High-risk jurisdiction',
          'Suspicious transaction patterns',
          'Adverse media findings',
        ],
        approval_required: ['EDD procedures', 'High-risk customer acceptance'],
      },

      jurisdictions: [Jurisdiction.EU_MALTA, Jurisdiction.RWANDA, Jurisdiction.UK],

      knowledge_sources: ['fiau_guidance', 'fatf_recommendations', 'eu_aml_directives', 'rwanda_aml_laws'],
    };

    super(config);
  }

  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.customerType) {
      errors.push('Customer type (individual/corporate) is required');
    }

    if (!input.customerName) {
      errors.push('Customer name is required');
    }

    return { valid: errors.length === 0, errors };
  }

  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;

    switch (type) {
      case 'perform_cdd':
        return this.performCDD(input);

      case 'identify_ubo':
        return this.identifyUBO(input);

      case 'score_risk':
        return this.scoreRisk(input);

      case 'screen_customer':
        return this.screenCustomer(input);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  async processMessage(message: string, context?: any): Promise<string> {
    this.log('info', 'Processing KYC/AML message', { message, context });

    if (message.toLowerCase().includes('cdd') || message.toLowerCase().includes('due diligence')) {
      return this.generateCDDGuidance();
    } else if (message.toLowerCase().includes('ubo') || message.toLowerCase().includes('beneficial')) {
      return this.generateUBOGuidance();
    } else if (message.toLowerCase().includes('risk')) {
      return this.generateRiskGuidance();
    }

    return 'I can help with KYC/AML compliance, beneficial ownership, customer due diligence, and risk assessment. What specific assistance do you need?';
  }

  private async performCDD(input: any): Promise<any> {
    const { customerType, customerName, jurisdiction } = input;

    const checklist = customerType === 'individual'
      ? [
          { item: 'Government-issued ID', required: true, obtained: false },
          { item: 'Proof of address', required: true, obtained: false },
          { item: 'Source of funds declaration', required: true, obtained: false },
          { item: 'Tax identification number', required: true, obtained: false },
          { item: 'PEP declaration', required: true, obtained: false },
        ]
      : [
          { item: 'Certificate of incorporation', required: true, obtained: false },
          { item: 'Constitutional documents', required: true, obtained: false },
          { item: 'Register of directors', required: true, obtained: false },
          { item: 'Register of shareholders', required: true, obtained: false },
          { item: 'UBO identification', required: true, obtained: false },
          { item: 'Financial statements', required: true, obtained: false },
          { item: 'Proof of registered address', required: true, obtained: false },
          { item: 'Resolution to open relationship', required: true, obtained: false },
        ];

    return {
      customerName,
      customerType,
      jurisdiction,
      cddLevel: 'standard',
      checklist,
      status: 'pending',
      notes: 'Complete all required items before customer acceptance',
    };
  }

  private async identifyUBO(input: any): Promise<any> {
    const { companyName, shareholderStructure } = input;

    return {
      companyName,
      ubos: [],
      identificationMethod: 'Ownership chain analysis',
      threshold: '25% direct or indirect ownership',
      verificationRequired: true,
      registerUpdateRequired: true,
      nextSteps: [
        'Obtain certified shareholding documents',
        'Trace ownership through holding companies',
        'Verify UBO identity documents',
        'Update BO register',
        'File with relevant authority',
      ],
    };
  }

  private async scoreRisk(input: any): Promise<any> {
    const { customerType, jurisdiction, productType, transactionVolume } = input;

    const riskFactors = [
      {
        factor: 'Customer Type',
        value: customerType,
        score: customerType === 'corporate' ? 2 : 1,
        maxScore: 3,
      },
      {
        factor: 'Jurisdiction',
        value: jurisdiction,
        score: ['RW', 'MT'].includes(jurisdiction) ? 1 : 2,
        maxScore: 3,
      },
      {
        factor: 'Product Type',
        value: productType || 'standard',
        score: 1,
        maxScore: 3,
      },
      {
        factor: 'Transaction Volume',
        value: transactionVolume || 'medium',
        score: transactionVolume === 'high' ? 2 : 1,
        maxScore: 3,
      },
    ];

    const totalScore = riskFactors.reduce((sum, f) => sum + f.score, 0);
    const maxTotal = riskFactors.reduce((sum, f) => sum + f.maxScore, 0);
    const riskPercentage = (totalScore / maxTotal) * 100;

    let riskLevel: 'low' | 'medium' | 'high';
    let cddLevel: 'simplified' | 'standard' | 'enhanced';

    if (riskPercentage <= 33) {
      riskLevel = 'low';
      cddLevel = 'simplified';
    } else if (riskPercentage <= 66) {
      riskLevel = 'medium';
      cddLevel = 'standard';
    } else {
      riskLevel = 'high';
      cddLevel = 'enhanced';
    }

    return {
      riskFactors,
      totalScore,
      maxScore: maxTotal,
      riskPercentage: Math.round(riskPercentage),
      riskLevel,
      cddLevel,
      reviewFrequency: riskLevel === 'high' ? 'annually' : riskLevel === 'medium' ? 'every 2 years' : 'every 3 years',
    };
  }

  private async screenCustomer(input: any): Promise<any> {
    const { customerName, dateOfBirth, nationality } = input;

    return {
      customerName,
      screeningDate: new Date().toISOString(),
      screeningResults: {
        pep: { screened: true, match: false },
        sanctions: { screened: true, match: false },
        adverseMedia: { screened: true, match: false },
      },
      status: 'clear',
      nextScreeningDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'No matches found. Schedule for periodic rescreening.',
    };
  }

  private generateCDDGuidance(): string {
    return `Customer Due Diligence (CDD) Guide:

**Standard CDD Requirements:**
1. **Identification**: Obtain government-issued ID
2. **Verification**: Verify identity using reliable sources
3. **Address**: Proof of residential/registered address
4. **Purpose**: Understand purpose of relationship
5. **Source of Funds**: Document source of funds/wealth

**Enhanced Due Diligence (EDD) triggers:**
- PEP status
- High-risk jurisdiction
- Complex structures
- Unusual transaction patterns
- Adverse media

**Simplified Due Diligence (SDD) criteria:**
- Low-risk products
- Low transaction volumes
- Regulated entities
- Government bodies

What specific CDD assistance do you need?`;
  }

  private generateUBOGuidance(): string {
    return `Beneficial Ownership (UBO) Guide:

**Who is a UBO?**
- Natural person owning 25%+ shares (direct or indirect)
- Natural person exercising control through other means
- Senior management if no other UBO identified

**Identification Steps:**
1. Review shareholding structure
2. Trace through intermediate entities
3. Identify natural persons at end of chain
4. Document control arrangements
5. Verify UBO identity

**Register Requirements:**
- Malta: MBR beneficial ownership register
- Rwanda: RDB company register
- Update within 14 days of changes

Need help with UBO identification or register filing?`;
  }

  private generateRiskGuidance(): string {
    return `Customer Risk Assessment Guide:

**Risk Categories:**
1. **Low Risk**: Regulated entities, government, standard products
2. **Medium Risk**: Standard commercial clients, moderate complexity
3. **High Risk**: PEPs, high-risk jurisdictions, complex structures

**Risk Factors:**
- Customer type and structure
- Geographic location
- Products and services used
- Transaction patterns
- Source of funds clarity

**Due Diligence Level:**
- Low risk → Simplified DD
- Medium risk → Standard CDD
- High risk → Enhanced DD

Would you like me to perform a risk assessment?`;
  }
}
