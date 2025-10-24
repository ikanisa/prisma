import { randomUUID } from 'crypto';
import { DOMAIN_AGENTS, DOMAIN_AGENT_LIST } from './domain-agents.js';
import type { DomainAgentKey, OrchestrationPlan, OrchestrationTask, OrchestratorContext } from './types.js';

const DEFAULT_PRIORITY_ORDER: DomainAgentKey[] = [
  'auditExecution',
  'taxCompliance',
  'accountingClose',
  'accountsPayable',
  'corporateFinance',
  'brokerageEnablement',
  'financialReporting',
  'governance',
  'riskAndCompliance',
  'knowledgeCurator',
  'dataPreparation',
  'clientCollaboration',
  'callerMarketing',
  'mobilityOps',
  'opsMonitoring',
  'advisory',
];

export class DirectorAgent {
  constructor(private readonly options: { logInfo?: (msg: string, meta?: Record<string, unknown>) => void }) {}

  listDomainAgents() {
    return DOMAIN_AGENT_LIST;
  }

  generatePlan(context: OrchestratorContext): OrchestrationPlan {
    const tasks: OrchestrationTask[] = [];
    const priority = context.priority ?? 'MEDIUM';
    const baseOrder = [...DEFAULT_PRIORITY_ORDER];

    for (const key of baseOrder) {
      const agent = DOMAIN_AGENTS[key];
      if (!agent) continue;

      const shouldInclude = this.shouldIncludeAgent(agent.key, context);
      if (!shouldInclude) continue;

      tasks.push({
        id: randomUUID(),
        agentKey: agent.key,
        title: agent.title,
        description: this.buildTaskDescription(agent.key, context),
        inputs: this.buildTaskInputs(agent.key, context),
        status: 'PENDING',
        requiresHumanReview: this.requiresHumanReview(agent.key, priority),
        toolReferences: agent.toolCatalog ?? undefined,
        datasets: agent.datasetKeys ?? undefined,
        knowledgeBases: agent.knowledgeBases ?? undefined,
      });
    }

    const plan: OrchestrationPlan = {
      objective: context.objective,
      tasks,
      createdAt: new Date().toISOString(),
      createdBy: context.userId,
    };

    this.options.logInfo?.('director.plan_generated', {
      orgId: context.orgId,
      objective: context.objective,
      taskCount: tasks.length,
    });

    return plan;
  }

  private shouldIncludeAgent(agentKey: DomainAgentKey, context: OrchestratorContext): boolean {
    const intent = context.objective.toLowerCase();
    switch (agentKey) {
      case 'auditExecution':
        return intent.includes('audit') || intent.includes('isa') || intent.includes('engagement');
      case 'taxCompliance':
        return intent.includes('tax') || intent.includes('vat') || intent.includes('cit');
      case 'accountingClose':
        return intent.includes('close') || intent.includes('reconciliation') || intent.includes('controller') || intent.includes('cfo');
      case 'accountsPayable':
        return intent.includes('invoice') || intent.includes('payable') || intent.includes('ap');
      case 'corporateFinance':
        return (
          intent.includes('board') ||
          intent.includes('treasury') ||
          intent.includes('covenant') ||
          intent.includes('corporate') ||
          intent.includes('liquidity')
        );
      case 'brokerageEnablement':
        return (
          intent.includes('broker') ||
          intent.includes('deal') ||
          intent.includes('capital') ||
          intent.includes('sales') ||
          intent.includes('pipeline')
        );
      case 'financialReporting':
        return intent.includes('report') || intent.includes('ifrs');
      case 'advisory':
        return intent.includes('valuation') || intent.includes('deal');
      case 'callerMarketing':
        return (
          intent.includes('marketing') ||
          intent.includes('campaign') ||
          intent.includes('caller') ||
          intent.includes('outbound') ||
          intent.includes('telemarketing')
        );
      case 'mobilityOps':
        return (
          intent.includes('mobility') ||
          intent.includes('transport') ||
          intent.includes('fleet') ||
          intent.includes('transit') ||
          intent.includes('rider')
        );
      default:
        return true;
    }
  }

