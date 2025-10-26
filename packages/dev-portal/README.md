# Prisma Dev Portal

This package contains the Backstage configuration that powers the Prisma developer portal.
It keeps the software catalog alongside the application source so service owners can update
ownership metadata together with the code they ship.

## Contents

- `app-config.yaml` – baseline Backstage application configuration that can be consumed by a
  Backstage instance or a compatible developer portal. The catalog is sourced from the
  repository itself and exposes the Prisma platform system and its services.
- `catalog-info.yaml` – canonical catalog descriptor for services that live in this
  repository. This file defines ownership, lifecycle status, API surfaces and
  cross-service dependencies. It should be kept up to date whenever a new service is
  introduced or a team assumes ownership of an existing component.

## Local usage

To evaluate the configuration locally, point an existing Backstage deployment at the
`catalog-info.yaml` file:

```bash
# from the repository root
npx @backstage/cli app:config --config packages/dev-portal/app-config.yaml
```

Backstage (and similar tools) will automatically ingest the service metadata and make it
available in the developer portal once the configuration is published.

## Contribution workflow

1. Update `catalog-info.yaml` alongside any service changes (for example when adding a new
   workspace under `services/`).
2. Run `pnpm catalog:check` to ensure ownership metadata is present for every service.
3. Commit both the code changes and the catalog update.

The CI workflow enforces these rules, so pull requests that add new services without
ownership metadata will be rejected.
