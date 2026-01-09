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
export { computeVatReturn, type VatInput, type VatResult } from './compute-vat.js';
