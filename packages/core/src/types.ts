import { z } from 'zod';

/**
 * Agent Tier Classification
 */
export enum AgentTier {
  ORCHESTRATOR = 1,
  SPECIALIST = 2,
  OPERATIONAL = 3,
  SUPPORT = 4,
}

/**
 * Agent Domain Classification
 */
export enum AgentDomain {
  ORCHESTRATION = 'orchestration',
  ACCOUNTING = 'accounting',
  AUDIT = 'audit',
  TAX = 'tax',
  CORPORATE_SERVICES = 'corporate_services',
  DOCUMENT_PROCESSING = 'document_processing',
  QUALITY_CONTROL = 'quality_control',
  SUPPORT = 'support',
}

/**
 * Supported Jurisdictions
 */
export enum Jurisdiction {
  // European Union
  EU_AUSTRIA = 'AT',
  EU_BELGIUM = 'BE',
  EU_BULGARIA = 'BG',
  EU_CROATIA = 'HR',
  EU_CYPRUS = 'CY',
  EU_CZECH_REPUBLIC = 'CZ',
  EU_DENMARK = 'DK',
  EU_ESTONIA = 'EE',
  EU_FINLAND = 'FI',
  EU_FRANCE = 'FR',
  EU_GERMANY = 'DE',
  EU_GREECE = 'GR',
  EU_HUNGARY = 'HU',
  EU_IRELAND = 'IE',
  EU_ITALY = 'IT',
  EU_LATVIA = 'LV',
  EU_LITHUANIA = 'LT',
  EU_LUXEMBOURG = 'LU',
  EU_MALTA = 'MT',
  EU_NETHERLANDS = 'NL',
  EU_POLAND = 'PL',
  EU_PORTUGAL = 'PT',
  EU_ROMANIA = 'RO',
  EU_SLOVAKIA = 'SK',
  EU_SLOVENIA = 'SI',
  EU_SPAIN = 'ES',
  EU_SWEDEN = 'SE',
  
  // United Kingdom
  UK = 'GB',
  
  // United States
  US_FEDERAL = 'US',
  US_AL = 'US-AL',
  US_AK = 'US-AK',
  US_AZ = 'US-AZ',
  US_AR = 'US-AR',
  US_CA = 'US-CA',
  US_CO = 'US-CO',
  US_CT = 'US-CT',
  US_DE = 'US-DE',
  US_FL = 'US-FL',
  US_GA = 'US-GA',
  US_HI = 'US-HI',
  US_ID = 'US-ID',
  US_IL = 'US-IL',
  US_IN = 'US-IN',
  US_IA = 'US-IA',
  US_KS = 'US-KS',
  US_KY = 'US-KY',
  US_LA = 'US-LA',
  US_ME = 'US-ME',
  US_MD = 'US-MD',
  US_MA = 'US-MA',
  US_MI = 'US-MI',
  US_MN = 'US-MN',
  US_MS = 'US-MS',
  US_MO = 'US-MO',
  US_MT = 'US-MT',
  US_NE = 'US-NE',
  US_NV = 'US-NV',
  US_NH = 'US-NH',
  US_NJ = 'US-NJ',
  US_NM = 'US-NM',
  US_NY = 'US-NY',
  US_NC = 'US-NC',
  US_ND = 'US-ND',
  US_OH = 'US-OH',
  US_OK = 'US-OK',
  US_OR = 'US-OR',
  US_PA = 'US-PA',
  US_RI = 'US-RI',
  US_SC = 'US-SC',
  US_SD = 'US-SD',
  US_TN = 'US-TN',
  US_TX = 'US-TX',
  US_UT = 'US-UT',
  US_VT = 'US-VT',
  US_VA = 'US-VA',
  US_WA = 'US-WA',
  US_WV = 'US-WV',
  US_WI = 'US-WI',
  US_WY = 'US-WY',
  
  // Canada
  CA_FEDERAL = 'CA',
  CA_AB = 'CA-AB', // Alberta
  CA_BC = 'CA-BC', // British Columbia
  CA_MB = 'CA-MB', // Manitoba
  CA_NB = 'CA-NB', // New Brunswick
  CA_NL = 'CA-NL', // Newfoundland and Labrador
  CA_NT = 'CA-NT', // Northwest Territories
  CA_NS = 'CA-NS', // Nova Scotia
  CA_NU = 'CA-NU', // Nunavut
  CA_ON = 'CA-ON', // Ontario
  CA_PE = 'CA-PE', // Prince Edward Island
  CA_QC = 'CA-QC', // Quebec
  CA_SK = 'CA-SK', // Saskatchewan
  CA_YT = 'CA-YT', // Yukon
  
  // Rwanda & EAC
  RWANDA = 'RW',
  EAC = 'EAC', // East African Community
}

/**
 * Professional Standards
 */
export enum Standard {
  // Accounting Standards
  IFRS = 'IFRS',
  US_GAAP = 'US-GAAP',
  UK_GAAP = 'UK-GAAP',
  
  // Auditing Standards
  ISA = 'ISA',
  ISQM = 'ISQM',
  PCAOB = 'PCAOB',
  
  // Ethics
  IESBA = 'IESBA',
  
  // Tax
  OECD = 'OECD',
  BEPS = 'BEPS',
}

/**
 * Agent Capability
 */
export const AgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredTools: z.array(z.string()).optional(),
});

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

/**
 * Agent Tool
 */
export const AgentToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional(),
});

export type AgentTool = z.infer<typeof AgentToolSchema>;

/**
 * Agent Persona
 */
export const PersonaSchema = z.object({
  role: z.string(),
  personality_traits: z.array(z.string()),
  communication_style: z.enum(['executive', 'technical', 'collaborative', 'analytical']),
});

export type Persona = z.infer<typeof PersonaSchema>;

/**
 * Agent Guardrails
 */
export const GuardrailsSchema = z.object({
  rules: z.array(z.string()),
  escalation_triggers: z.array(z.string()),
  approval_required: z.array(z.string()).optional(),
});

export type Guardrails = z.infer<typeof GuardrailsSchema>;

/**
 * Agent Configuration
 */
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  tier: z.nativeEnum(AgentTier),
  domain: z.nativeEnum(AgentDomain),
  description: z.string(),
  persona: PersonaSchema,
  system_prompt: z.string(),
  capabilities: z.array(AgentCapabilitySchema),
  tools: z.array(AgentToolSchema),
  guardrails: GuardrailsSchema,
  jurisdictions: z.array(z.nativeEnum(Jurisdiction)).optional(),
  standards: z.array(z.nativeEnum(Standard)).optional(),
  knowledge_sources: z.array(z.string()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Agent Message
 */
export const AgentMessageSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Agent Task
 */
export const AgentTaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  input: z.record(z.any()),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'escalated']),
  assignedTo: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

/**
 * Engagement
 */
export const EngagementSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  type: z.enum(['accounting', 'audit', 'tax', 'corporate', 'advisory']),
  status: z.enum(['acceptance', 'planning', 'execution', 'review', 'completion', 'archived']),
  jurisdiction: z.nativeEnum(Jurisdiction),
  leadAgent: z.string(),
  assignedAgents: z.array(z.string()),
  tasks: z.array(AgentTaskSchema),
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().optional(),
  actualCost: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Engagement = z.infer<typeof EngagementSchema>;
