# Standards Traceability Matrix

| ID | Requirement / Standard | Control / Feature | Evidence / Artifact | Location | Owner |
| --- | --- | --- | --- | --- | --- |
| TM-001 | ISA 300.7 Engagement planning | ISA Planning & Risk Assessment checklist | Checklist export stored in Documents; Activity log entry `agent.plan_generated` | CHECKLISTS/AUDIT/isa_planning.json | Audit Manager |
| TM-002 | ISA 315.11 Understanding the entity | Entity understanding section of planning checklist | Completed section with doc links; planning meeting notes attachment | CHECKLISTS/AUDIT/isa_planning.json | Audit Senior |
| TM-003 | ISA 320.10 Overall materiality | Materiality calculations embedded in planning checklist | Materiality narrative in checklist export; Activity log hash | CHECKLISTS/AUDIT/isa_planning.json | Engagement Partner |
| TM-004 | ISA 240.15 Fraud risk assessment | Fraud brainstorming checklist | Fraud checklist export; Activity log `fraud_review` note | CHECKLISTS/AUDIT/fraud_isa240.json | Audit Partner |
| TM-005 | ISA 550.14 Related party identification | Related parties checklist workflow | Related party checklist export; linked document IDs | CHECKLISTS/AUDIT/related_parties_isa550.json | Audit Senior |
| TM-006 | ISA 260.21 TCWG communications | Notification centre for governance updates | Notification record; Activity log `governance_notice` | src/pages/notifications.tsx | Engagement Partner |
| TM-007 | ISA 265.9 Deficiency communication | Task board for remediation tracking | Task flagged “Control deficiency”; Activity log reference | src/pages/tasks.tsx | Engagement Partner |
| TM-008 | ISA 330.7 Responses to assessed risks | Risk-to-task linkage in engagements workspace | Engagements view risk linkage screenshot; Activity log `risk_response` | src/pages/engagements.tsx | Audit Manager |
| TM-009 | ISA 230.8 Documentation completeness | Documents module with checksum logging | Document metadata (SHA-256) + Activity log `document.uploaded` | src/pages/documents.tsx | Quality Manager |
| TM-010 | ISA 520.5 Analytical procedures | Preliminary analytics tiles on engagements page | Analytics widget output; exported CSV from Documents | src/pages/engagements.tsx | Audit Data Lead |
| TM-011 | ISA 560.13 Subsequent events review | Period close checklist “Subsequent events” section | Checklist export; approval note referencing events log | CHECKLISTS/ACCOUNTING/period_close.json | Accounting Manager |
| TM-012 | ISA 570.20 Going concern evaluation | Period close checklist “Going concern” tasks | Checklist responses + linked memos in Documents | CHECKLISTS/ACCOUNTING/period_close.json | Engagement Partner |
| TM-013 | ISA 580.10 Written representations | Document request for management rep letter | Uploaded signed letter; Activity log `document.uploaded` | src/pages/documents.tsx | Engagement Partner |
| TM-014 | ISA 600.42 Component auditor coordination | Engagements module multi-entity tracker | Engagement record with component notes; Activity log `component_update` | src/pages/engagements.tsx | Audit Manager |
| TM-015 | ISA 706.09 Emphasis of matter | Memo generator w/ citation validation | Generated memo JSON with citations; Activity log `memo_generated` | lib/agents/runtime.ts | Technical Reviewer |
| TM-016 | ISQM 1 ¶21 Governance & leadership | ISQM framework policy pack | ISQM framework doc; QMS acknowledgement log | STANDARDS/QMS/isqm1_framework.md | QMS Lead |
| TM-017 | ISQM 1 ¶30 Resources | Roles & responsibilities register | Roles matrix; onboarding checklist evidence | STANDARDS/QMS/roles_and_responsibilities.md | Operations Director |
| TM-018 | ISQM 1 ¶34 Monitoring & remediation | Monitoring checklist workflow | Monitoring checklist completion export; Activity log `monitoring.review` | STANDARDS/QMS/monitoring_checklist.md | QMS Lead |
| TM-019 | ISQM 1 ¶28 Information & communication | Activity stream and telemetry dashboard | Activity feed export; Telemetry card screenshot | src/pages/activity.tsx | Ops Lead |
| TM-020 | ISQM 1 ¶46 Remedial actions | Task remediation loop with approvals | Approved remediation task; Approvals record ID | src/pages/tasks.tsx | QMS Lead |
| TM-021 | IESBA 120 Conceptual framework | Ethics & independence policy | Signed policy acknowledgement entry; policy document | STANDARDS/POLICY/ethics_and_independence.md | Ethics Officer |
| TM-022 | IESBA 400 Independence for audit engagements | Independence questionnaire in planning checklist | Checklist responses; independence confirmation file | CHECKLISTS/AUDIT/isa_planning.json | Ethics Officer |
| TM-023 | GDPR Article 32 Security | Data privacy & RLS controls | Policy doc; Supabase RLS policy snippet | STANDARDS/POLICY/data_privacy_and_RLS.md | Security Lead |
| TM-024 | Calculator dominance policy mandate | Calculator dominance guardrails | Policy doc; refusal example trace | STANDARDS/POLICY/calculator_dominance.md | Product Manager |
| TM-025 | Approval workflow controls | HITL approval policy + UI workflow | Approval queue record; policy doc | STANDARDS/POLICY/approval_workflow.md | Operations Director |
| TM-026 | IAS 1.10 Primary statements | IFRS & GAPSME disclosure checklist | Completed disclosure checklist export | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-027 | GAPSME 1.15 Cash flow exemption | Disclosure checklist Section A | Checklist export; FS draft in Documents | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-028 | Malta VAT Act Art. 73 filing accuracy | Malta VAT working paper | Completed VAT working paper with evidence attachments | CHECKLISTS/TAX/malta_vat_working_paper.md | Tax Lead |
| TM-029 | Malta VAT Act Art. 74 approval | Sensitive tool approval gate for filings | Approval queue record; Activity log `agent.approval_decision_recorded` | services/rag/index.ts | Tax Lead |
| TM-030 | Malta Income Tax Act Art. 55 | Malta CIT working paper | CIT working paper export; approval confirmation | CHECKLISTS/TAX/malta_cit_working_paper.md | Tax Lead |
| TM-031 | ATAD transfer pricing documentation | TP scope checklist | TP scope checklist export; Task created for TP file | CHECKLISTS/TAX/tp_scope_2024.json | Tax Lead |
| TM-032 | Citation enforcement for memos | Memo citation validator in agent runtime | Trace payload with `citationResult.ok`; memo JSON | lib/agents/runtime.ts | Technical Reviewer |
| TM-033 | Sensitive tool blocking | Approval queue escalation in agent execute | Agent trace with `status: 'BLOCKED'`; approval item | services/rag/index.ts | Ops Lead |
| TM-034 | Telemetry oversight | Telemetry dashboard cards | Telemetry API response; Settings → Telemetry screenshot | src/pages/settings.tsx | Ops Lead |
| TM-035 | Activity & audit trail integrity | Activity centre with hashing | Activity log export; Supabase table `activity_log` schema | src/pages/activity.tsx | Quality Manager |
| TM-036 | Document retention and signed URLs | Private Supabase storage with signed links | Storage bucket config; signed URL example | src/pages/documents.tsx | Security Lead |
| TM-037 | Period close reconciliations | Period close checklist reconciliations section | Checklist export; reconciliation doc IDs | CHECKLISTS/ACCOUNTING/period_close.json | Accounting Manager |
| TM-038 | Approval SLA monitoring | Telemetry approvals card + approvals page | Telemetry approvals metrics; Approvals page screenshot | src/pages/approvals.tsx | Operations Director |
| TM-039 | Redaction of sensitive outputs | Refusal rules in agent runtime | Refusal trace payload; policy reference | lib/agents/runtime.ts | Safety Officer |
| TM-040 | Standards change log | QMS monitoring checklist weekly review | Monitoring checklist output; meeting minutes | STANDARDS/QMS/monitoring_checklist.md | QMS Lead |
| TM-041 | IAS 1.117 Significant accounting policies | IFRS & GAPSME disclosure checklist | Checklist section export; supporting policy memo | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-042 | IAS 8.30 New standards issued | IFRS & GAPSME disclosure checklist | Checklist evidence referencing new standards narrative | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-043 | IFRS 7.8 Financial instrument categories | IFRS & GAPSME disclosure checklist | Completed financial instruments section with doc links | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-044 | IFRS 7.31 Risk disclosures | IFRS & GAPSME disclosure checklist | Risk disclosure narrative; Documents module attachment | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-045 | GAPSME 1.53 Financial instruments | IFRS & GAPSME disclosure checklist | GAPSME-specific checklist output | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-046 | IAS 12.81 Income taxes | IFRS & GAPSME disclosure checklist | Tax reconciliation worksheet; Documents evidence | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-047 | GAPSME 1.86 Tax disclosure rationale | IFRS & GAPSME disclosure checklist | GAPSME exemption memorandum stored in Documents | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-048 | IAS 7.44A Non-cash financing flows | IFRS & GAPSME disclosure checklist | Non-cash movement schedule attached to checklist | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-049 | IAS 24.18 Related party disclosures | IFRS & GAPSME disclosure checklist | Related party disclosure note; supporting schedule | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-050 | IFRS 5.30 Discontinued operations | IFRS & GAPSME disclosure checklist | Discontinued operations note in checklist export | CHECKLISTS/ACCOUNTING/ifrs_gap_sme_disclosures.json | Financial Reporting Lead |
| TM-051 | ISA 501.4 Inventory attendance & reconciliation | Period close checklist inventory procedures | Inventory roll-forward evidence; Documents module count sheets | CHECKLISTS/ACCOUNTING/period_close.json | Accounting Manager |
| TM-052 | Agent safety testing | Red-team scenario suite (15 cases) | `STANDARDS/SAFETY/red_team_cases.md`; execution logs | STANDARDS/SAFETY/red_team_cases.md | AI Safety Lead |
| TM-053 | Acceptance workflows | Documented E2E scripts (close, VAT/CIT, audit analytics, handoff) | `/ACCEPTANCE/*.md`; evidence attachments | ACCEPTANCE/ | Operations Director |
| TM-054 | Performance SLI tracking | Performance targets & runbook | `/PERF/targets.md`, `/PERF/runbook.md`; telemetry snapshots | PERF/ | Ops Lead |
| TM-055 | Learning governance | Learning pipeline/checklist/governance docs | `/LEARNING/*`; monitoring checklist references | LEARNING/ | AI Safety Lead |
| TM-056 | Go-live gate & rollback | Go-live checklist, rollback steps, comms templates | `/GOLIVE/*`; Activity log approval of gate | GOLIVE/ | Operations Director |
