import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supabase/src/integrations/supabase/types';
import type { AgentManifestDefinition, DirectorAgentOptions, McpToolDefinition } from './types';

const TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    toolKey: 'rag.search',
    name: 'Knowledge base search',
    description: 'Retrieve relevant knowledge base fragments using hybrid similarity search.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        topK: { type: 'integer', minimum: 1, maximum: 20 },
      },
      required: ['query'],
    },
    metadata: {
      category: 'knowledge',
    },
  },
  {
    toolKey: 'audit.risk_summary',
    name: 'Audit risk summary',
    description: 'Summarise audit risks and linked responses for a given engagement.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid' },
        engagementId: { type: 'string', format: 'uuid' },
      },
      required: ['orgId', 'engagementId'],
    },
    metadata: {
      category: 'audit',
      executor: 'audit-risk-summary',
    },
  },
  {
    toolKey: 'audit.evidence_summary',
    name: 'Audit evidence summary',
    description: 'Summarise evidence records and document coverage for an engagement.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid' },
        engagementId: { type: 'string', format: 'uuid' },
      },
      required: ['orgId', 'engagementId'],
    },
    metadata: {
      category: 'audit',
      executor: 'audit-evidence-summary',
    },
  },
  {
    toolKey: 'policy_check',
    name: 'Policy compliance check',
    description: 'Evaluate a statement against ISA/IFRS/ISAQM guidance.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        statement: { type: 'string' },
        domain: { type: 'string' },
      },
      required: ['statement'],
    },
    metadata: {
      category: 'governance',
    },
  },
  {
    toolKey: 'db.read',
    name: 'Dataset snapshot',
    description: 'Fetch a cached dataset placeholder for analytics or reconciliation.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        query_name: { type: 'string' },
      },
      required: ['query_name'],
    },
    metadata: {
      category: 'data',
    },
  },
  {
    toolKey: 'trial_balance.get',
    name: 'Trial balance snapshot',
    description: 'Retrieve the latest trial balance summary for diagnostic or reporting workflows.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid', description: 'Organisation identifier' },
        period: { type: 'string', description: 'Accounting period (YYYY-MM)' },
      },
      required: ['orgId', 'period'],
    },
    metadata: {
      category: 'finance',
    },
  },
  {
    toolKey: 'document.vision_ocr',
    name: 'Document OCR (Vision)',
    description: 'Extract legible text from an image or scanned page using OpenAI Vision models.',
    provider: 'openai',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'Public or signed URL pointing to the document image/page.',
        },
        instructions: {
          type: 'string',
          description: 'Optional extraction guidance (e.g., focus on tables, capture headers).',
        },
        language: {
          type: 'string',
          description: 'Optional response language hint (e.g., en-US, fr, Portuguese).',
        },
        model: {
          type: 'string',
          description: 'Override default vision model (e.g., gpt-4.1-mini).',
        },
      },
      required: ['url'],
    },
    metadata: {
      category: 'documents',
      executor: 'document-vision-ocr',
    },
  },
  {
    toolKey: 'accounting.reconciliation_summary',
    name: 'Accounting reconciliation summary',
    description: 'Summarise reconciliation status and variance totals for accounting close.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid' },
        engagementId: { type: 'string', format: 'uuid' },
      },
      required: ['orgId', 'engagementId'],
    },
    metadata: {
      category: 'accounting',
      executor: 'accounting-reconciliation-summary',
    },
  },
  {
    toolKey: 'accounting.journal_summary',
    name: 'Accounting journal summary',
    description: 'Summarise journal queue status and debit/credit totals.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid' },
        engagementId: { type: 'string', format: 'uuid' },
      },
      required: ['orgId', 'engagementId'],
    },
    metadata: {
      category: 'accounting',
      executor: 'accounting-journal-summary',
    },
  },
  {
    toolKey: 'accounting.close_summary',
    name: 'Accounting close status',
    description: 'Report the latest close period status, lock status, and operator.',
    provider: 'supabase',
    schema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', format: 'uuid' },
        engagementId: { type: 'string', format: 'uuid' },
      },
      required: ['orgId', 'engagementId'],
    },
    metadata: {
      category: 'accounting',
      executor: 'accounting-close-summary',
    },
  },
];

