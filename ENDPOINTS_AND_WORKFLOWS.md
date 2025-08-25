# Endpoints and Workflows

## Table of Contents
- [Web Endpoints](#web-endpoints)
- [n8n Workflows](#n8n-workflows)

## Web Endpoints
| Method | Path | Auth | Description | Input Schema | Output Schema | Rate Limit | Idempotency |
|---|---|---|---|---|---|---|---|
| POST | `/functions/v1/seed-data` | Supabase service key | Seeds initial org/users/clients/tasks | n/a | JSON `{success, message}` | none | none |

## n8n Workflows
_No n8n workflow exports were found in the repository. All workflows should be exported to version control with IDs, triggers, external calls, error handling, retry, and rate limit metadata._

