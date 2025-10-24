import { describe, expect, it } from 'vitest';
import { directorAgent } from '@prisma-glow/agents/director';

describe('DirectorAgent', () => {
  it('produces plan with relevant tasks for audit objective', () => {
    const plan = directorAgent.generatePlan({
      orgId: 'org-1',
      orgSlug: 'demo',
      userId: 'user-1',
      objective: 'Audit engagement for FY24',
      priority: 'HIGH',
    });
    expect(plan.tasks.some((task) => task.agentKey === 'auditExecution')).toBe(true);
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  it('includes controller and AP agents for finance objectives', () => {
    const plan = directorAgent.generatePlan({
      orgId: 'org-1',
      orgSlug: 'demo',
      userId: 'user-1',
      objective: 'Prepare close package and invoice run for Q2',
      priority: 'MEDIUM',
    });
    expect(plan.tasks.some((task) => task.agentKey === 'accountingClose')).toBe(true);
    expect(plan.tasks.some((task) => task.agentKey === 'accountsPayable')).toBe(true);
  });

  it('selects corporate finance agent for board reporting', () => {
    const plan = directorAgent.generatePlan({
      orgId: 'org-1',
      orgSlug: 'demo',
      userId: 'user-1',
      objective: 'Prepare board liquidity update and covenant review',
      priority: 'LOW',
    });
    expect(plan.tasks.some((task) => task.agentKey === 'corporateFinance')).toBe(true);
  });
});
