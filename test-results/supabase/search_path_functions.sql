-- Auto-generated list of security-definer functions with explicit search paths
SET check_function_bodies = false;

-- From supabase/migrations/20250821115117_.sql
CREATE OR REPLACE FUNCTION public.is_member_of(org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
  );
$$;


CREATE OR REPLACE FUNCTION public.has_min_role(org UUID, min public.role_level)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_role AS (
    SELECT m.role
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT CASE
      WHEN (SELECT role FROM my_role) = 'SYSTEM_ADMIN' THEN true
      WHEN (SELECT role FROM my_role) = 'MANAGER' AND min IN ('EMPLOYEE', 'MANAGER') THEN true
      WHEN (SELECT role FROM my_role) = 'EMPLOYEE' AND min = 'EMPLOYEE' THEN true
      ELSE false 
    END),
    false
  );
$$;


CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;



-- From supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql
CREATE OR REPLACE FUNCTION public.is_member_of(org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(org UUID, min public.role_level)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_role AS (
    SELECT m.role
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT CASE
      WHEN (SELECT role FROM my_role) = 'SYSTEM_ADMIN' THEN true
      WHEN (SELECT role FROM my_role) = 'MANAGER' AND min IN ('EMPLOYEE', 'MANAGER') THEN true
      WHEN (SELECT role FROM my_role) = 'EMPLOYEE' AND min = 'EMPLOYEE' THEN true
      ELSE false 
    END),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;


-- From supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql
create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select auth.uid();
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = app, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.role_rank(role_in org_role)
returns int
language sql
immutable
set search_path = app, public
as $$
  select case role_in
    when 'admin' then 4
    when 'manager' then 3
    when 'staff' then 2
    when 'client' then 1
    else 0 end;
$$;

create or replace function app.is_org_member(p_org uuid, p_min_role org_role default 'staff')
returns boolean
language sql
stable
set search_path = app, public
as $$
  select exists (
    select 1 from members m
    where m.org_id = p_org
      and m.user_id = app.current_user_id()
      and app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

create or replace function app.is_org_admin(p_org uuid)
returns boolean
language sql
stable
set search_path = app, public
as $$
  select app.is_org_member(p_org, 'admin'::org_role);
$$;

create or replace function app.set_tenant(p_org uuid)
returns void
language plpgsql
set search_path = app, public
as $$
begin
  perform set_config('app.current_org', p_org::text, true);
end;
$$;

create or replace function app.create_api_key(p_org_slug text, p_name text, p_scope jsonb default '{}'::jsonb)
returns table(id uuid, key_plain text)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_org uuid;
  v_key bytea;
  v_key_plain text;
  v_hash text;
begin
  select id into v_org from organizations where slug = p_org_slug;
  if v_org is null then
    raise exception 'Unknown org slug %', p_org_slug;
  end if;

  -- Only admins may create keys
  if not app.is_org_admin(v_org) then
    raise exception 'Forbidden';
  end if;

  v_key := gen_random_bytes(32);
  v_key_plain := 'pk_' || encode(v_key, 'base64url');
  v_hash := encode(digest(v_key_plain, 'sha256'), 'hex');

  insert into api_keys(org_id, name, hashed_key, scope, created_by)
  values (v_org, p_name, v_hash, coalesce(p_scope, '{}'::jsonb), app.current_user_id())
  returning api_keys.id into id;

  key_plain := v_key_plain;
  return next;
end;
$$;



-- From supabase/migrations/20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql
create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = app, public
as $$
  select auth.uid();
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = app, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.role_rank(role_in org_role)
returns int
language sql
immutable
set search_path = app, public
as $$
  select case role_in
    when 'admin' then 4
    when 'manager' then 3
    when 'staff' then 2
    when 'client' then 1
    else 0
  end;
$$;

create or replace function app.is_org_member(p_org uuid, p_min_role org_role default 'staff')
returns boolean
language sql
stable
set search_path = app, public
as $$
  select exists (
    select 1 from members m
    where m.org_id = p_org
      and m.user_id = app.current_user_id()
      and app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

create or replace function app.is_org_admin(p_org uuid)
returns boolean
language sql
stable
set search_path = app, public
as $$
  select app.is_org_member(p_org, 'admin'::org_role);
$$;

create or replace function app.set_tenant(p_org uuid)
returns void
language plpgsql
set search_path = app, public
as $$
begin
  perform set_config('app.current_org', p_org::text, true);
end;
$$;

create or replace function app.create_api_key(p_org_slug text, p_name text, p_scope jsonb default '{}'::jsonb)
returns table(id uuid, key_plain text)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_org uuid;
  v_key bytea;
  v_key_plain text;
  v_hash text;
begin
  select id into v_org from organizations where slug = p_org_slug;
  if v_org is null then
    raise exception 'Unknown org slug %', p_org_slug;
  end if;
  if not app.is_org_admin(v_org) then
    raise exception 'Forbidden';
  end if;

  v_key := gen_random_bytes(32);
  v_key_plain := 'pk_' || encode(v_key, 'base64url');
  v_hash := encode(digest(v_key_plain, 'sha256'), 'hex');

  insert into api_keys(id, org_id, name, hashed_key, scope, created_by)
  values (gen_random_uuid(), v_org, p_name, v_hash, coalesce(p_scope, '{}'::jsonb), app.current_user_id())
  returning api_keys.id into id;

  key_plain := v_key_plain;
  return next;
end;
$$;


-- From supabase/migrations/20250830125648_f73e809f-f983-405f-9ed8-e17d84d48869.sql
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = app, public
AS $$
  SELECT CASE role_in
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 2
    WHEN 'client' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    WHERE m.org_id = p_org
      AND m.user_id = app.current_user_id()
      AND app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, 'admin'::org_role);
$$;


-- From supabase/migrations/20250830125703_5bf2f541-dcd5-4c5e-a182-de2328149a5f.sql
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = app, public
AS $$
  SELECT CASE role_in
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 2
    WHEN 'client' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    WHERE m.org_id = p_org
      AND m.user_id = app.current_user_id()
      AND app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, 'admin'::org_role);
$$;


-- From supabase/migrations/20250830125839_.sql
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT auth.uid();
$$;


CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = app, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = app, public
AS $$
  SELECT CASE role_in
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 2
    WHEN 'client' THEN 1
    ELSE 0
  END;
$$;


CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT public.has_min_role(
    p_org,
    CASE p_min_role
      WHEN 'admin' THEN 'SYSTEM_ADMIN'::public.role_level
      WHEN 'manager' THEN 'MANAGER'::public.role_level
      WHEN 'staff' THEN 'EMPLOYEE'::public.role_level
      WHEN 'client' THEN 'EMPLOYEE'::public.role_level
      ELSE 'EMPLOYEE'::public.role_level
    END
  );
$$;


CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT public.has_min_role(p_org, 'SYSTEM_ADMIN'::public.role_level);
$$;



-- From supabase/migrations/20250830125841_9195bd32-1de7-41d9-ac3c-d017d0dbe16a.sql
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = app, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = app, public
AS $$
  SELECT CASE role_in
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'staff' THEN 2
    WHEN 'client' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members m
    WHERE m.org_id = p_org
      AND m.user_id = app.current_user_id()
      AND app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, 'admin'::org_role);
