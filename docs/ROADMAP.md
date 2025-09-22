# Project Refactor Roadmap

This document outlines the plan to refactor the codebase into a clean, production-ready Supabase Edge Functions backend using TypeScript and the OpenAI Assistant SDK.

## Phase 1: Project Structure & Scaffolding

- **Isolate Frontend**: Move existing frontend code into `/frontend` (for future use).
- **Backend Root**: Create `/server` folder for all backend code.
  - `/server/functions`: Supabase Edge Functions (WhatsApp webhook, message handler, etc.)
  - `/server/lib`: Core business logic and agent implementation (`agent.ts`, `tools.ts`)
  - `/server/utils`: Shared utilities (logging, error handling, environment loader)
  - `/server/db`: Database migrations, seeds, and SQL definitions
  - `/server/.env.example`: Example environment variables for local development
  - `/server/tsconfig.json`: TypeScript configuration for backend

## Phase 2: Configuration & Environment

- Add secure environment variable management via `.env` and `.env.example`.
- Update `supabase/config.toml` paths if needed to point to `/server/functions`.

## Phase 3: Database Schema & RLS Policies

- Define PostgreSQL schema for:
  - `users`
  - `incoming_messages`
  - `outgoing_messages`
  - `threads`
  - `agent_memory`
- Implement RLS policies and triggers for row-level security.
- Add vector columns and indexes for retrieval-augmented memory.

## Phase 4: Agent Implementation

- Implement `lib/agent.ts` using OpenAI Assistant SDK (GPT-4o).
- Define function-calling schema and tools integration.

## Phase 5: WhatsApp Webhook Handler

- Create `/server/functions/whatsapp-webhook.ts` to receive & verify WhatsApp callbacks.
- Parse incoming messages, delegate to agent, and push responses via WhatsApp API.

## Phase 6: Testing & Documentation

- Write unit and integration tests for agent and webhook.
- Document local development workflow and CLI commands.
- Finalize README with setup and deployment instructions.
