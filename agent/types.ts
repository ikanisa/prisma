/**
 * Prisma Glow AI Agent Platform - Type Definitions
 * Comprehensive type system for all 51 agents
 */

// ==========================================
// PHASE 5: OPTIMIZATION & SCALE TYPES
// ==========================================

export interface AgentMetrics {
  agentId: string;
  responseTime: number;
  responseTimeP50?: number;
  responseTimeP95?: number;
  responseTimeP99?: number;
  tokensUsed: number;
  averageTokensUsed?: number;
  averageResponseTime?: number;
  averageResponseLength?: number;
  errorRate: number;
  successRate: number;
  accuracy: number;
  hallucinations?: number;
  throughputPerHour?: number;
  hasError?: boolean;
  rating?: number;
  timestamp: Date;
}

export interface PerformanceProfile {
  agentId: string;
  averageResponseTime: number;
  averageTokensUsed: number;
  averageResponseLength: number;
  errorRate: number;
  successRate: number;
  executionCount: number;
  taskComplexity: 'low' | 'medium' | 'high';
  criticality: 'low' | 'medium' | 'high';
  activeTasks: number;
  lastUpdated: Date;
}

export interface OptimizationStrategy {
  type: 'prompt' | 'token' | 'cache' | 'routing';
  description: string;
  estimatedImpact: number;
  priority: 'low' | 'medium' | 'high';
}

export interface AgentHealth {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  successRate: number;
  throughput: number;
  lastHeartbeat: Date;
  alerts: Alert[];
}

export interface SystemMetrics {
  totalRequests24h: number;
  totalRequests30d: number;
  averageResponseTime: number;
  errorRate: number;
  tokensUsed24h: number;
  tokensUsed30d: number;
  costPerDay: number;
  activeAgents: number;
  queueDepth: number;
  cacheHitRate: number;
}

export interface FeedbackData {
  executionId?: string;
  agentId?: string;
  input?: string;
  output?: string;
  rating?: number;
  correction?: string;
  complaint?: string;
  timestamp?: Date;
}

export interface LearningExample {
  agentId: string;
  input: string;
  output: string;
  feedback: number;
  approved: boolean;
  tags: string[];
  createdAt: Date;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  input: any;
  output: any;
  metrics: AgentMetrics;
  timestamp: Date;
  userId?: string;
}

export interface AgentInstance {
  id: string;
  agentId: string;
  status: 'running' | 'terminating' | 'terminated';
  createdAt: Date;
  currentLoad: number;
  totalRequests: number;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

export type LoadBalancingStrategy = 
  | 'round-robin' 
  | 'least-connections' 
  | 'weighted' 
  | 'ip-hash';

export interface Alert {
  id?: string;
  agentId: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  threshold?: number;
  actualValue?: number;
  timestamp?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// ==========================================
// CORE AGENT TYPES
// ==========================================

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  tier: AgentTier;
  domain: string;
  description: string;
  persona: AgentPersona;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  knowledgeSources: string[];
  jurisdictions: string[];
  guardrails: string[];
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  SPECIALIST = 'specialist',
  OPERATIONAL = 'operational',
  SUPPORT = 'support'
}

export enum AgentTier {
  TIER_1 = 1, // Orchestrators
  TIER_2 = 2, // Domain Specialists
  TIER_3 = 3, // Operational
  TIER_4 = 4  // Support
}

export interface AgentPersona {
  role: string;
  personalityTraits: string[];
  communicationStyle: 'executive' | 'technical' | 'conversational' | 'formal';
  expertise: string[];
}

// ==========================================
// TASK & WORKFLOW TYPES
// ==========================================

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: TaskStatus;
  assignedAgentId?: string;
  parentTaskId?: string;
  childTaskIds: string[];
  input: any;
  output?: any;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  userId?: string;
  engagementId?: string;
}

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  step: number;
  agent: string | string[];
  action: string;
  inputs?: string[];
  outputs: string[];
  parallel?: boolean;
  condition?: string;
  timeout?: number;
}

// ==========================================
// KNOWLEDGE & CONTEXT TYPES
// ==========================================

export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'document' | 'database' | 'api' | 'vector_store';
  description: string;
  url?: string;
  metadata: Record<string, any>;
  lastUpdated: Date;
}

export interface Context {
  conversationId: string;
  userId: string;
  agentId: string;
  messages: Message[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ==========================================
// ENGAGEMENT & CLIENT TYPES
// ==========================================

export interface Engagement {
  id: string;
  clientId: string;
  type: 'audit' | 'tax' | 'accounting' | 'corporate_services' | 'advisory';
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  startDate: Date;
  endDate?: Date;
  assignedAgents: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  type: 'individual' | 'corporate' | 'partnership' | 'trust';
  jurisdictions: string[];
  industry?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// TEAM & COLLABORATION TYPES
// ==========================================

export interface Team {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  leadAgentId: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationRule {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  collaborationType: 'delegate' | 'consult' | 'notify' | 'escalate';
  triggerCondition: any;
  isEnabled: boolean;
  priority: number;
  createdAt: Date;
}

// ==========================================
// AUDIT & COMPLIANCE TYPES
// ==========================================

export interface AuditLog {
  id: string;
  agentId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

export interface ComplianceCheck {
  id: string;
  type: string;
  standard: string; // ISA, IFRS, Tax Code, etc.
  status: 'passed' | 'failed' | 'warning';
  details: string;
  recommendations: string[];
  performedBy: string;
  timestamp: Date;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  path: string;
  tags: string[];
}
