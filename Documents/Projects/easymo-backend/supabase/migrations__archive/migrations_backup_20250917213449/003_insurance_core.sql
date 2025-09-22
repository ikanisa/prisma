-- ========== INSURANCE CORE (idempotent) ==========

-- 1) app_config extras for insurance + OCR controls
alter table app_config
  add column if not exists insurance_admin_numbers text,   -- comma-separated E.164 numbers
  add column if not exists ocr_enabled boolean default true,
  add column if not exists ocr_timeout_ms integer default 30000;

-- 2) Leads table
create table if not exists insurance_leads (
  id            bigserial primary key,
  user_id       uuid references profiles(user_id) on delete set null,
  whatsapp_e164 text not null,
  status        text not null default 'new',  -- new | processing | done | failed
  extracted     jsonb,                        -- normalized fields from OCR
  raw_ocr       jsonb,                        -- raw OCR responses
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- simple touch trigger for updated_at
create or replace function _touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_touch_insurance_leads on insurance_leads;
create trigger trg_touch_insurance_leads
before update on insurance_leads
for each row execute function _touch_updated_at();

-- 3) Media table (each file user sent)
create table if not exists insurance_media (
  id           bigserial primary key,
  lead_id      bigint references insurance_leads(id) on delete cascade,
  wa_media_id  text,             -- WhatsApp media id
  storage_path text not null,    -- path in Storage (bucket: insurance)
  mime_type    text,
  created_at   timestamptz default now()
);

-- 4) Helpful indexes
create index if not exists idx_insurance_leads_created on insurance_leads (created_at);
create index if not exists idx_insurance_media_lead    on insurance_media (lead_id);

-- 5) RLS posture: lock both tables (Edge Functions use service role)
alter table insurance_leads enable row level security;
alter table insurance_media enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'insurance_leads'
  ) then
    create policy no_public_insurance_leads on insurance_leads for all using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'insurance_media'
  ) then
    create policy no_public_insurance_media on insurance_media for all using (false);
  end if;
end$$;

