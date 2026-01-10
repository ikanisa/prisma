# MALTA AUTONOMOUS AI AGENT SYSTEM
## Part B: Autonomous AI Agent Architecture (Complete)

---

## 8. AGENT ORCHESTRATION FRAMEWORK

### 8.1 Orchestration Architecture Overview

**Purpose**: Coordinate multiple specialized agents to execute complex compliance workflows

**Key Components**:
1. **Director Agent**: Plans tasks, assigns agents, tracks progress
2. **Workflow Engine**: Executes multi-step processes with dependencies
3. **Message Bus**: Inter-agent communication
4. **Human-in-the-Loop Gates**: Approval checkpoints for critical decisions
5. **Autonomy Level Framework**: L0-L5 autonomy with safety guardrails

### 8.2 Malta-Specific Orchestration Patterns

#### Pattern 1: Annual Compliance Workflow

```typescript
interface AnnualComplianceWorkflow {
  entityId: string;
  fiscalYear: number;
  steps: WorkflowStep[];
}

const annualComplianceWorkflow: WorkflowStep[] = [
  {
    id: 'entity-classification',
    agent: 'entity-classifier-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    input: (context) => ({ entityId: context.entityId }),
    output: (result) => ({ classification: result })
  },
  {
    id: 'accounting-standard-determination',
    agent: 'ifrs-gapsme-decision-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    dependsOn: ['entity-classification'],
    input: (context, previousResults) => ({
      entityId: context.entityId,
      classification: previousResults['entity-classification']
    })
  },
  {
    id: 'financial-statement-generation',
    agent: 'ifrs-statement-agent', // or 'gapsme-agent'
    autonomy: AutonomyLevel.L3_CONDITIONAL,
    dependsOn: ['accounting-standard-determination'],
    hitlGate: {
      trigger: 'always',
      approvalRequired: true,
      reason: 'Financial statements require director approval before filing'
    }
  },
  {
    id: 'audit-requirement-validation',
    agent: 'audit-exemption-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    dependsOn: ['financial-statement-generation'],
    input: (context, previousResults) => ({
      entityId: context.entityId,
      fs: previousResults['financial-statement-generation']
    })
  },
  {
    id: 'audit-execution',
    agent: 'isa-audit-agent', // or 'isre-review-agent' or skip if exempt
    autonomy: AutonomyLevel.L2_PARTIAL,
    dependsOn: ['audit-requirement-validation'],
    condition: (previousResults) => 
      previousResults['audit-requirement-validation'].requirement !== 'exempt',
    hitlGate: {
      trigger: 'always',
      approvalRequired: true,
      reason: 'Audit reports require partner sign-off'
    }
  },
  {
    id: 'tax-computation',
    agent: 'cit-tax-agent',
    autonomy: AutonomyLevel.L3_CONDITIONAL,
    dependsOn: ['financial-statement-generation'],
    parallel: ['vat-compliance-agent', 'paye-agent']
  },
  {
    id: 'mbr-filing',
    agent: 'mbr-filing-agent',
    autonomy: AutonomyLevel.L3_CONDITIONAL,
    dependsOn: ['financial-statement-generation', 'audit-execution', 'tax-computation'],
    hitlGate: {
      trigger: 'always',
      approvalRequired: true,
      reason: 'MBR filing requires director signatures'
    }
  }
];
```

#### Pattern 2: Tax Refund Workflow

