-- Tasks, Documents, Notifications core tables with RLS and indexes
set check_function_bodies = off;

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  display_name text not null,
  entity_type text not null default 'COMPANY' check (entity_type in ('COMPANY','TRUST','BRANCH','OTHER')),
  country text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);

create index if not exists entities_org_status_idx on public.entities (org_id, status);

alter table public.entities enable row level security;

drop policy if exists entities_select on public.entities;
create policy entities_select on public.entities
  for select using (public.is_member_of(org_id));

drop policy if exists entities_insert on public.entities;
create policy entities_insert on public.entities
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists entities_update on public.entities;
create policy entities_update on public.entities
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists entities_delete on public.entities;
create policy entities_delete on public.entities
  for delete using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'TODO' check (status in ('TODO','IN_PROGRESS','REVIEW','COMPLETED')),
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  due_date timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_org_status_due_idx on public.tasks (org_id, status, due_date);
create index if not exists tasks_assignee_status_idx on public.tasks (assigned_to, status);

alter table public.tasks enable row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (public.is_member_of(org_id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));


create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  org_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at desc);

alter table public.task_comments enable row level security;

drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments
  for select using (public.is_member_of(org_id));

drop policy if exists task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));


create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete set null,
  repo_folder text not null default '99_Other',
  name text not null,
  filename text not null,
  mime_type text,
  file_size bigint,
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  source text not null default 'USER' check (source in ('USER','API','EMAIL')),
  classification text not null default 'OTHER',
  ocr_status text not null default 'PENDING' check (ocr_status in ('PENDING','DONE','FAILED')),
  parse_status text not null default 'PENDING' check (parse_status in ('PENDING','DONE','FAILED')),
  checksum text,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents
  add column if not exists entity_id uuid references public.entities(id) on delete set null,
  add column if not exists repo_folder text not null default '99_Other',
  add column if not exists name text not null default 'Legacy Document',
  add column if not exists filename text not null default 'legacy.bin',
  add column if not exists mime_type text,
  add column if not exists file_size bigint default 0,
  add column if not exists storage_path text not null default concat('legacy/', gen_random_uuid()),
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists source text not null default 'USER' check (source in ('USER','API','EMAIL')),
  add column if not exists classification text not null default 'OTHER',
  add column if not exists ocr_status text not null default 'PENDING' check (ocr_status in ('PENDING','DONE','FAILED')),
  add column if not exists parse_status text not null default 'PENDING' check (parse_status in ('PENDING','DONE','FAILED')),
  add column if not exists deleted boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'mime'
  ) then
    execute 'update public.documents set mime_type = mime where mime_type is null and mime is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'bytes'
  ) then
    execute 'update public.documents set file_size = bytes where file_size = 0 and bytes is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'source_name'
  ) then
    execute 'update public.documents set name = coalesce(source_name, name), filename = coalesce(source_name, filename) where source_name is not null';
  end if;
end;
$$;

update public.documents
set storage_path = concat('legacy/', id::text)
where storage_path is null or storage_path = '';

create unique index if not exists documents_storage_path_key on public.documents (storage_path);

create index if not exists documents_org_repo_idx on public.documents (org_id, repo_folder, created_at desc) where deleted = false;
create index if not exists documents_entity_idx on public.documents (entity_id) where deleted = false;

alter table public.documents enable row level security;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (public.is_member_of(org_id) and deleted = false);

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update using (public.is_member_of(org_id) and (uploaded_by = auth.uid() or public.has_min_role(org_id, 'MANAGER'::public.role_level)));


create table if not exists public.document_index (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  tokens tsvector,
  extracted_meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_index_vector_idx on public.document_index using gin (tokens);

alter table public.document_index enable row level security;

drop policy if exists document_index_select on public.document_index;
create policy document_index_select on public.document_index
  for select using (public.is_member_of((select org_id from public.documents d where d.id = document_id)));


create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  org_id uuid not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_idx on public.task_attachments (task_id, created_at desc);

alter table public.task_attachments enable row level security;

drop policy if exists task_attachments_select on public.task_attachments;
create policy task_attachments_select on public.task_attachments
  for select using (public.is_member_of(org_id));

drop policy if exists task_attachments_insert on public.task_attachments;
create policy task_attachments_insert on public.task_attachments
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));


create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('TASK','DOC','APPROVAL','SYSTEM')),
  title text not null,
  body text,
  link text,
  urgent boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications (user_id, read, created_at desc);
create index if not exists notifications_org_idx on public.notifications (org_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid() and public.is_member_of(org_id));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid() and public.is_member_of(org_id));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (public.is_member_of(org_id));


