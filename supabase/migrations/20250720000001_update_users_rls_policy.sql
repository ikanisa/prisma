-- Update Users RLS policy to unify read/write
alter table public.users enable row level security;

-- Remove old per-operation policies
drop policy if exists "Users can insert themselves" on public.users;
drop policy if exists "Users can select their own" on public.users;

-- Create unified policy for all operations
create policy "Allow read/write for user" on public.users
  for all using (auth.uid() = id);
