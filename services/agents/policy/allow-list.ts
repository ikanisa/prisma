import type { AgentRole } from '@prisma-glow/agents';

export interface ToolAllowListEntry {
  key: string;
  title: string;
  description: string;
  allowedRoles: AgentRole[];
  requiresFlags?: string[];
  denyFlags?: string[];
  approvalNotes?: string;
}

export const TOOL_ALLOW_LIST: Record<string, ToolAllowListEntry> = {
  'rag.search': {
    key: 'rag.search',
    title: 'Knowledge search',
    description: 'Query the governed knowledge index for contextual evidence.',
    allowedRoles: ['EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN'],
  },
  'docs.sign_url': {
    key: 'docs.sign_url',
    title: 'Document signature URL',
    description: 'Generate a pre-authenticated signing URL for controlled documents.',
    allowedRoles: ['MANAGER', 'SYSTEM_ADMIN'],
    requiresFlags: ['externalFiling'],
    approvalNotes: 'External filings require partner approval before distribution.',
  },
  'notify.user': {
    key: 'notify.user',
    title: 'User notification',
    description: 'Send high-signal notifications to internal collaborators.',
    allowedRoles: ['MANAGER', 'SYSTEM_ADMIN'],
    denyFlags: ['externalFiling'],
    approvalNotes: 'Escalate to HITL queue when filings are involved.',
  },
  'trial_balance.get': {
    key: 'trial_balance.get',
    title: 'Trial balance fetch',
    description: 'Retrieve ledger balances with immutable audit markers.',
    allowedRoles: ['EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN'],
    denyFlags: ['calculatorOverride'],
  },
  'risk.assess': {
    key: 'risk.assess',
    title: 'Engagement risk analysis',
    description: 'Score residual risk and control coverage for the engagement.',
    allowedRoles: ['MANAGER', 'SYSTEM_ADMIN'],
  },
};

export function getAllowListEntry(toolKey: string): ToolAllowListEntry | undefined {
  return TOOL_ALLOW_LIST[toolKey];
}

export function isToolAllowListed(toolKey: string): boolean {
  return Boolean(getAllowListEntry(toolKey));
}

export const CANONICAL_TOOL_KEYS = Object.keys(TOOL_ALLOW_LIST);
