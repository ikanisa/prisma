/**
 * Prisma Core Configuration
 * 
 * Exports jurisdiction playbooks and configuration loaders.
 */

export { loadPlaybook, JURISDICTIONS, ENGAGEMENT_TYPES } from './playbooks.js';
export type { Playbook, Phase, TaskTemplate, DocRequestTemplate } from './types.js';
