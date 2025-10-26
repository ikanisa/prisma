# Branch Protection & Required Checks

## GitHub Repository Settings (main branch)
- Enable **Require a pull request before merging** with at least one approving review.
- Enforce **Require review from Code Owners** (if `.github/CODEOWNERS` is maintained).
- Require **Conversation resolution** before merge.
- Enable **Require status checks to pass before merging** and select:
  - `Monorepo CI (root-app)`
  - `Monorepo CI (next-web)`
  - `pnpm lint` (if split out)
  - `pnpm test` suites (root + apps)
  - Preview deployment status from the hosting platform (production gate).
- Turn on **Require branch to be up to date before merging**.
- Disallow force pushes and branch deletions.

## Additional Recommendations
- Configure **Rulesets** to block merges when PR size or draft state fails policy.
- Enable **Secret scanning** and **Dependabot alerts**.
- Add a **CODEOWNERS** rule for `supabase/migrations/**` and `server/**` to ensure DBA/SRE review.
- Document the protections and attach screenshots when preparing release sign-off.
