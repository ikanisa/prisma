/**
 * Prisma Glow AI Agents Registry
 * Exports all specialist agents with deep knowledge base integration
 */

export { accountantIfrsAgent } from './accountantIfrsAgent';
export { taxRwandaAgent } from './taxRwandaAgent';
export { taxMaltaAgent } from './taxMaltaAgent';
export { auditIsaAgent } from './auditIsaAgent';
export { corpMaltaAgent } from './corpMaltaAgent';

export { deepSearchTool } from './tools/deepSearchTool';

/**
 * Retrieval Rules Reference:
 *
 * Tax Rwanda:
 *   category: TAX, jurisdiction: RW (fallback: GLOBAL for OECD)
 *
 * Tax Malta:
 *   category: TAX, jurisdiction: MT (fallback: EU, GLOBAL)
 *
 * Audit ISA:
 *   category: ISA, jurisdiction: GLOBAL (also ETHICS for independence)
 *
 * Accounting IFRS:
 *   category: IFRS, jurisdiction: GLOBAL
 *
 * Corporate Malta:
 *   category: CORP, jurisdiction: MT (also REG, AML as needed)
 */