$$;


-- From supabase/migrations/20250924112000_activity_log_enrichment.sql
CREATE OR REPLACE FUNCTION app.activity_log_enrich()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = app, public
AS $$
DECLARE
  catalog public.activity_event_catalog%ROWTYPE;
BEGIN
  SELECT * INTO catalog
  FROM public.activity_event_catalog
  WHERE action = NEW.action;

  IF FOUND THEN
    NEW.module := COALESCE(NEW.module, catalog.module);
    NEW.policy_pack := COALESCE(NEW.policy_pack, catalog.policy_pack);
    IF NEW.standard_refs IS NULL OR array_length(NEW.standard_refs, 1) = 0 THEN
      NEW.standard_refs := catalog.standard_refs;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



-- From supabase/migrations/20250924141001_tax_mt_nid_patent_box_rls.sql
CREATE OR REPLACE FUNCTION app.is_member_of(
  p_org uuid,
  p_min_role text DEFAULT 'staff'
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, p_min_role::org_role);
$$;



-- From supabase/migrations/20250924231000_rate_limits.sql
create or replace function public.enforce_rate_limit(
  p_org_id uuid,
  p_resource text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, request_count integer)
language plpgsql
set search_path = public
as $$
declare
  v_window_start timestamptz := date_trunc('second', now()) - make_interval(secs => mod(extract(epoch from now())::integer, p_window_seconds));
  v_count integer;
begin
  insert into public.rate_limits(org_id, resource, window_start, request_count)
  values (p_org_id, p_resource, v_window_start, 1)
  on conflict (org_id, resource, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return query select (v_count <= p_limit) as allowed, v_count;
end;
$$;



-- From supabase/migrations/20250925220000_app_is_member_of_wrapper.sql
CREATE OR REPLACE FUNCTION app.is_member_of(
  p_org uuid,
  p_min_role text DEFAULT 'staff'
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, p_min_role::org_role);
$$;


-- From supabase/migrations/20251115090000_notification_fanout.sql
create or replace function public.set_notification_dispatch_queue_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create or replace function public.set_user_notification_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

