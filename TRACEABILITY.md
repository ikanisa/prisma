# Traceability Matrix

| Requirement | Implementation | Verification |
| --- | --- | --- |
| ITGC control tests must call Sampling C1 before persisting results and store `samplePlanRef` metadata. | `apps/web/app/api/controls/test/run/route.ts` invokes the Sampling C1 client, persists `samplePlanRef`, `samplePlanUrl`, and attribute samples via the test run store. | Covered by `apps/web/app/api/controls/test/run/__tests__/route.test.ts` which asserts that POST requests persist sampling payloads and retries update the same run identifier. |
| The UI must surface Sampling C1 status, expose sample plan links, and support retries for failed runs. | `apps/web/app/audit/controls/page.tsx` renders status badges, plan links, and retry controls bound to the API. | Exercised indirectly through integration tests that validate retry flows and via manual verification instructions captured in `STANDARDS/POLICY/audit_controls_itgc.md`. |
| Sampling client should deliver deterministic fixtures in local/demo environments and handle live service errors gracefully. | `apps/web/lib/audit/sampling-client.ts` detects environment mode, produces deterministic fixtures, and normalizes live service responses with error handling. | `apps/web/lib/audit/__tests__/sampling-client.test.ts` validates deterministic fixture output, live-mode delegation, and error propagation. |
