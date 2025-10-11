import { describe, expect, it } from 'vitest';
import {
  getAllowedAutopilotJobs,
  getAssistantChips,
  getAssistantDockPlacementClass,
  getAssistantMotionPreset,
  getAssistantThemeTokens,
  getAutonomyJobAllowances,
  getAutonomyLevelDescription,
  getAutonomyLevelRank,
  getAutonomyLevels,
  getDocumentAIPipelineConfig,
  getClientPortalScopeSettings,
  getDefaultAutonomyLevel,
  getEmptyStateCopy,
  getBeforeAskingUserSequence,
  getEmailIngestSettings,
  getGoogleDriveSettings,
  getKnowledgeRetrievalSettings,
  getKnowledgeVectorIndexes,
  getUrlSourceSettings,
  getAgentDefinitions,
  getAgentsByTool,
  getToolPolicies,
  getToolPolicy,
  getWorkflowDefinitions,
  getWorkflowDefinition,
  getReleaseControlSettings,
  isClientActionDenied,
  systemConfig,
} from '@/lib/system-config';
import type { SystemConfig } from '@/lib/system-config';

describe('system-config', () => {
  it('parses system metadata', () => {
    expect(systemConfig.meta?.name).toBe('Autonomous Finance Suite');
  });

  it('returns configured chips for known routes', () => {
    const chips = getAssistantChips('/documents');
    expect(chips).toContain('Summarize document');
  });

  it('falls back to defaults when route missing', () => {
    const chips = getAssistantChips('/unknown-path');
    expect(Array.isArray(chips)).toBe(true);
  });

  it('includes assistant policy style rules', () => {
    expect(systemConfig.assistant_policies?.style_rules).toContain('Explain briefly; expand on request.');
  });

  it('honours assistant dock placement from configuration', () => {
    expect(getAssistantDockPlacementClass()).toContain('right-6');
  });

  it('falls back to default dock placement when configuration missing', () => {
    const placement = getAssistantDockPlacementClass({} as SystemConfig);
    expect(placement).toBe(getAssistantDockPlacementClass());
  });

  it('exposes theme tokens for assistant surfaces', () => {
    const theme = getAssistantThemeTokens();
    expect(theme.panelSurface).toBeTruthy();
  });

  it('returns configured empty state copy when present', () => {
    expect(getEmptyStateCopy('tasks')).toContain('Add onboarding checklist');
  });

  it('returns undefined for missing empty state key', () => {
    expect(getEmptyStateCopy('nonexistent', { ui: { empty_states: {} } } as SystemConfig)).toBeUndefined();
  });

  it('returns client portal scope from configuration', () => {
    const scope = getClientPortalScopeSettings();
    expect(scope.allowedRepos).toEqual(['02_Tax/PBC', '03_Accounting/PBC', '05_Payroll/PBC']);
    expect(scope.deniedActions).toContain('documents.view_internal');
  });

  it('falls back to defaults when client portal scope missing', () => {
    const scope = getClientPortalScopeSettings({} as SystemConfig);
    expect(scope.allowedRepos).toEqual(['02_Tax/PBC', '03_Accounting/PBC', '05_Payroll/PBC']);
    expect(scope.deniedActions).toEqual([]);
  });

  it('detects denied client actions from configuration', () => {
    expect(isClientActionDenied('documents.upload')).toBe(false);
    expect(isClientActionDenied('documents.view_internal')).toBe(true);
  });

  it('falls back to default motion preset for unknown key', () => {
    const preset = getAssistantMotionPreset({ ui: { shell: { style: { motion: 'unknown' } } } } as SystemConfig);
    expect(preset.toggle.initial).toBeDefined();
  });

  it('exposes autonomy level definitions and default', () => {
    const levels = getAutonomyLevels();
    expect(levels.L2).toMatch(/Auto-prepare/);
    expect(getDefaultAutonomyLevel()).toBe('L2');
    expect(getAutonomyLevelDescription('L3')).toMatch(/Autopilot/);
    expect(getAutonomyLevelRank('L1')).toBeGreaterThan(-1);
  });

  it('falls back to default autonomy configuration when missing', () => {
    const levels = getAutonomyLevels({} as SystemConfig);
    expect(levels.L0).toContain('Manual');
    expect(getDefaultAutonomyLevel({} as SystemConfig)).toBe('L2');
  });

  it('returns allowed autopilot jobs for each autonomy level', () => {
    const allowances = getAutonomyJobAllowances();
    expect(allowances.L0).toEqual([]);
    expect(allowances.L1).toEqual(['refresh_analytics']);
    expect(getAllowedAutopilotJobs('L2')).toContain('extract_documents');
  });

  it('exposes google drive data source settings', () => {
    const drive = getGoogleDriveSettings();
    expect(drive.enabled).toBe(true);
    expect(drive.oauthScopes).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(drive.folderMappingPattern).toBe('org-{orgId}/entity-{entityId}/{repoFolder}');
    expect(drive.mirrorToStorage).toBe(true);
  });

  it('falls back to default google drive values when missing', () => {
    const drive = getGoogleDriveSettings({} as SystemConfig);
    expect(drive.enabled).toBe(false);
    expect(drive.oauthScopes.length).toBeGreaterThan(0);
  });

  it('normalises url source settings and fetch policy', () => {
    const urlSources = getUrlSourceSettings();
    expect(urlSources.allowedDomains).toContain('*');
    expect(urlSources.fetchPolicy.obeyRobots).toBe(true);
    expect(urlSources.fetchPolicy.maxDepth).toBe(1);
    expect(urlSources.fetchPolicy.cacheTtlMinutes).toBeGreaterThan(0);
  });

  it('returns email ingest defaults when configuration missing', () => {
    const emailDefaults = getEmailIngestSettings({} as SystemConfig);
    expect(emailDefaults.enabled).toBe(false);
  });

  it('returns before-asking-user sequence from configuration', () => {
    const sequence = getBeforeAskingUserSequence();
    expect(sequence).toEqual(['documents', 'google_drive', 'url_sources']);
  });

  it('exposes knowledge vector indexes from configuration', () => {
    const indexes = getKnowledgeVectorIndexes();
    const financeIndex = indexes.find((index) => index.name === 'finance_docs_v1');
    expect(financeIndex).toBeDefined();
    expect(financeIndex?.chunkSize).toBe(1200);
    expect(financeIndex?.chunkOverlap).toBe(150);
  });

  it('returns retrieval settings with citation enforcement', () => {
    const retrieval = getKnowledgeRetrievalSettings();
    expect(retrieval.reranker).toBe('mini-lm-re-ranker-v2');
    expect(retrieval.topK).toBe(8);
    expect(retrieval.minCitationConfidence).toBeCloseTo(0.6, 3);
    expect(retrieval.requireCitation).toBe(true);
  });

  it('exposes document AI pipeline configuration', () => {
    const pipeline = getDocumentAIPipelineConfig();
    expect(pipeline.steps).toEqual(['ocr', 'classify', 'extract', 'index']);
    expect(pipeline.classifierTypes).toContain('INCORP_CERT');
    expect(pipeline.extractors.INCORP_CERT).toContain('company_name');
    expect(pipeline.errorHandling).toBe('quarantine_and_notify');
    expect(pipeline.provenanceRequired).toBe(true);
  });

  it('returns document AI defaults when configuration missing', () => {
    const pipeline = getDocumentAIPipelineConfig({} as SystemConfig);
    expect(pipeline.steps).toEqual(['ocr', 'classify', 'extract', 'index']);
    expect(pipeline.extractors).toEqual({});
    expect(pipeline.provenanceRequired).toBe(true);
    expect(pipeline.errorHandling).toBe('quarantine_and_notify');
  });

  it('exposes tool policies with permissions and rate limits', () => {
    const policy = getToolPolicy('documents.request_upload');
    expect(policy?.requiredPermission).toBe('documents.upload');
    expect(policy?.rateLimitPerMinute).toBe(6);
    expect(getToolPolicies().some((entry) => entry.name === 'workflows.run_step')).toBe(true);
  });

  it('maps agent definitions from configuration', () => {
    const agents = getAgentDefinitions();
    const onboarding = agents.find((agent) => agent.id === 'onboarding_agent');
    expect(onboarding).toBeDefined();
    expect(onboarding?.tools).toContain('documents.list');
    expect(onboarding?.defaultAutonomy).toBe('L2');
    const toolAgents = getAgentsByTool('documents.request_upload');
    expect(toolAgents.map((agent) => agent.id)).toContain('onboarding_agent');
  });

  it('parses workflow definitions with steps and approvals', () => {
    const workflows = getWorkflowDefinitions();
    expect(workflows.length).toBeGreaterThan(0);
    const onboarding = getWorkflowDefinition('onboarding_zero_typing');
    expect(onboarding?.steps[0].agentId).toBe('onboarding_agent');
    expect(onboarding?.steps[0].tool).toBe('show_required_docs_by_industry');
    expect(onboarding?.minimumAutonomy).toBe('L3');
    expect(onboarding?.steps[0].requiredAutonomy).toBe('L2');
    const monthlyClose = getWorkflowDefinition('monthly_close');
    expect(monthlyClose?.steps[0].tool).toBe('close.snapshot_tb');
    expect(monthlyClose?.approvals).toContain('close.lock -> PARTNER');
    expect(monthlyClose?.minimumAutonomy).toBe('L2');
    expect(monthlyClose?.steps.some((step) => step.requiredAutonomy === 'L2')).toBe(true);
  });

  it('exposes release control requirements from configuration', () => {
    const release = getReleaseControlSettings();
    expect(release.approvalsRequired).toEqual(['plan_freeze', 'filings_submit', 'report_release', 'period_lock']);
    expect(release.archive.manifestHash).toBe('sha256');
    expect(release.archive.includeDocs).toEqual([
      'report_pdf',
      'tcwg_pack',
      'return_files',
      'recon_schedules',
      'tb_snapshot',
    ]);
  });

  it('falls back to default release controls when configuration missing', () => {
    const release = getReleaseControlSettings({} as SystemConfig);
    expect(release.approvalsRequired).toEqual(['plan_freeze', 'filings_submit', 'report_release', 'period_lock']);
    expect(release.archive.manifestHash).toBe('sha256');
    expect(release.archive.includeDocs).toEqual([]);
  });
});
