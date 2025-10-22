import type { OrchestrationPlanTask } from '@prisma-glow/api-client';

export function convertPlanTaskToPayload(task: OrchestrationPlanTask) {
  const metadata: Record<string, unknown> = {
    description: task.description,
    requiresHumanReview: task.requiresHumanReview,
  };
  if (task.metadata && Object.keys(task.metadata).length > 0) {
    Object.assign(metadata, task.metadata);
  }
  return {
    agentKey: task.agentKey,
    title: task.title,
    input: task.inputs && Object.keys(task.inputs).length > 0 ? task.inputs : undefined,
    metadata,
  };
}