  private buildTaskDescription(agentKey: DomainAgentKey, context: OrchestratorContext): string {
    switch (agentKey) {
      case 'auditExecution':
        return `Plan and execute audit procedures for ${context.objective}. Coordinate risk assessment, analytics, sampling, and KAMs.`;
      case 'taxCompliance':
        return `Prepare tax computations and filings aligned to objective “${context.objective}”.`;
      case 'accountingClose':
        return `Coordinate period close, trial balance reviews, and executive reporting for ${context.objective}.`;
      case 'accountsPayable':
        return `Process invoices, run three-way match, and manage payments related to ${context.objective}.`;
      case 'corporateFinance':
        return `Prepare board-ready corporate finance packs, covenant checks, and treasury insights for ${context.objective}.`;
      case 'brokerageEnablement':
        return `Produce market briefings, collateral, and compliance-ready outreach assets to progress brokerage deals for ${context.objective}.`;
      case 'financialReporting':
        return `Produce IFRS financial statements and note disclosures informed by ${context.objective}.`;
      case 'governance':
        return `Ensure independence, autonomy gating, and policy compliance for the orchestration.`;
      case 'riskAndCompliance':
        return `Run policy checks and risk scoring across outputs of ${context.objective}.`;
      case 'knowledgeCurator':
        return `Curate knowledge sources relevant to ${context.objective} and refresh embeddings.`;
      case 'dataPreparation':
        return `Ingest and normalise source data required to deliver ${context.objective}.`;
      case 'clientCollaboration':
        return `Manage client communications and approvals for ${context.objective}.`;
      case 'callerMarketing':
        return `Orchestrate outbound caller campaigns, scripts, and creative refreshes aligned with ${context.objective}.`;
      case 'mobilityOps':
        return `Coordinate mobility service updates, rider comms, and regulatory briefings for ${context.objective}.`;
      case 'opsMonitoring':
        return `Track usage, cost, and alerts while executing ${context.objective}.`;
      case 'advisory':
        return `Deliver advisory outputs (e.g., valuations, scenarios) related to ${context.objective}.`;
      default:
        return `Support orchestration for ${context.objective}.`;
    }
  }

  private buildTaskInputs(agentKey: DomainAgentKey, context: OrchestratorContext) {
    switch (agentKey) {
      case 'auditExecution':
        return { priority: context.priority ?? 'MEDIUM', constraints: context.constraints ?? [] };
      case 'taxCompliance':
        return { jurisdictions: ['MT', 'EU'], riskLevel: 'HIGH' };
      case 'accountingClose':
        return { targetPeriod: context.constraints?.find((c) => c.includes('period')) ?? 'current' };
      case 'accountsPayable':
        return { approvalThreshold: 'MANAGER', includeAging: true };
      case 'corporateFinance':
        return { deliverables: ['board_pack', 'treasury_update'], horizon: context.priority ?? 'MEDIUM' };
      case 'brokerageEnablement':
        return {
          briefingScope: 'market_intel',
          requireCitations: true,
          targetSegments: context.constraints?.filter((c) => c.toLowerCase().includes('segment')) ?? [],
        };
      case 'financialReporting':
        return { frameworks: ['IFRS'], deliverable: 'FS + Notes' };
      case 'callerMarketing':
        return {
          campaign: context.objective,
          includeCreative: true,
          audienceFilters: context.constraints ?? [],
        };
      case 'mobilityOps':
        return {
          regions: context.constraints?.filter((c) => c.toLowerCase().includes('region')) ?? [],
          includeVisuals: true,
          requireRegulatorySummary: true,
        };
      default:
        return undefined;
    }
  }

  private requiresHumanReview(agentKey: DomainAgentKey, priority: 'LOW' | 'MEDIUM' | 'HIGH') {
    if (priority === 'HIGH') return true;
    return (
      agentKey === 'auditExecution' ||
      agentKey === 'taxCompliance' ||
      agentKey === 'financialReporting' ||
      agentKey === 'accountingClose' ||
      agentKey === 'corporateFinance' ||
      agentKey === 'brokerageEnablement' ||
      agentKey === 'mobilityOps'
    );
  }
}

export const directorAgent = new DirectorAgent({
  logInfo: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
});