```typescript
const refundClaimWorkflow: WorkflowStep[] = [
  {
    id: 'profit-classification',
    agent: 'profit-classifier-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    input: (context) => ({ dividendDistribution: context.dividend })
  },
  {
    id: 'tax-account-allocation',
    agent: 'tax-account-allocator-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    dependsOn: ['profit-classification']
  },
  {
    id: 'refund-calculation',
    agent: 'cit-refund-agent',
    autonomy: AutonomyLevel.L4_HIGH,
    dependsOn: ['tax-account-allocation'],
    output: (result) => ({ refund: result })
  },
  {
    id: 'refund-validation',
    agent: 'refund-validator-agent',
    autonomy: AutonomyLevel.L3_CONDITIONAL,
    dependsOn: ['refund-calculation'],
    hitlGate: {
      trigger: 'refund_amount > 10000',
      approvalRequired: true,
      reason: 'Large refunds require manual review'
    }
  },
  {
    id: 'fs4-generation',
    agent: 'refund-form-generator-agent',
    autonomy: AutonomyLevel.L3_CONDITIONAL,
    dependsOn: ['refund-validation']
  },
  {
    id: 'bam2-submission',
    agent: 'bam2-submission-agent',
    autonomy: AutonomyLevel.L2_PARTIAL,
    dependsOn: ['fs4-generation'],
    hitlGate: {
      trigger: 'always',
      approvalRequired: true,
      reason: 'Tax refund submissions require authorized signatory approval'
    }
  }
];
```

### 8.3 Autonomy Level Framework

**L0-L5 Levels Applied to Malta Agents**:

| Autonomy Level | Use Case | Example Agents |
|----------------|----------|----------------|
| **L0_MANUAL** | Human performs, AI provides info only | Advisory consultation agent |
| **L1_ASSISTED** | AI suggests, human decides | Tax planning agent |
| **L2_PARTIAL** | AI performs routine, human reviews | VAT classification agent (review output) |
| **L3_CONDITIONAL** | AI autonomous within rules, HITL on exceptions | CIT refund agent (auto <€10K, manual >€10K) |
| **L4_HIGH** | AI autonomous, HITL for critical only | Entity classifier, profit type classifier |
| **L5_FULL** | Fully autonomous with audit trail | Data extraction agent, calculation agent |

### 8.4 Human-in-the-Loop Gates

```typescript
interface HITLGate {
  trigger: 'always' | 'threshold' | 'risk_score' | 'exception';
  condition?: (result: any) => boolean;
  approvalRequired: boolean;
  reason: string;
  approverRoles: string[];  // ['partner', 'director', 'authorized_signatory']
  timeoutHours?: number;    // Auto-approve if no response
}

// Example: Audit Report HITL Gate
const auditReportHITLGate: HITLGate = {
  trigger: 'always',
  approvalRequired: true,
  reason: 'Audit reports require partner sign-off per Accountancy Board requirements',
  approverRoles: ['partner', 'audit_manager'],
  timeoutHours: 48
};

// Example: Large Refund HITL Gate
const largeRefundHITLGate: HITLGate = {
  trigger: 'threshold',
  condition: (result) => result.refundAmount > 10000,
  approvalRequired: true,
  reason: 'Refunds exceeding €10,000 require senior review',
  approverRoles: ['tax_partner', 'compliance_officer'],
  timeoutHours: 24
};
```

### 8.5 Error Handling & Retry Logic

```typescript
interface AgentRetryPolicy {
  maxRetries: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  retryableErrors: string[];
  fallbackAgent?: string;
  escalationThreshold: number;  // Escalate to human after N failures
}

const bam2SubmissionRetryPolicy: AgentRetryPolicy = {
  maxRetries: 3,
  backoffStrategy: 'exponential',
  retryableErrors: [
    'BAM2_API_TIMEOUT',
    'BAM2_SERVER_ERROR',
    'BAM2_RATE_LIMIT'
  ],
  fallbackAgent: 'manual-submission-agent',
  escalationThreshold: 2
};
```

---

## 9. INTEGRATION ARCHITECTURE

### 9.1 External System Integrations

#### 9.1.1 BAM II (Commissioner for Revenue) Integration

**Architecture**: OAuth 2.0 REST API

```typescript
class BAM2Integration {
  private client: BAM2Client;
  private cache: RedisCache;
  
  async authenticate(): Promise<AccessToken> {
    // OAuth 2.0 client credentials flow
    const token = await this.client.getAccessToken({
      clientId: process.env.BAM2_CLIENT_ID,
      clientSecret: process.env.BAM2_CLIENT_SECRET,
      scope: 'vat:write cit:write paye:read refund:write'
    });
    
    // Cache token (expires in 3600s)
    await this.cache.set('bam2_token', token, 3500);
    
    return token;
  }
  
  async submitVatReturn(vatReturn: VatReturn): Promise<SubmissionResult> {
    // Ensure authenticated
    const token = await this.getValidToken();
    
    // Generate BAM II XML
    const xml = generateBAM2XML(vatReturn);
    
    // Submit with retry logic
    return await this.retryWithBackoff(
      () => this.client.submitVatReturn(xml, token),
      bam2SubmissionRetryPolicy
    );
  }
  
  async getRefundStatus(refundReference: string): Promise<RefundStatus> {
    const token = await this.getValidToken();
    return await this.client.getRefundStatus(refundReference, token);
  }
}
```

