## Summary
- [ ] Linked issue or ticket reference:
- [ ] Summary of changes:

## Prisma / Database checklist
- [ ] I ran `npm run prisma:format` inside `apps/web`.
- [ ] I ran `npm run prisma:migrate:dev -- --name <change>` against a local or staging database if the schema changed.
- [ ] I committed the generated files under `apps/web/prisma` (schema + migrations).
- [ ] I attached or pasted the `prisma migrate diff` preview for reviewers when schema changes are present.
- [ ] I confirmed the SQL is approved before production apply.

## Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

## Deployment
- [ ] Secrets required for this change are already stored in GitHub and the hosting platform (names only in code).
- [ ] I verified the preview/staging deployment or added context if verification is blocked.
