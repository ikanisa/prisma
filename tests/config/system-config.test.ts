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
  getRoleHierarchy,
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

  it('merges configured roles with finance suite defaults', () => {
    const roles = getRoleHierarchy({ rbac: { roles: ['manager', 'partner'] } } as SystemConfig);
    expect(roles).toEqual([
      'MANAGER',
      'PARTNER',
      'SERVICE_ACCOUNT',
      'READONLY',
      'CLIENT',
      'EMPLOYEE',
      'EQR',
      'SYSTEM_ADMIN',
    ]);
  });

  it('falls back to default role hierarchy when not configured', () => {
    expect(getRoleHierarchy({} as SystemConfig)).toEqual([
      'SERVICE_ACCOUNT',
      'READONLY',
      'CLIENT',
      'EMPLOYEE',
      'MANAGER',
      'EQR',
      'PARTNER',
      'SYSTEM_ADMIN',
    ]);
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

  it('returns document AI defaults when configuration missing', () => {
    const pipeline = getDocumentAIPipelineConfig();
    expect(pipeline.steps).toEqual(['ocr', 'classify', 'extract', 'index']);
    expect(pipeline.extractors).toEqual({});
    expect(pipeline.provenanceRequired).toBe(true);
    expect(pipeline.errorHandling).toBe('quarantine_and_notify');
  });

  it('parses document AI configuration when provided', () => {
    const pipeline = getDocumentAIPipelineConfig({
      document_ai: {
        pipeline: {
          steps: ['scan', 'extract'],
          classifiers: { types: ['invoice', 'receipt'] },
          extractors: { invoice: ['amount', 'tax_id'] },
          error_handling: 'halt',
          provenance: { required: false },
        },
      },
    } as SystemConfig);

    expect(pipeline.steps).toEqual(['scan', 'extract']);
    expect(pipeline.classifierTypes).toEqual(['INVOICE', 'RECEIPT']);
    expect(pipeline.extractors.INVOICE).toEqual(['amount', 'tax_id']);
    expect(pipeline.errorHandling).toBe('halt');
    expect(pipeline.provenanceRequired).toBe(false);
  });

  it('returns empty tool policies when configuration missing', () => {
    expect(getToolPolicies()).toEqual([]);
    expect(getToolPolicy('documents.request_upload')).toBeUndefined();
  });

  it('parses tool policies with permissions and rate limits', () => {
    const config = {
      tools: [
        {
          name: 'documents.request_upload',
          required_permission: 'documents.upload',
          rate_limit_per_minute: 6,
          rate_limit_window_seconds: 120,
        },
      ],
    } as SystemConfig;

    const policy = getToolPolicy('documents.request_upload', config);
    expect(policy?.requiredPermission).toBe('documents.upload');
    expect(policy?.rateLimitPerMinute).toBe(6);
    expect(policy?.rateLimitWindowSeconds).toBe(120);
    expect(getToolPolicies(config)).toEqual([policy]);
  });

  it('maps agent definitions from configuration', () => {
    const agents = getAgentDefinitions();
    const onboarding = agents.find((agent) => agent.id === 'onboarding_agent');
    expect(onboarding).toBeDefined();
    expect(onboarding?.tools).toContain('documents.list');
    expect(onboarding?.defaultAutonomy).toBeUndefined();
    const toolAgents = getAgentsByTool('documents.upload_url');
    expect(toolAgents.map((agent) => agent.id)).toContain('onboarding_agent');
  });

  it('parses workflow definitions with steps and approvals', () => {
    const workflows = getWorkflowDefinitions();
    expect(workflows.length).toBeGreaterThan(0);
    const onboarding = getWorkflowDefinition('onboarding_zero_typing');
    expect(onboarding?.steps[0].agentId).toBe('onboarding_agent');
    expect(onboarding?.steps[0].tool).toBe('onboarding.start');
    expect(onboarding?.minimumAutonomy).toBe('L2');
    expect(onboarding?.steps[0].requiredAutonomy).toBe('L2');
    const monthlyClose = getWorkflowDefinition('monthly_close');
    expect(monthlyClose?.steps[0].agentId).toBe('accountant_agent');
    expect(monthlyClose?.steps[0].tool).toBe('close.snapshot_tb');
    expect(monthlyClose?.approvals).toContain('close.lock');
    expect(monthlyClose?.minimumAutonomy).toBe('L2');
    expect(monthlyClose?.steps.some((step) => step.requiredAutonomy === 'L2')).toBe(true);
  });

  it('returns default release controls when configuration missing', () => {
    const release = getReleaseControlSettings();
    expect(release.approvalsRequired).toEqual(['plan_freeze', 'filings_submit', 'report_release', 'period_lock']);
    expect(release.archive.manifestHash).toBe('sha256');
    expect(release.archive.includeDocs).toEqual([]);
  });

  it('parses release control overrides when provided', () => {
    const release = getReleaseControlSettings({
      release_controls: {
        approvals_required: ['report_release'],
        archive: {
          manifest_hash: 'sha1',
          include_docs: ['report_pdf', 'evidence_zip'],
        },
        environment: {
          autonomy: {
            minimum_level: 'L3',
            require_worker: false,
            critical_roles: ['partner', 'manager'],
          },
          mfa: {
            channel: 'sms',
            within_seconds: 600,
          },
          telemetry: {
            max_open_alerts: 2,
            severity_threshold: 'error',
          },
        },
      },
    } as SystemConfig);

    expect(release.approvalsRequired).toEqual(['report_release']);
    expect(release.archive.manifestHash).toBe('sha1');
    expect(release.archive.includeDocs).toEqual(['report_pdf', 'evidence_zip']);
    expect(release.environment.autonomy.minimumLevel).toBe('L3');
    expect(release.environment.autonomy.requireWorker).toBe(false);
    expect(release.environment.autonomy.criticalRoles).toEqual(['PARTNER', 'MANAGER']);
    expect(release.environment.mfa.channel).toBe('SMS');
    expect(release.environment.mfa.withinSeconds).toBe(600);
    expect(release.environment.telemetry.maxOpenAlerts).toBe(2);
    expect(release.environment.telemetry.severityThreshold).toBe('ERROR');
  });
});
