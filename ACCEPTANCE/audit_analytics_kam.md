# Acceptance Script – Audit Analytics & KAM Preparation

## Objective
Validate analytics-driven audit workflow from ratios to key audit matters (KAM) seeding, ensuring traceability to tasks and findings.

## Preconditions
- Audit engagement configured with risk register enabled.
- Access to audit analytics module (ratios, journal entries, risk linkages).
- PBC task templates available.

## Steps
1. **Run analytic ratios**
   - Use audit agent or UI analytics dashboard to compute liquidity/profitability ratios.
   - Confirm `agent_traces` capture ratio outputs (store trace IDs).
2. **Identify unusual journal entries**
   - Execute JE analytics tool; export flagged entries to Documents.
   - Record docId and Activity log reference.
3. **Link findings to risks**
   - In engagements page, attach analytics findings to existing risks (or create new risk with reference `RISK-*`).
   - Ensure risk detail references analytics docId.
4. **Create PBC tasks**
   - From risk, generate PBC tasks assigned to client (task IDs `TASK-*`).
   - Capture task creation logs and due dates.
5. **Seed Key Audit Matters**
   - Invoke KAM seeding via agent or UI; verify KAM note stub with link to risk and analytics evidence.
   - Store KAM note ID and memo location.
6. **Review traceability**
   - Cross-check Standards matrix (rows TM-008, TM-010, TM-015) for evidence alignment.

## Expected Outcomes
- Analytics documents stored with hashes.
- Risks linked to analytics and tasks with IDs logged.
- KAM notes created referencing risk IDs and analytics evidence.
- Activity Log includes analytics runs, task creation, KAM seeds.

## Evidence to Capture
- Trace IDs for analytics outputs.
- Document IDs for JE exports.
- Risk IDs, Task IDs, KAM IDs.
- Screenshots of risk linkage and KAM note.

