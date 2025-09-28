-- Table to store webhook event hashes for idempotency
create table if not exists webhook_events (
  id serial primary key,
  hash text unique not null,
  created_at timestamptz not null default now()
);