create table if not exists public.agent_trace (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  document_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists agent_trace_org_idx on public.agent_trace (org_id, created_at desc);

alter table public.agent_trace enable row level security;

drop policy if exists agent_trace_select on public.agent_trace;
create policy agent_trace_select on public.agent_trace
  for select using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists agent_trace_insert on public.agent_trace;
create policy agent_trace_insert on public.agent_trace
  for insert with check (public.is_member_of(org_id));


create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  extractor_name text not null,
  extractor_version text not null default 'v1',
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','DONE','FAILED')),
  confidence numeric,
  fields jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_extractions_doc_idx on public.document_extractions (document_id, created_at desc);

alter table public.document_extractions enable row level security;

drop policy if exists document_extractions_select on public.document_extractions;
create policy document_extractions_select on public.document_extractions
  for select using (public.is_member_of((select org_id from public.documents d where d.id = document_id)));

drop policy if exists document_extractions_insert on public.document_extractions;
create policy document_extractions_insert on public.document_extractions
  for insert with check (public.is_member_of((select org_id from public.documents d where d.id = document_id)));

drop policy if exists document_extractions_update on public.document_extractions;
create policy document_extractions_update on public.document_extractions
  for update using (public.is_member_of((select org_id from public.documents d where d.id = document_id)));


create table if not exists public.onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  temp_entity_id text not null,
  industry text not null,
  country text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_checklists_org_idx on public.onboarding_checklists (org_id, status, created_at desc);

alter table public.onboarding_checklists enable row level security;

drop policy if exists onboarding_checklists_select on public.onboarding_checklists;
create policy onboarding_checklists_select on public.onboarding_checklists
  for select using (public.is_member_of(org_id));

drop policy if exists onboarding_checklists_insert on public.onboarding_checklists;
create policy onboarding_checklists_insert on public.onboarding_checklists
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists onboarding_checklists_update on public.onboarding_checklists;
create policy onboarding_checklists_update on public.onboarding_checklists
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));


create table if not exists public.onboarding_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.onboarding_checklists(id) on delete cascade,
  category text not null,
  label text not null,
  document_id uuid references public.documents(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','REVIEW','COMPLETE')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_items_checklist_idx on public.onboarding_checklist_items (checklist_id, status);

alter table public.onboarding_checklist_items enable row level security;

drop policy if exists onboarding_items_select on public.onboarding_checklist_items;
create policy onboarding_items_select on public.onboarding_checklist_items
  for select using (public.is_member_of((select org_id from public.onboarding_checklists c where c.id = checklist_id)));

drop policy if exists onboarding_items_insert on public.onboarding_checklist_items;
create policy onboarding_items_insert on public.onboarding_checklist_items
  for insert with check (public.is_member_of((select org_id from public.onboarding_checklists c where c.id = checklist_id)));

drop policy if exists onboarding_items_update on public.onboarding_checklist_items;
create policy onboarding_items_update on public.onboarding_checklist_items
  for update using (public.is_member_of((select org_id from public.onboarding_checklists c where c.id = checklist_id)));


create table if not exists public.company_profile_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  checklist_id uuid references public.onboarding_checklists(id) on delete set null,
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_profile_drafts_org_idx on public.company_profile_drafts (org_id, created_at desc);

alter table public.company_profile_drafts enable row level security;

drop policy if exists company_profile_drafts_select on public.company_profile_drafts;
create policy company_profile_drafts_select on public.company_profile_drafts
  for select using (public.is_member_of(org_id));

drop policy if exists company_profile_drafts_insert on public.company_profile_drafts;
create policy company_profile_drafts_insert on public.company_profile_drafts
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists company_profile_drafts_update on public.company_profile_drafts;
create policy company_profile_drafts_update on public.company_profile_drafts
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));


create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','DONE','FAILED')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists jobs_org_status_idx on public.jobs (org_id, status, scheduled_at);

alter table public.jobs enable row level security;

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));


create table if not exists public.job_schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  cron_expression text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_schedules_org_idx on public.job_schedules (org_id, active, kind);

alter table public.job_schedules enable row level security;

drop policy if exists job_schedules_select on public.job_schedules;
create policy job_schedules_select on public.job_schedules
  for select using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists job_schedules_insert on public.job_schedules;
create policy job_schedules_insert on public.job_schedules
  for insert with check (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));

drop policy if exists job_schedules_update on public.job_schedules;
create policy job_schedules_update on public.job_schedules
  for update using (public.is_member_of(org_id) and public.has_min_role(org_id, 'MANAGER'::public.role_level));


insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