const MANIFEST_DEFINITIONS: AgentManifestDefinition[] = [
  {
    agentKey: 'director.core',
    version: '2025-01-15.v1',
    persona: 'DIRECTOR',
    promptTemplate:
      'You are the Director Agent. Break objectives into domain-specific tasks, assign them to capable agents, and request human review when autonomy risk is high.',
    toolKeys: ['rag.search', 'policy_check'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'MANAGER',
    metadata: {
      legacyAgentType: 'DIRECTOR',
      orchestrates: ['audit.execution', 'tax.partner', 'finance.partner'],
    },
  },
  {
    agentKey: 'safety.core',
    version: '2025-01-15.v1',
    persona: 'SAFETY',
    promptTemplate:
      'You are the Safety Agent. Evaluate proposed tasks for policy compliance, autonomy thresholds, and evidence requirements. Emit warnings or block execution when risk is unacceptable.',
    toolKeys: [],
    safetyLevel: 'HIGH',
    defaultRole: 'MANAGER',
    metadata: {
      legacyAgentType: 'SAFETY',
      policies: ['AGT-GOV-1', 'ISQM-1'],
    },
  },
  {
    agentKey: 'audit.execution',
    version: '2025-01-15.v1',
    persona: 'AUDIT',
    promptTemplate:
      'You are an audit execution specialist. Use available tools to gather evidence, analyse risk, and produce ISA-compliant outputs.',
    toolKeys: ['rag.search', 'policy_check', 'audit.risk_summary'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      legacyAgentType: 'AUDIT',
    },
  },
  {
    agentKey: 'accounting.close',
    version: '2025-01-15.v1',
    persona: 'FINANCE',
    promptTemplate:
      'You are an accounting close specialist. Summarise reconciliations, journal queues, and close status to support the controller.',
    toolKeys: ['accounting.reconciliation_summary', 'accounting.journal_summary', 'accounting.close_summary'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      legacyAgentType: 'CLOSE',
    },
  },
  {
    agentKey: 'finance.tax',
    version: '2025-01-15.v1',
    persona: 'FINANCE',
    promptTemplate:
      'You are the Tax Agent. Prepare compliance-ready insights across CIT, VAT, and cross-border obligations, highlighting risks and required approvals.',
    toolKeys: ['rag.search', 'policy_check', 'document.vision_ocr'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'MANAGER',
    metadata: {
      domain: 'TAX',
      knowledgeBases: ['tax_guidance'],
    },
  },
  {
    agentKey: 'finance.accounts_payable',
    version: '2025-01-15.v1',
    persona: 'FINANCE',
    promptTemplate:
      'You are the Accounts Payable Agent. Normalise invoices, surface exceptions, and prepare payment runs while respecting approval thresholds.',
    toolKeys: ['accounting.reconciliation_summary', 'accounting.journal_summary', 'document.vision_ocr'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      domain: 'ACCOUNTS_PAYABLE',
      knowledgeBases: ['procure_to_pay'],
    },
  },
  {
    agentKey: 'finance.cfo',
    version: '2025-01-15.v1',
    persona: 'FINANCE',
    promptTemplate:
      'You are the Controller/CFO Agent. Consolidate close status, journals, and trial balance insights into executive-ready summaries.',
    toolKeys: ['accounting.reconciliation_summary', 'accounting.journal_summary', 'accounting.close_summary', 'trial_balance.get'],
    safetyLevel: 'HIGH',
    defaultRole: 'MANAGER',
    metadata: {
      domain: 'CFO',
      knowledgeBases: ['ifrs', 'close_checklists'],
    },
  },
  {
    agentKey: 'finance.corporate',
    version: '2025-01-15.v1',
    persona: 'FINANCE',
    promptTemplate:
      'You are the Corporate Finance Agent. Produce board-ready packs, monitor covenants, and summarise treasury positions with actionable insights.',
    toolKeys: ['rag.search', 'policy_check', 'document.vision_ocr', 'db.read'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'MANAGER',
    metadata: {
      domain: 'CORPORATE_FINANCE',
      knowledgeBases: ['corporate_policy', 'treasury_playbooks'],
    },
  },
  {
    agentKey: 'finance.risk',
    version: '2025-01-15.v1',
    persona: 'RISK',
    promptTemplate:
      'You are the Finance Risk Agent. Evaluate autonomy, policy compliance, and regulatory exposure across finance workflows, escalating findings.',
    toolKeys: ['policy_check', 'rag.search', 'document.vision_ocr'],
    safetyLevel: 'HIGH',
    defaultRole: 'MANAGER',
    metadata: {
      domain: 'RISK',
      policies: ['AGT-GOV-1', 'ISQM-1'],
    },
  },
  {
    agentKey: 'tax.compliance',
    version: '2025-01-15.v1',
    persona: 'TAX',
    promptTemplate:
      'You are a tax compliance specialist. Prepare computations, filings, and risk summaries while enforcing jurisdictional policy controls.',
    toolKeys: ['rag.search', 'policy_check'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      legacyAgentType: 'TAX',
    },
  },
  {
    agentKey: 'advisory.consulting',
    version: '2025-01-15.v1',
    persona: 'ADVISORY',
    promptTemplate:
      'You are an advisory specialist. Produce valuation insights, scenario plans, and deal support based on available data.',
    toolKeys: ['rag.search'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      legacyAgentType: 'ADVISORY',
    },
  },
  {
    agentKey: 'client.collaboration',
    version: '2025-01-15.v1',
    persona: 'CLIENT',
    promptTemplate:
      'You are a client collaboration coordinator. Manage communications, deliverable distribution, and approval reminders.',
    toolKeys: ['notify.user'],
    safetyLevel: 'MEDIUM',
    defaultRole: 'EMPLOYEE',
    metadata: {
      legacyAgentType: 'CLIENT',
    },
  },
];

export async function upsertMcpTools(
  supabase: SupabaseClient<Database>,
  logInfo?: DirectorAgentOptions['logInfo'],
  logError?: DirectorAgentOptions['logError'],
): Promise<Map<string, string>> {
  const toolIdMap = new Map<string, string>();

  for (const definition of TOOL_DEFINITIONS) {
    try {
      const { data, error } = await supabase
        .from('agent_mcp_tools')
        .upsert(
          {
            tool_key: definition.toolKey,
            name: definition.name,
            description: definition.description ?? null,
            provider: definition.provider,
            schema_json: definition.schema,
            metadata: definition.metadata ?? {},
          },
          { onConflict: 'provider,tool_key' },
        )
        .select('id, tool_key, provider')
        .single();

      if (error || !data) {
        throw error ?? new Error('tool_upsert_failed');
      }

      if (definition.toolKey) {
        toolIdMap.set(definition.toolKey, data.id);
      }

      logInfo?.('mcp.tool_upserted', {
        toolKey: definition.toolKey,
        provider: definition.provider,
      });
    } catch (error) {
      logError?.('mcp.tool_upsert_failed', error, {
        toolKey: definition.toolKey,
        provider: definition.provider,
      });
    }
  }

  return toolIdMap;
}

export async function upsertAgentManifests(
  supabase: SupabaseClient<Database>,
  toolIdMap: Map<string, string>,
  logInfo?: DirectorAgentOptions['logInfo'],
  logError?: DirectorAgentOptions['logError'],
): Promise<void> {
  for (const manifest of MANIFEST_DEFINITIONS) {
    try {
      const resolvedToolIds = manifest.toolKeys
        .map((key) => toolIdMap.get(key))
        .filter((id): id is string => Boolean(id));

      const { error } = await supabase.from('agent_manifests').upsert(
        {
          agent_key: manifest.agentKey,
          version: manifest.version,
          persona: manifest.persona,
          prompt_template: manifest.promptTemplate,
          tool_ids: resolvedToolIds,
          default_role: manifest.defaultRole ?? 'EMPLOYEE',
          safety_level: manifest.safetyLevel ?? 'LOW',
          metadata: manifest.metadata ?? {},
        },
        { onConflict: 'agent_key,version' },
      );

      if (error) {
        throw error;
      }

      logInfo?.('mcp.agent_manifest_upserted', {
        agentKey: manifest.agentKey,
        version: manifest.version,
      });
    } catch (error) {
      logError?.('mcp.agent_manifest_upsert_failed', error, {
        agentKey: manifest.agentKey,
        version: manifest.version,
      });
    }
  }
}

export async function initialiseMcpInfrastructure(options: DirectorAgentOptions): Promise<void> {
  const toolMap = await upsertMcpTools(options.supabase, options.logInfo, options.logError);
  await upsertAgentManifests(options.supabase, toolMap, options.logInfo, options.logError);
}
