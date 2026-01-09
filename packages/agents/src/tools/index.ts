/**
 * Agent Tools Index
 * 
 * Exports all available agent tools.
 */

export { eligibilityCheck, type EligibilityResult } from './eligibility-check.js';
export { getEngagementContext, type EngagementContext } from './get-engagement-context.js';
export { createOrUpdateWorkpaper, type WorkpaperInput } from './create-workpaper.js';
export { createTasks, type TaskInput } from './create-tasks.js';
export { computeMateriality, type MaterialityInput, type MaterialityResult } from './compute-materiality.js';
export {
    computeVatReturn,
    computeVatReturnWithManifest,
    type VatInput,
    type VatResult,
    type VatComputationWithManifest,
} from './compute-vat.js';
export { computeVatReturnTool } from './compute-vat-tool.js';
export { createDeterministicManifest, validateDeterministicManifest } from './deterministic-manifest.js';
export type { DeterministicManifest, ManifestValidationResult } from './deterministic-manifest.js';
