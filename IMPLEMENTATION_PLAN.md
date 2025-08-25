# Implementation Plan

## Table of Contents
- [P0 (1-2 Weeks)](#p0-1-2-weeks)
- [P1 (2-4 Weeks)](#p1-2-4-weeks)
- [P2+](#p2)

## P0 (1-2 Weeks)
| Task | Goal | Steps | Owner | Est. | Acceptance Criteria |
|---|---|---|---|---|---|
| Rotate exposed Supabase keys | Secure credentials | 1. Generate new keys<br>2. Store in n8n credentials/secret manager<br>3. Update deployments | DevOps | 1d | No hard-coded keys, .env not committed |
| Commit `.env.example` | Guide developers | 1. Add sanitized file<br>2. Document required vars | Dev | 0.5d | `.env.example` present & used |
| Add CI pipeline | Enforce lint/test/SCA | 1. Add GitHub workflow<br>2. Configure npm ci, lint, test, audit, gitleaks | DevOps | 2d | CI passes on PRs |
| Export n8n workflows | Version control flows | 1. Export each workflow JSON<br>2. Store under `n8n/` directory | Automation Eng | 2d | Workflows stored with IDs |
| Setup error handler workflow | Capture failures | 1. Create global error workflow in n8n<br>2. Notify Slack/email | Automation Eng | 2d | Errors trigger notifications |

## P1 (2-4 Weeks)
| Task | Goal | Steps | Owner | Est. | Acceptance Criteria |
|---|---|---|---|---|---|
| Implement webhook verification | Prevent spoofing | Add signature/token checks on all incoming webhooks | Dev | 3d | Rejected invalid signature tests |
| Add retry & idempotency | Improve reliability | Use n8n retry nodes, store idempotency keys in Sheets/DB | Dev | 5d | Replayed events processed once |
| Add unit and integration tests | Improve quality | Set up Vitest and mocks for OpenAI/Sheets | Dev | 5d | Coverage >30% & CI runs tests |
| Setup logging & monitoring | Observability | Use n8n error logs, Supabase logs, connect to dashboard | DevOps | 5d | Logs searchable, alerts configured |
| Define access control & RLS review | Least privilege | Audit policies, add missing RLS to tables | Security | 4d | Policies reviewed, tests pass |

## P2
| Task | Goal | Steps | Owner | Est. | Acceptance Criteria |
|---|---|---|---|---|---|
| Data retention & backup plan | Compliance | Schedule exports of Sheets/DB, define retention | Ops | 1w | Documented backup & restore |
| Cost monitoring & rate limiting | Performance | Track OpenAI/Sheets usage, enforce quotas | DevOps | 1w | Alerts on cost spikes |
| OAuth scope minimization | Security | Review Google/OpenAI scopes and prune | Security | 3d | Only required scopes present |
| Penetration testing & threat drills | Security | Engage testers, run incident response exercises | Security | 2w | Report with mitigations |

