/**
 * Agent Router
 * 
 * Routes user messages to appropriate agents based on intent
 */

import type { ToolContext } from './types';

/**
 * Agent routing rule
 */
export interface AgentRoutingRule {
  agentId: string;
  agentName: string;
  condition: (message: string, context: ToolContext) => boolean;
  priority: number; // Higher priority = checked first
}

/**
 * Agent Router
 * Determines which agent should handle a message
 */
export class AgentRouter {
  private rules: AgentRoutingRule[] = [];

  /**
   * Register a routing rule
   */
  registerRule(rule: AgentRoutingRule): void {
    this.rules.push(rule);
    // Sort by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Route a message to an agent
   */
  route(message: string, context: ToolContext): AgentRoutingRule | null {
    for (const rule of this.rules) {
      if (rule.condition(message, context)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Get all registered rules
   */
  getRules(): AgentRoutingRule[] {
    return [...this.rules];
  }
}

/**
 * Global router instance
 */
export const agentRouter = new AgentRouter();

/**
 * Initialize default routing rules
 */
export function initializeDefaultRoutingRules(): void {
  // Admin actions - highest priority
  agentRouter.registerRule({
    agentId: 'admin-agent',
    agentName: 'Admin Agent',
    priority: 100,
    condition: (message, context) => {
      if (context.userRole !== 'SYSTEM_ADMIN') {
        return false;
      }
      const adminKeywords = [
        'user management',
        'invite staff',
        'set role',
        'system admin',
        'manage users',
      ];
      return adminKeywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Engagement management
  agentRouter.registerRule({
    agentId: 'engagement-agent',
    agentName: 'Engagement Agent',
    priority: 80,
    condition: (message) => {
      const keywords = [
        'create engagement',
        'new engagement',
        'list engagements',
        'engagement',
        'case',
        'client',
      ];
      return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Document management
  agentRouter.registerRule({
    agentId: 'document-agent',
    agentName: 'Document Agent',
    priority: 70,
    condition: (message) => {
      const keywords = [
        'upload document',
        'classify document',
        'extract',
        'document',
        'file',
        'invoice',
      ];
      return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Audit procedures
  agentRouter.registerRule({
    agentId: 'audit-agent',
    agentName: 'Audit Agent',
    priority: 60,
    condition: (message) => {
      const keywords = [
        'run audit',
        'audit procedure',
        'management letter',
        'audit',
        'compliance',
      ];
      return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Tax
  agentRouter.registerRule({
    agentId: 'tax-agent',
    agentName: 'Tax Agent',
    priority: 60,
    condition: (message) => {
      const keywords = [
        'tax',
        'vat',
        'tax summary',
        'jurisdiction',
        'tax year',
      ];
      return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Knowledge search
  agentRouter.registerRule({
    agentId: 'knowledge-agent',
    agentName: 'Knowledge Agent',
    priority: 50,
    condition: (message) => {
      const keywords = [
        'search',
        'find',
        'lookup',
        'ifrs',
        'isa',
        'guidance',
        'rule',
      ];
      return keywords.some((keyword) => message.toLowerCase().includes(keyword));
    },
  });

  // Default fallback
  agentRouter.registerRule({
    agentId: 'general-agent',
    agentName: 'General Assistant',
    priority: 10,
    condition: () => true, // Always matches
  });
}

// Auto-initialize
initializeDefaultRoutingRules();

