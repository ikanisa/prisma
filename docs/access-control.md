# Access Control and PII Handling

## Role-Based Access
- Supabase row level security policies enforce tenant and role checks.
- Services should validate the `role` claim from JWTs before performing privileged actions.

## GDPR / PII Guidelines
- Collect only the minimum personal data required for operations.
- Log data is scrubbed of PII and retained for 30 days.
- Users may request export or deletion of their data at any time via support.