**Rate Limiting & Throttling**:
- BAM II API: 100 requests/minute
- Implement token bucket algorithm
- Queue submissions during peak hours

#### 9.1.2 MBR (Malta Business Registry) Integration

**Architecture**: REST API (if available) or web scraping with Selenium

```typescript
class MBRIntegration {
  private apiClient?: MBRAPIClient;
  private webDriver?: WebDriver;  // Selenium fallback
  
  async submitAnnualReturn(
    form: DD1Form,
    fsPackage: FinancialStatementsPackage
  ): Promise<SubmissionResult> {
    // Try API first
    if (this.apiClient) {
      try {
        return await this.apiClient.submitAnnualReturn(form, fsPackage);
      } catch (error) {
        logger.warn('MBR API failed, falling back to web automation');
      }
    }
    
    // Fallback to web automation
    return await this.submitViaWebAutomation(form, fsPackage);
  }
  
  private async submitViaWebAutomation(
    form: DD1Form,
    fsPackage: FinancialStatementsPackage
  ): Promise<SubmissionResult> {
    const driver = await this.getWebDriver();
    
    // Navigate to MBR portal
    await driver.get('https://mbr.mt/login');
    
    // Login
    await this.login(driver, process.env.MBR_CREDENTIALS);
    
    // Fill DD1 form
    await this.fillDD1Form(driver, form);
    
    // Upload FS package
    await this.uploadFiles(driver, fsPackage);
    
    // Submit and capture reference
    const reference = await this.submitForm(driver);
    
    return {
      success: true,
      reference,
      submissionDate: new Date(),
      method: 'web_automation'
    };
  }
}
```

#### 9.1.3 MFSA Integration

**Architecture**: REST API for OSF/EMT portals

```typescript
class MFSARegulatoryIntegration {
  private osfClient: OSFClient;  // Online Services Facility
  private emtClient: EMTClient;  // Electronic Money Tracker
  
  async submitPillar3Disclosure(disclosure: Pillar3Disclosure): Promise<SubmissionResult> {
    // Convert to MFSA format
    const mfsaFormat = convertToMFSAFormat(disclosure);
    
    // Submit via OSF
    return await this.osfClient.submitPillar3(mfsaFormat);
  }
  
  async submitEMTReport(emtData: EMTReport): Promise<SubmissionResult> {
    // For payment institutions
    return await this.emtClient.submitReport(emtData);
  }
}
```

### 9.2 Internal System Integrations

#### 9.2.1 Database Integration (Supabase/PostgreSQL)

```typescript
class MaltaDatabaseIntegration {
  private supabase: SupabaseClient;
  
  async saveEntity(entity: MaltaEntity): Promise<void> {
    await this.supabase
      .from('malta_entities')
      .upsert({
        id: entity.id,
        registration_number: entity.registrationNumber,
        accounting_standard: entity.accountingStandard,
        audit_requirement: entity.auditRequirement,
        is_mfsa_regulated: entity.isMFSARegulated,
        is_mga_licensed: entity.isMGALicensed,
        updated_at: new Date().toISOString()
      });
  }
  
  async saveTaxAccountAllocation(
    allocation: TaxAccountAllocation
  ): Promise<void> {
    await this.supabase
      .from('malta_tax_accounts')
      .insert({
        entity_id: allocation.entityId,
        year: allocation.fiscalYear,
        mta_balance: allocation.mtaBalance,
        fia_balance: allocation.fiaBalance,
        ipa_balance: allocation.ipaBalance,
        untaxed_balance: allocation.untaxedBalance
      });
  }
  
  async getRefundClaims(entityId: string): Promise<RefundClaim[]> {
    const { data, error } = await this.supabase
      .from('malta_refund_claims')
      .select('*')
      .eq('entity_id', entityId)
      .order('claim_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
```

