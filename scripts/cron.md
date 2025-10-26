# Scheduled workflow notes

The legacy CI schedule (`Monorepo CI` every day at 02:30 UTC) now runs entirely in GitHub Actions without depending on external preview deploys. When the cron trigger is disabled or when you need to reproduce it locally:

1. Run the same gates manually with pnpm:
   ```bash
   pnpm install --frozen-lockfile
   pnpm run typecheck
   pnpm run lint
   pnpm run build
   pnpm run coverage
   ```
2. Execute Prisma checks and migrations from the Next.js workspace:
   ```bash
   pnpm --filter web run prisma:generate
   pnpm --filter web run prisma:migrate:deploy
   ```
3. Kick off Playwright smoke tests or policy checks as required:
   ```bash
   pnpm run test:playwright
   psql "$DATABASE_URL" -f scripts/test_policies.sql
   ```

For automation outside GitHub Actions, schedule these commands with `cron`/`launchd` on a build runner or reuse the Docker Compose deployment workflow with a CI orchestrator such as Jenkins or GitHub CLI (`gh workflow run ci.yml`).
