# Row-Level Security Policies

The project enables PostgreSQL row-level security (RLS) to ensure that users
only access data they own or are permitted to view.

## Users table

- RLS is enabled on `public.users`.
- `users_select_self` allows authenticated users to read only their own row.
- `users_update_self` allows users to update their own profile fields.
- `users_admin_manage` grants system administrators full access for
  operational tasks.

These policies follow the principle of least privilege so that a compromise of
one account does not expose data belonging to others. Administrative access is
restricted to records where the acting user is flagged as `is_system_admin`.