#### 9.2.2 Knowledge Base Integration (RAG)

```typescript
class MaltaKnowledgeBaseIntegration {
  private vectorStore: VectorStore;  // pgvector
  private llm: LLMClient;  // OpenAI GPT-5
  
  async queryMaltaRegulations(query: string): Promise<RegulationReference[]> {
    // Semantic search in RAG corpus
    const embeddings = await this.llm.embed(query);
    
    const results = await this.vectorStore.similaritySearch({
      embedding: embeddings,
      table: 'malta_regulations',
      limit: 5,
      filter: {
        jurisdiction: 'MT',
        is_active: true
      }
    });
    
    return results.map(r => ({
      source: r.metadata.source,  // e.g., "Income Tax Act Cap. 123"
      section: r.metadata.section,
      content: r.content,
      relevanceScore: r.score
    }));
  }
  
  async updateKnowledgeBase(regulations: Regulation[]): Promise<void> {
    // Ingest new regulations into vector store
    for (const reg of regulations) {
      const embedding = await this.llm.embed(reg.content);
      
      await this.vectorStore.insert({
        content: reg.content,
        embedding,
        metadata: {
          source: reg.source,
          section: reg.section,
          jurisdiction: 'MT',
          effectiveDate: reg.effectiveDate,
          is_active: reg.isActive
        }
      });
    }
  }
}
```

**RAG Corpus Sources**:
1. **Legislation.mt**: All Malta legislation (Cap. 123, 281, 386, 406, etc.)
2. **MIA Publications**: The Accountant journal, Technical E-News
3. **CFR Practice Notes**: VAT information notes, tax guidance
4. **MFSA Circulars**: Regulatory updates for financial services
5. **Legal Notices**: LN 139/2025, LN 188/2025, etc.

#### 9.2.3 File Storage Integration (Supabase Storage)

```typescript
class MaltaFileStorageIntegration {
  private storage: SupabaseStorageClient;
  
  async uploadFinancialStatements(
    entityId: string,
    fiscalYear: number,
    fsPdf: Buffer
  ): Promise<string> {
    const fileName = `${entityId}/fs/${fiscalYear}/financial-statements.pdf`;
    
    const { data, error } = await this.storage
      .from('malta-documents')
      .upload(fileName, fsPdf, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: urlData } = this.storage
      .from('malta-documents')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }
  
  async uploadAuditReport(
    entityId: string,
    fiscalYear: number,
    auditPdf: Buffer
  ): Promise<string> {
    const fileName = `${entityId}/audit/${fiscalYear}/audit-report.pdf`;
    
    const { data, error } = await this.storage
      .from('malta-documents')
      .upload(fileName, auditPdf);
    
    if (error) throw error;
    
    return this.getPublicUrl(fileName);
  }
}
```

### 9.3 Event-Driven Architecture

```typescript
interface MaltaAgentEvent {
  eventType: 'entity_classified' | 'fs_generated' | 'audit_completed' | 
             'tax_computed' | 'filing_submitted' | 'refund_approved';
  entityId: string;
  fiscalYear?: number;
  payload: Record<string, any>;
  timestamp: Date;
  agentId: string;
}

class MaltaEventBus {
  private subscribers: Map<string, EventHandler[]>;
  
  async publish(event: MaltaAgentEvent): Promise<void> {
    // Publish to event bus (Redis Pub/Sub or Supabase Realtime)
    await this.eventBus.publish('malta_agents', event);
    
    // Notify subscribers
    const handlers = this.subscribers.get(event.eventType) || [];
    await Promise.all(handlers.map(h => h(event)));
  }
  
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }
}

// Example: Chain reactions
eventBus.subscribe('financial_statement_generated', async (event) => {
  // Auto-trigger audit requirement validation
  await orchestrator.execute('audit-exemption-agent', {
    entityId: event.entityId,
    fs: event.payload.financialStatements
  });
});

eventBus.subscribe('audit_requirement_determined', async (event) => {
  if (event.payload.requirement === 'full_audit') {
    // Auto-trigger audit engagement
    await orchestrator.execute('isa-audit-agent', {
      entityId: event.entityId,
      fiscalYear: event.fiscalYear
    });
  }
});
```

