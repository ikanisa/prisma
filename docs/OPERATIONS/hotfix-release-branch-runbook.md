# Hotfix Release Branch Runbook

## Purpose
Use this runbook when a production regression requires an expedited fix outside of the normal release cadence. It outlines how to establish a temporary release branch, enforce observability safeguards, coordinate user acceptance testing (UAT), and retire legacy branches once stability is confirmed.

### Automation quick start

- `pnpm hotfix:manage init --branch release/hotfix-<YYYYMMDD>` – create and push the temporary branch while capturing status to `docs/OPERATIONS/hotfix-status.json`.
- `pnpm hotfix:manage tag --name <identifier>` – record milestone tags for rollback.
- `pnpm hotfix:manage observability --sentry done --otel done` – snapshot monitoring guardrail configuration once thresholds are tuned.
- `pnpm hotfix:manage uat --scheduled <ISO8601> --feedback pending` – log stakeholder UAT scheduling and follow-up state.
- `pnpm hotfix:manage complete --merged done --legacy done --docs done` – finalise the workflow when the branch is decommissioned.
- `pnpm hotfix:status` – regenerate `docs/OPERATIONS/hotfix-outstanding-items.md` with the latest outstanding task report.

## 1. Establish temporary hotfix branch and rollback milestones
1. Start from the production tag (e.g., `main` or the latest release tag).
2. Create a temporary branch named `release/hotfix-<YYYYMMDD>` and push it to the origin (run `pnpm hotfix:manage init --branch release/hotfix-<YYYYMMDD>` to automate git actions and status capture).
3. Apply `milestone/*` tags to noteworthy commits (e.g., pre-fix, post-fix) so rollback targets are explicit (`pnpm hotfix:manage tag --name <identifier>` will create and push annotated tags and log them to the tracker).
4. Document branch/tag metadata in the internal wiki change calendar.
5. Communicate availability of the branch to engineering and QA channels.

## 2. Configure observability guardrails
1. Ensure the Sentry project and OpenTelemetry collector for the affected service are linked to the hotfix deployment environment.
2. Set alert thresholds:
   - **Sentry**: error rate threshold at +25% above trailing seven-day baseline with a 5-minute evaluation window.
   - **OpenTelemetry**: latency p95 threshold at +20% above trailing seven-day baseline; CPU/memory alerts at +30%.
3. Subscribe engineering on-call and product owners to the alert channels (Slack/Email/PagerDuty).
4. Annotate dashboards with the hotfix branch name and deployment timestamp for quick correlation.
5. Update the tracker by running `pnpm hotfix:manage observability --sentry done --otel done --notes "<context>"` once guardrails are tuned.

## 3. Schedule and run stakeholder UAT
1. Within four hours of deploying the hotfix to staging, schedule UAT sessions with impacted stakeholders.
2. Provide a consolidated test checklist highlighting defect areas and regression sweeps.
3. Collect feedback in the shared UAT tracker; triage issues by severity and attach them to the hotfix milestone board.
4. Prioritize follow-up fixes based on business impact and communicate timelines back to stakeholders.
5. Run `pnpm hotfix:manage uat --scheduled <ISO8601> --feedback <done|pending>` after each review cycle to keep the automation state current.

## 4. Decommission legacy branches and finalize documentation
1. After production stability holds for 48 hours (no alerts breaching thresholds), merge the hotfix branch back to `main` and close associated pull requests.
2. Delete the temporary `release/hotfix-*` branch locally and remotely.
3. Retire superseded legacy branches that are now obsolete, logging removals in the internal branch inventory.
4. Update the `CHANGELOG.md` and internal wiki with a summary of fixes, alert thresholds, and UAT outcomes.
5. Archive related runbook and monitoring artifacts to the operations knowledge base.
6. Capture completion by executing `pnpm hotfix:manage complete --merged done --legacy done --docs done` so the outstanding report closes cleanly.

## 5. Checklist
- [ ] Temporary branch created and pushed.
- [ ] Milestone tags recorded with rollback references.
- [ ] Sentry and OpenTelemetry alerts tuned.
- [ ] UAT feedback logged and prioritized.
- [ ] Legacy branches decommissioned.
- [ ] Documentation (CHANGELOG, wiki, dashboards) updated.
- [ ] `pnpm hotfix:status` run to refresh `docs/OPERATIONS/hotfix-outstanding-items.md`.
