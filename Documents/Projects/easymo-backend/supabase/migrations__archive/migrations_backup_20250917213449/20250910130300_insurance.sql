create table if not exists public.insurance_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  whatsapp_e164 text not null,
  status text not null default 'processing',
  extracted jsonb,
  raw_ocr jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.insurance_media (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.insurance_leads(id) on delete cascade,
  wa_media_id text,
  storage_path text not null,
  mime_type text,
  created_at timestamptz default now()
);
