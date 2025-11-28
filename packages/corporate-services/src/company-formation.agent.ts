import {
  SpecialistAgent,
  AgentConfig,
  AgentTask,
  AgentTier,
  AgentDomain,
  Jurisdiction,
  generateId,
} from '@prisma-glow/core';

/**
 * Agent 034: Company Formation Specialist
 * 
 * Expert in company incorporation across jurisdictions including
 * structure selection and regulatory requirements.
 */
export class CompanyFormationAgent extends SpecialistAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'corp-form-034',
      name: 'Company Formation Specialist',
      type: 'specialist',
      tier: AgentTier.SPECIALIST,
      domain: AgentDomain.CORPORATE_SERVICES,
      description: 'Expert in company incorporation across jurisdictions including structure selection and regulatory requirements',
      
      persona: {
        role: 'Corporate Formation Advisor',
        personality_traits: ['detail-oriented', 'efficient', 'knowledgeable', 'client-focused'],
        communication_style: 'technical',
      },
      
      system_prompt: `You are a Company Formation Specialist with expertise in corporate structures and incorporation requirements globally.

INCORPORATION SERVICES:
1. STRUCTURE SELECTION
   - Limited company
   - Partnership (LP, LLP)
   - Branch vs subsidiary
   - Holding structures

2. JURISDICTION SELECTION
   - Tax considerations
   - Regulatory environment
   - Substance requirements
   - Treaty access

3. INCORPORATION PROCESS
   - Name reservation
   - Constitutional documents
   - Director/shareholder requirements
   - Registered office
   - Share capital

JURISDICTION SPECIFICS:
- UK: Companies House, PSC register
- Malta: MBR, beneficial ownership
- Delaware: Franchise tax, registered agent
- Canada: Federal vs provincial
- Luxembourg: Notarial requirements
- Netherlands: Notarial deed

KEY RESPONSIBILITIES:
- Advise on optimal structure
- Prepare incorporation documents
- Handle regulatory filings
- Ensure compliance with local requirements
- Coordinate with local authorities`,
      
      capabilities: [
        {
          id: 'structure_advisory',
          name: 'Structure Advisory',
          description: 'Advise on optimal corporate structure based on client needs',
          requiredTools: ['structure_comparator', 'tax_analyzer'],
        },
        {
          id: 'incorporation_management',
          name: 'Incorporation Management',
          description: 'Manage the complete incorporation process',
          requiredTools: ['document_generator', 'registry_interface'],
        },
        {
          id: 'documentation_preparation',
          name: 'Documentation Preparation',
          description: 'Prepare all required incorporation documents',
          requiredTools: ['document_generator', 'template_library'],
        },
        {
          id: 'regulatory_filing',
          name: 'Regulatory Filing',
          description: 'Handle all regulatory filings and submissions',
          requiredTools: ['registry_interface', 'filing_tracker'],
        },
        {
          id: 'ongoing_compliance',
          name: 'Ongoing Compliance',
          description: 'Monitor ongoing compliance requirements',
          requiredTools: ['compliance_calendar', 'deadline_tracker'],
        },
      ],
      
      tools: [
        {
          id: 'structure_comparator',
          name: 'Structure Comparator',
          description: 'Compare different corporate structures across jurisdictions',
        },
        {
          id: 'document_generator',
          name: 'Document Generator',
          description: 'Generate incorporation documents',
        },
        {
          id: 'deadline_tracker',
          name: 'Deadline Tracker',
          description: 'Track incorporation deadlines and milestones',
        },
        {
          id: 'registry_interface',
          name: 'Registry Interface',
          description: 'Interface with corporate registries',
        },
      ],
      
      guardrails: {
        rules: [
          'Verify client identity and beneficial ownership',
          'Ensure compliance with AML/KYC requirements',
          'Validate substance requirements for each jurisdiction',
          'Confirm all required documents are complete',
        ],
        escalation_triggers: [
          'Complex ownership structures with multiple jurisdictions',
          'High-risk jurisdictions or industries',
          'Substance requirement concerns',
          'Beneficial ownership verification issues',
        ],
        approval_required: [
          'Incorporation in high-risk jurisdictions',
          'Complex group structures',
        ],
      },
      
      jurisdictions: [
        Jurisdiction.UK,
        Jurisdiction.EU_MALTA,
        Jurisdiction.EU_LUXEMBOURG,
        Jurisdiction.EU_NETHERLANDS,
        Jurisdiction.US_DE,
        Jurisdiction.CA_FEDERAL,
        Jurisdiction.RWANDA,
      ],
      
      knowledge_sources: [
        'companies_house_guidance',
        'malta_mbr_requirements',
        'delaware_incorporation_guide',
        'canada_corporations_act',
        'eu_company_law_directives',
      ],
    };
    
    super(config);
  }
  
  protected validateInput(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!input.jurisdiction) {
      errors.push('Jurisdiction is required');
    }
    
    if (!input.companyName) {
      errors.push('Company name is required');
    }
    
    if (!input.structure) {
      errors.push('Corporate structure type is required');
    }
    
    if (!input.shareholders || input.shareholders.length === 0) {
      errors.push('At least one shareholder is required');
    }
    
    if (!input.directors || input.directors.length === 0) {
      errors.push('At least one director is required');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  protected async execute(task: AgentTask): Promise<any> {
    const { type, input } = task;
    
    switch (type) {
      case 'structure_advisory':
        return this.provideStructureAdvice(input);
      
      case 'incorporate_company':
        return this.incorporateCompany(input);
      
      case 'prepare_documents':
        return this.prepareIncorporationDocuments(input);
      
      case 'name_check':
        return this.checkNameAvailability(input);
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }
  
  async processMessage(message: string, context?: any): Promise<string> {
    this.log('info', 'Processing message', { message, context });
    
    // Analyze the message to determine intent
    const intent = this.analyzeIntent(message);
    
    if (intent === 'structure_advice') {
      return this.generateStructureAdviceResponse(context);
    } else if (intent === 'incorporation_process') {
      return this.generateIncorporationProcessResponse(context);
    } else if (intent === 'jurisdiction_comparison') {
      return this.generateJurisdictionComparisonResponse(context);
    }
    
    return 'I can help you with company formation, structure selection, and incorporation processes. What specific information do you need?';
  }
  
  private analyzeIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('structure') || lowerMessage.includes('llc') || lowerMessage.includes('corporation')) {
      return 'structure_advice';
    } else if (lowerMessage.includes('incorporate') || lowerMessage.includes('formation')) {
      return 'incorporation_process';
    } else if (lowerMessage.includes('jurisdiction') || lowerMessage.includes('where')) {
      return 'jurisdiction_comparison';
    }
    
    return 'general';
  }
  
  private async provideStructureAdvice(input: any): Promise<any> {
    const { businessType, jurisdiction, taxObjectives, numberOfOwners } = input;
    
    const recommendations = [];
    
    // Simple structure recommendation logic
    if (jurisdiction === 'US' || jurisdiction.startsWith('US-')) {
      if (numberOfOwners === 1) {
        recommendations.push({
          structure: 'Single-Member LLC',
          pros: ['Pass-through taxation', 'Limited liability', 'Simple management'],
          cons: ['Self-employment tax on all income'],
          suitability: 'High',
        });
      } else {
        recommendations.push({
          structure: 'Multi-Member LLC',
          pros: ['Pass-through taxation', 'Flexible ownership', 'Limited liability'],
          cons: ['Self-employment tax considerations'],
          suitability: 'High',
        });
        
        recommendations.push({
          structure: 'C-Corporation',
          pros: ['Limited liability', 'Easy to raise capital', 'Stock options'],
          cons: ['Double taxation', 'More complex compliance'],
          suitability: 'Medium',
        });
      }
    } else if (jurisdiction === 'GB') {
      recommendations.push({
        structure: 'Private Limited Company (Ltd)',
        pros: ['Limited liability', 'Tax efficiency', 'Professional image'],
        cons: ['Public disclosure requirements', 'Annual compliance'],
        suitability: 'High',
      });
    } else if (jurisdiction === 'MT') {
      recommendations.push({
        structure: 'Private Limited Company',
        pros: ['EU access', 'Tax refund system', 'Holding company benefits'],
        cons: ['Substance requirements', 'Complex tax planning'],
        suitability: 'High for international structures',
      });
    }
    
    return {
      recommendations,
      nextSteps: [
        'Review tax implications with tax specialist',
        'Confirm substance requirements',
        'Prepare incorporation documents',
        'Register with authorities',
      ],
    };
  }
  
  private async incorporateCompany(input: any): Promise<any> {
    const incorporationId = generateId('INC');
    
    // Simulate incorporation process
    const steps = [
      { step: 1, name: 'Name Reservation', status: 'completed', duration: '1-2 days' },
      { step: 2, name: 'Document Preparation', status: 'in_progress', duration: '2-3 days' },
      { step: 3, name: 'Regulatory Filing', status: 'pending', duration: '3-7 days' },
      { step: 4, name: 'Certificate Issuance', status: 'pending', duration: '1-2 days' },
      { step: 5, name: 'Post-Incorporation Setup', status: 'pending', duration: '2-3 days' },
    ];
    
    return {
      incorporationId,
      status: 'in_progress',
      steps,
      estimatedCompletion: '10-15 business days',
      documents: [
        'Articles of Incorporation',
        'Bylaws',
        'Initial Resolutions',
        'Share Certificates',
      ],
    };
  }
  
  private async prepareIncorporationDocuments(input: any): Promise<any> {
    const { companyName, jurisdiction, structure, shareholders, directors } = input;
    
    const documents = [];
    
    // Generate document list based on jurisdiction
    if (jurisdiction === 'GB') {
      documents.push(
        { name: 'Form IN01', description: 'Application to register a company', status: 'ready' },
        { name: 'Articles of Association', description: 'Company constitution', status: 'ready' },
        { name: 'Statement of Capital', description: 'Share capital details', status: 'ready' },
        { name: 'PSC Register', description: 'Persons with significant control', status: 'ready' },
      );
    } else if (jurisdiction === 'MT') {
      documents.push(
        { name: 'Memorandum of Association', description: 'Company charter', status: 'ready' },
        { name: 'Articles of Association', description: 'Internal regulations', status: 'ready' },
        { name: 'Declaration of Compliance', description: 'Legal compliance statement', status: 'ready' },
        { name: 'UBO Declaration', description: 'Ultimate beneficial owner information', status: 'ready' },
      );
    }
    
    return {
      documents,
      notes: 'All documents prepared according to local requirements',
      nextSteps: ['Review and sign documents', 'Submit to registry'],
    };
  }
  
  private async checkNameAvailability(input: any): Promise<any> {
    const { companyName, jurisdiction } = input;
    
    // Simulate name check
    const available = !companyName.toLowerCase().includes('reserved');
    
    return {
      name: companyName,
      jurisdiction,
      available,
      similarNames: available ? [] : ['ReservedCorp Ltd', 'Reserved Holdings Inc'],
      restrictions: [
        'Cannot contain restricted words without approval',
        'Must be distinguishable from existing names',
        'Must include appropriate suffix (Ltd, Inc, etc.)',
      ],
    };
  }
  
  private generateStructureAdviceResponse(context: any): string {
    return `I can help you select the optimal corporate structure for your needs. 

Key factors to consider:
1. Tax implications (pass-through vs corporate taxation)
2. Liability protection
3. Number of owners and management structure
4. Fundraising needs
5. Jurisdiction requirements

Common structures include:
- LLC (Limited Liability Company)
- C-Corporation
- S-Corporation
- Limited Partnership (LP/LLP)
- Private Limited Company (Ltd)

What type of business are you planning to establish, and in which jurisdiction?`;
  }
  
  private generateIncorporationProcessResponse(context: any): string {
    return `The incorporation process typically involves these steps:

1. **Name Reservation** (1-2 days)
   - Check name availability
   - Reserve the company name

2. **Document Preparation** (2-3 days)
   - Articles of Incorporation
   - Bylaws/Articles of Association
   - Initial resolutions

3. **Regulatory Filing** (3-7 days)
   - Submit to registry
   - Pay filing fees
   - Provide required information

4. **Certificate Issuance** (1-2 days)
   - Receive incorporation certificate
   - Company officially formed

5. **Post-Incorporation** (2-3 days)
   - EIN/Tax registration
   - Bank account setup
   - Initial compliance filings

Total timeline: 10-15 business days (varies by jurisdiction)

Which jurisdiction are you interested in?`;
  }
  
  private generateJurisdictionComparisonResponse(context: any): string {
    return `I can help compare jurisdictions for company formation:

**UK:**
- Pros: Fast incorporation, strong legal system, treaty network
- Cons: Public disclosure, Brexit considerations
- Best for: EU/UK operations, credibility

**Malta:**
- Pros: EU member, tax refund system, holding structures
- Cons: Substance requirements, complex planning
- Best for: International holding companies

**Delaware (US):**
- Pros: Business-friendly laws, Court of Chancery, privacy
- Cons: Franchise tax, annual requirements
- Best for: Startups, VC-backed companies

**Canada:**
- Pros: Stable economy, NAFTA access, reputation
- Cons: Provincial variations, higher taxes
- Best for: North American operations

**Rwanda:**
- Pros: Investment incentives, EAC access, SEZ benefits
- Cons: Developing infrastructure
- Best for: African market entry

What are your primary objectives for the company?`;
  }
}
