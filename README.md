# Prisma Glow 15

![CI](https://github.com/OWNER/prisma-glow-15/actions/workflows/ci.yml/badge.svg)

A monorepo app scaffolded with [Lovable](https://lovable.dev) using Prisma, Supabase, and a Vite/React frontend.

---

## Quickstart

1. **Clone** the repository
2. **Install deps**: `npm ci`
3. **Env vars**:
   - Copy `.env.example` to `.env` (server defaults) and fill in values
   - (Optional for local FE): create `.env.local` from the example  
     ```sh
     cp .env.example .env.local
     ```
4. **Dev server**: `npm run dev`

> Requires Node.js & npm. We recommend installing via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

---

## Environment Setup

The project requires several API keys and service endpoints (e.g., Supabase URL/keys, database URLs, OpenAI key).
A template is provided in **[.env.example](./.env.example)**.  
For local development, you can also use `.env.local` (git-ignored) for frontend-only variables.

---

## Using Lovable

- Visit the Lovable project and start prompting:  
  https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8
- Changes made via Lovable are committed automatically to this repo.
- Prefer coding locally? Push changes from your IDE and Lovable will reflect them.

---

## Documentation

- [Security: Key Rotation](docs/SECURITY/KEY_ROTATION.md)

---