### 9.4 API Gateway & Routing

```typescript
// FastAPI backend routing
@app.post('/api/malta/entities/{entity_id}/classify')
async def classify_entity(entity_id: str):
    """Classify entity and determine compliance requirements"""
    agent = EntityClassifierAgent()
    result = await agent.classify(entity_id)
    return result

@app.post('/api/malta/entities/{entity_id}/financial-statements')
async def generate_financial_statements(
    entity_id: str,
    fiscal_year: int,
    accounting_standard: Optional[str] = None
):
    """Generate IFRS or GAPSME financial statements"""
    if accounting_standard == 'GAPSME':
        agent = GAPSMEAgent()
    else:
        agent = IFRSStatementAgent()
    
    result = await agent.generateStatements(entity_id, fiscal_year)
    return result

@app.post('/api/malta/entities/{entity_id}/refund-claims')
async def calculate_refund(
    entity_id: str,
    dividend_distribution: DividendDistribution
):
    """Calculate CIT refund"""
    agent = CITRefundAgent()
    result = await agent.calculateRefund(dividend_distribution)
    return result

@app.post('/api/malta/vat/returns')
async def submit_vat_return(vat_return: VatReturn):
    """Submit VAT return to BAM II"""
    agent = VATComplianceAgent()
    result = await agent.submitToBAM2(vat_return)
    return result
```

### 9.5 Security & Authentication

```typescript
// JWT-based authentication for API access
interface MaltaAgentCredentials {
  firmId: string;
  userId: string;
  permissions: string[];  // ['accounting:read', 'tax:write', 'audit:approve']
  mfaRequired: boolean;
}

class MaltaSecurityMiddleware {
  async authenticate(request: Request): Promise<MaltaAgentCredentials> {
    // Extract JWT token
    const token = this.extractToken(request);
    
    // Verify token
    const payload = await this.verifyJWT(token);
    
    // Check permissions
    this.checkPermissions(payload, request.route);
    
    // MFA check if required
    if (payload.mfaRequired && !request.mfaVerified) {
      throw new Error('MFA verification required');
    }
    
    return payload;
  }
  
  async authorize(
    credentials: MaltaAgentCredentials,
    action: string,
    resource: string
  ): Promise<boolean> {
    // Role-based access control
    const requiredPermission = `${resource}:${action}`;
    return credentials.permissions.includes(requiredPermission);
  }
}
```

---

## 10. DEPLOYMENT ARCHITECTURE

### 10.1 Container Orchestration

```yaml
# docker-compose.yml for Malta agents
version: '3.8'
services:
  malta-agents-api:
    build: ./packages/accounting-malta
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - BAM2_CLIENT_ID=${BAM2_CLIENT_ID}
      - BAM2_CLIENT_SECRET=${BAM2_CLIENT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "3002:3000"
    depends_on:
      - redis
      - postgres
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=prisma_malta
      - POSTGRES_USER=prisma
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./supabase/migrations:/docker-entrypoint-initdb.d
```

### 10.2 CI/CD Pipeline

```yaml
# .github/workflows/malta-agents.yml
name: Malta Agents CI/CD

on:
  push:
    paths:
      - 'packages/accounting-malta/**'
      - 'packages/audit-malta/**'
      - 'packages/tax/src/agents/malta/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22.12.0'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --filter @prisma/accounting-malta
      - run: pnpm test --filter @prisma/audit-malta
      - run: pnpm test --filter @prisma/tax
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: pnpm build --filter @prisma/accounting-malta
      - run: docker build -t malta-agents:latest .
      - run: docker push malta-agents:latest
      - run: kubectl apply -f k8s/malta-agents.yml
```

---

**Part B Complete**. This completes the Agent Orchestration Framework and Integration Architecture sections.
