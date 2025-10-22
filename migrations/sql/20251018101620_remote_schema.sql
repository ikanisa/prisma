set check_function_bodies = off;

CREATE OR REPLACE FUNCTION app.activity_log_enrich()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION app.create_api_key(p_org_slug text, p_name text, p_scope jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, key_plain text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_org uuid; v_key bytea; v_key_plain text; v_hash text;
begin
  select id into v_org from organizations where slug = p_org_slug;
  if v_org is null then raise exception 'Unknown org slug %', p_org_slug; end if;
  if not app.is_org_admin(v_org) then raise exception 'Forbidden'; end if;

  v_key := gen_random_bytes(32);
  v_key_plain := 'pk_' || encode(v_key, 'base64url');
  v_hash := encode(digest(v_key_plain, 'sha256'), 'hex');

  insert into api_keys(id, org_id, name, hashed_key, scope, created_by)
  values (gen_random_uuid(), v_org, p_name, v_hash, coalesce(p_scope, '{}'::jsonb), app.current_user_id())
  returning api_keys.id into id;

  key_plain := v_key_plain; return next;
end; $function$
;

CREATE OR REPLACE FUNCTION app.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$ SELECT auth.uid(); $function$
;

CREATE OR REPLACE FUNCTION app.is_member_of(p_org uuid, p_min_role text DEFAULT 'staff'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT app.is_org_member(p_org, p_min_role::org_role);
$function$
;

CREATE OR REPLACE FUNCTION app.is_org_admin(p_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ 
  SELECT app.is_org_member(p_org, 'admin'::org_role); 
$function$
;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org uuid, p_min_role org_role DEFAULT 'staff'::org_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM members m
    WHERE m.org_id = p_org
      AND m.user_id = app.current_user_id()
      AND app.role_rank(m.role) >= app.role_rank(p_min_role)
  );
$function$
;

CREATE OR REPLACE FUNCTION app.role_rank(role_in org_role)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE role_in 
    WHEN 'admin' THEN 4 
    WHEN 'manager' THEN 3 
    WHEN 'staff' THEN 2 
    WHEN 'client' THEN 1 
    ELSE 0 
  END;
$function$
;

CREATE OR REPLACE FUNCTION app.set_tenant(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ begin perform set_config('app.current_org', p_org::text, true); end; $function$
;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$function$
;


create extension if not exists "btree_gin" with schema "extensions";

create extension if not exists "pg_trgm" with schema "extensions";

create extension if not exists "vector" with schema "extensions";


drop policy "users_self" on "public"."users";

drop policy "cfc_inclusions_rw" on "public"."cfc_inclusions";

drop policy "fiscal_unity_rw" on "public"."fiscal_unity_computations";

drop policy "interest_limitation_rw" on "public"."interest_limitation_computations";

drop policy "memberships_read" on "public"."memberships";

drop policy "nid_computations_write" on "public"."nid_computations";

drop policy "patent_box_computations_write" on "public"."patent_box_computations";

drop policy "vat_filings_rw" on "public"."vat_filings";

revoke delete on table "public"."acceptance_decisions" from "anon";

revoke insert on table "public"."acceptance_decisions" from "anon";

revoke references on table "public"."acceptance_decisions" from "anon";

revoke select on table "public"."acceptance_decisions" from "anon";

revoke trigger on table "public"."acceptance_decisions" from "anon";

revoke truncate on table "public"."acceptance_decisions" from "anon";

revoke update on table "public"."acceptance_decisions" from "anon";

revoke delete on table "public"."acceptance_decisions" from "authenticated";

revoke insert on table "public"."acceptance_decisions" from "authenticated";

revoke references on table "public"."acceptance_decisions" from "authenticated";

revoke select on table "public"."acceptance_decisions" from "authenticated";

revoke trigger on table "public"."acceptance_decisions" from "authenticated";

revoke truncate on table "public"."acceptance_decisions" from "authenticated";

revoke update on table "public"."acceptance_decisions" from "authenticated";

revoke delete on table "public"."acceptance_decisions" from "service_role";

revoke insert on table "public"."acceptance_decisions" from "service_role";

revoke references on table "public"."acceptance_decisions" from "service_role";

revoke select on table "public"."acceptance_decisions" from "service_role";

revoke trigger on table "public"."acceptance_decisions" from "service_role";

revoke truncate on table "public"."acceptance_decisions" from "service_role";

revoke update on table "public"."acceptance_decisions" from "service_role";

revoke delete on table "public"."activity_event_catalog" from "anon";

revoke insert on table "public"."activity_event_catalog" from "anon";

revoke references on table "public"."activity_event_catalog" from "anon";

revoke select on table "public"."activity_event_catalog" from "anon";

revoke trigger on table "public"."activity_event_catalog" from "anon";

revoke truncate on table "public"."activity_event_catalog" from "anon";

revoke update on table "public"."activity_event_catalog" from "anon";

revoke delete on table "public"."activity_event_catalog" from "authenticated";

revoke insert on table "public"."activity_event_catalog" from "authenticated";

revoke references on table "public"."activity_event_catalog" from "authenticated";

revoke select on table "public"."activity_event_catalog" from "authenticated";

revoke trigger on table "public"."activity_event_catalog" from "authenticated";

revoke truncate on table "public"."activity_event_catalog" from "authenticated";

revoke update on table "public"."activity_event_catalog" from "authenticated";

revoke delete on table "public"."activity_event_catalog" from "service_role";

revoke insert on table "public"."activity_event_catalog" from "service_role";

revoke references on table "public"."activity_event_catalog" from "service_role";

revoke select on table "public"."activity_event_catalog" from "service_role";

revoke trigger on table "public"."activity_event_catalog" from "service_role";

revoke truncate on table "public"."activity_event_catalog" from "service_role";

revoke update on table "public"."activity_event_catalog" from "service_role";

revoke delete on table "public"."ada_exceptions" from "anon";

revoke insert on table "public"."ada_exceptions" from "anon";

revoke references on table "public"."ada_exceptions" from "anon";

revoke select on table "public"."ada_exceptions" from "anon";

revoke trigger on table "public"."ada_exceptions" from "anon";

revoke truncate on table "public"."ada_exceptions" from "anon";

revoke update on table "public"."ada_exceptions" from "anon";

revoke delete on table "public"."ada_exceptions" from "authenticated";

revoke insert on table "public"."ada_exceptions" from "authenticated";

revoke references on table "public"."ada_exceptions" from "authenticated";

revoke select on table "public"."ada_exceptions" from "authenticated";

revoke trigger on table "public"."ada_exceptions" from "authenticated";

revoke truncate on table "public"."ada_exceptions" from "authenticated";

revoke update on table "public"."ada_exceptions" from "authenticated";

revoke delete on table "public"."ada_exceptions" from "service_role";

revoke insert on table "public"."ada_exceptions" from "service_role";

revoke references on table "public"."ada_exceptions" from "service_role";

revoke select on table "public"."ada_exceptions" from "service_role";

revoke trigger on table "public"."ada_exceptions" from "service_role";

revoke truncate on table "public"."ada_exceptions" from "service_role";

revoke update on table "public"."ada_exceptions" from "service_role";

revoke delete on table "public"."ada_runs" from "anon";

revoke insert on table "public"."ada_runs" from "anon";

revoke references on table "public"."ada_runs" from "anon";

revoke select on table "public"."ada_runs" from "anon";

revoke trigger on table "public"."ada_runs" from "anon";

revoke truncate on table "public"."ada_runs" from "anon";

revoke update on table "public"."ada_runs" from "anon";

revoke delete on table "public"."ada_runs" from "authenticated";

revoke insert on table "public"."ada_runs" from "authenticated";

revoke references on table "public"."ada_runs" from "authenticated";

revoke select on table "public"."ada_runs" from "authenticated";

revoke trigger on table "public"."ada_runs" from "authenticated";

revoke truncate on table "public"."ada_runs" from "authenticated";

revoke update on table "public"."ada_runs" from "authenticated";

revoke delete on table "public"."ada_runs" from "service_role";

revoke insert on table "public"."ada_runs" from "service_role";

revoke references on table "public"."ada_runs" from "service_role";

revoke select on table "public"."ada_runs" from "service_role";

revoke trigger on table "public"."ada_runs" from "service_role";

revoke truncate on table "public"."ada_runs" from "service_role";

revoke update on table "public"."ada_runs" from "service_role";

revoke delete on table "public"."agent_actions" from "anon";

revoke insert on table "public"."agent_actions" from "anon";

revoke references on table "public"."agent_actions" from "anon";

revoke select on table "public"."agent_actions" from "anon";

revoke trigger on table "public"."agent_actions" from "anon";

revoke truncate on table "public"."agent_actions" from "anon";

revoke update on table "public"."agent_actions" from "anon";

revoke delete on table "public"."agent_actions" from "authenticated";

revoke insert on table "public"."agent_actions" from "authenticated";

revoke references on table "public"."agent_actions" from "authenticated";

revoke select on table "public"."agent_actions" from "authenticated";

revoke trigger on table "public"."agent_actions" from "authenticated";

revoke truncate on table "public"."agent_actions" from "authenticated";

revoke update on table "public"."agent_actions" from "authenticated";

revoke delete on table "public"."agent_actions" from "service_role";

revoke insert on table "public"."agent_actions" from "service_role";

revoke references on table "public"."agent_actions" from "service_role";

revoke select on table "public"."agent_actions" from "service_role";

revoke trigger on table "public"."agent_actions" from "service_role";

revoke truncate on table "public"."agent_actions" from "service_role";

revoke update on table "public"."agent_actions" from "service_role";

revoke delete on table "public"."agent_learning_jobs" from "anon";

revoke insert on table "public"."agent_learning_jobs" from "anon";

revoke references on table "public"."agent_learning_jobs" from "anon";

revoke select on table "public"."agent_learning_jobs" from "anon";

revoke trigger on table "public"."agent_learning_jobs" from "anon";

revoke truncate on table "public"."agent_learning_jobs" from "anon";

revoke update on table "public"."agent_learning_jobs" from "anon";

revoke delete on table "public"."agent_learning_jobs" from "authenticated";

revoke insert on table "public"."agent_learning_jobs" from "authenticated";

revoke references on table "public"."agent_learning_jobs" from "authenticated";

revoke select on table "public"."agent_learning_jobs" from "authenticated";

revoke trigger on table "public"."agent_learning_jobs" from "authenticated";

revoke truncate on table "public"."agent_learning_jobs" from "authenticated";

revoke update on table "public"."agent_learning_jobs" from "authenticated";

revoke delete on table "public"."agent_learning_jobs" from "service_role";

revoke insert on table "public"."agent_learning_jobs" from "service_role";

revoke references on table "public"."agent_learning_jobs" from "service_role";

revoke select on table "public"."agent_learning_jobs" from "service_role";

revoke trigger on table "public"."agent_learning_jobs" from "service_role";

revoke truncate on table "public"."agent_learning_jobs" from "service_role";

revoke update on table "public"."agent_learning_jobs" from "service_role";

revoke delete on table "public"."agent_manifests" from "anon";

revoke insert on table "public"."agent_manifests" from "anon";

revoke references on table "public"."agent_manifests" from "anon";

revoke select on table "public"."agent_manifests" from "anon";

revoke trigger on table "public"."agent_manifests" from "anon";

revoke truncate on table "public"."agent_manifests" from "anon";

revoke update on table "public"."agent_manifests" from "anon";

revoke delete on table "public"."agent_manifests" from "authenticated";

revoke insert on table "public"."agent_manifests" from "authenticated";

revoke references on table "public"."agent_manifests" from "authenticated";

revoke select on table "public"."agent_manifests" from "authenticated";

revoke trigger on table "public"."agent_manifests" from "authenticated";

revoke truncate on table "public"."agent_manifests" from "authenticated";

revoke update on table "public"."agent_manifests" from "authenticated";

revoke delete on table "public"."agent_manifests" from "service_role";

revoke insert on table "public"."agent_manifests" from "service_role";

revoke references on table "public"."agent_manifests" from "service_role";

revoke select on table "public"."agent_manifests" from "service_role";

revoke trigger on table "public"."agent_manifests" from "service_role";

revoke truncate on table "public"."agent_manifests" from "service_role";

revoke update on table "public"."agent_manifests" from "service_role";

revoke delete on table "public"."agent_mcp_tools" from "anon";

revoke insert on table "public"."agent_mcp_tools" from "anon";

revoke references on table "public"."agent_mcp_tools" from "anon";

revoke select on table "public"."agent_mcp_tools" from "anon";

revoke trigger on table "public"."agent_mcp_tools" from "anon";

revoke truncate on table "public"."agent_mcp_tools" from "anon";

revoke update on table "public"."agent_mcp_tools" from "anon";

revoke delete on table "public"."agent_mcp_tools" from "authenticated";

revoke insert on table "public"."agent_mcp_tools" from "authenticated";

revoke references on table "public"."agent_mcp_tools" from "authenticated";

revoke select on table "public"."agent_mcp_tools" from "authenticated";

revoke trigger on table "public"."agent_mcp_tools" from "authenticated";

revoke truncate on table "public"."agent_mcp_tools" from "authenticated";

revoke update on table "public"."agent_mcp_tools" from "authenticated";

revoke delete on table "public"."agent_mcp_tools" from "service_role";

revoke insert on table "public"."agent_mcp_tools" from "service_role";

revoke references on table "public"."agent_mcp_tools" from "service_role";

revoke select on table "public"."agent_mcp_tools" from "service_role";

revoke trigger on table "public"."agent_mcp_tools" from "service_role";

revoke truncate on table "public"."agent_mcp_tools" from "service_role";

revoke update on table "public"."agent_mcp_tools" from "service_role";

revoke delete on table "public"."agent_orchestration_sessions" from "anon";

revoke insert on table "public"."agent_orchestration_sessions" from "anon";

revoke references on table "public"."agent_orchestration_sessions" from "anon";

revoke select on table "public"."agent_orchestration_sessions" from "anon";

revoke trigger on table "public"."agent_orchestration_sessions" from "anon";

revoke truncate on table "public"."agent_orchestration_sessions" from "anon";

revoke update on table "public"."agent_orchestration_sessions" from "anon";

revoke delete on table "public"."agent_orchestration_sessions" from "authenticated";

revoke insert on table "public"."agent_orchestration_sessions" from "authenticated";

revoke references on table "public"."agent_orchestration_sessions" from "authenticated";

revoke select on table "public"."agent_orchestration_sessions" from "authenticated";

revoke trigger on table "public"."agent_orchestration_sessions" from "authenticated";

revoke truncate on table "public"."agent_orchestration_sessions" from "authenticated";

revoke update on table "public"."agent_orchestration_sessions" from "authenticated";

revoke delete on table "public"."agent_orchestration_sessions" from "service_role";

revoke insert on table "public"."agent_orchestration_sessions" from "service_role";

revoke references on table "public"."agent_orchestration_sessions" from "service_role";

revoke select on table "public"."agent_orchestration_sessions" from "service_role";

revoke trigger on table "public"."agent_orchestration_sessions" from "service_role";

revoke truncate on table "public"."agent_orchestration_sessions" from "service_role";

revoke update on table "public"."agent_orchestration_sessions" from "service_role";

revoke delete on table "public"."agent_orchestration_tasks" from "anon";

revoke insert on table "public"."agent_orchestration_tasks" from "anon";

revoke references on table "public"."agent_orchestration_tasks" from "anon";

revoke select on table "public"."agent_orchestration_tasks" from "anon";

revoke trigger on table "public"."agent_orchestration_tasks" from "anon";

revoke truncate on table "public"."agent_orchestration_tasks" from "anon";

revoke update on table "public"."agent_orchestration_tasks" from "anon";

revoke delete on table "public"."agent_orchestration_tasks" from "authenticated";

revoke insert on table "public"."agent_orchestration_tasks" from "authenticated";

revoke references on table "public"."agent_orchestration_tasks" from "authenticated";

revoke select on table "public"."agent_orchestration_tasks" from "authenticated";

revoke trigger on table "public"."agent_orchestration_tasks" from "authenticated";

revoke truncate on table "public"."agent_orchestration_tasks" from "authenticated";

revoke update on table "public"."agent_orchestration_tasks" from "authenticated";

revoke delete on table "public"."agent_orchestration_tasks" from "service_role";

revoke insert on table "public"."agent_orchestration_tasks" from "service_role";

revoke references on table "public"."agent_orchestration_tasks" from "service_role";

revoke select on table "public"."agent_orchestration_tasks" from "service_role";

revoke trigger on table "public"."agent_orchestration_tasks" from "service_role";

revoke truncate on table "public"."agent_orchestration_tasks" from "service_role";

revoke update on table "public"."agent_orchestration_tasks" from "service_role";

revoke delete on table "public"."agent_policy_versions" from "anon";

revoke insert on table "public"."agent_policy_versions" from "anon";

revoke references on table "public"."agent_policy_versions" from "anon";

revoke select on table "public"."agent_policy_versions" from "anon";

revoke trigger on table "public"."agent_policy_versions" from "anon";

revoke truncate on table "public"."agent_policy_versions" from "anon";

revoke update on table "public"."agent_policy_versions" from "anon";

revoke delete on table "public"."agent_policy_versions" from "authenticated";

revoke insert on table "public"."agent_policy_versions" from "authenticated";

revoke references on table "public"."agent_policy_versions" from "authenticated";

revoke select on table "public"."agent_policy_versions" from "authenticated";

revoke trigger on table "public"."agent_policy_versions" from "authenticated";

revoke truncate on table "public"."agent_policy_versions" from "authenticated";

revoke update on table "public"."agent_policy_versions" from "authenticated";

revoke delete on table "public"."agent_policy_versions" from "service_role";

revoke insert on table "public"."agent_policy_versions" from "service_role";

revoke references on table "public"."agent_policy_versions" from "service_role";

revoke select on table "public"."agent_policy_versions" from "service_role";

revoke trigger on table "public"."agent_policy_versions" from "service_role";

revoke truncate on table "public"."agent_policy_versions" from "service_role";

revoke update on table "public"."agent_policy_versions" from "service_role";

revoke delete on table "public"."agent_runs" from "anon";

revoke insert on table "public"."agent_runs" from "anon";

revoke references on table "public"."agent_runs" from "anon";

revoke select on table "public"."agent_runs" from "anon";

revoke trigger on table "public"."agent_runs" from "anon";

revoke truncate on table "public"."agent_runs" from "anon";

revoke update on table "public"."agent_runs" from "anon";

revoke delete on table "public"."agent_runs" from "authenticated";

revoke insert on table "public"."agent_runs" from "authenticated";

revoke references on table "public"."agent_runs" from "authenticated";

revoke select on table "public"."agent_runs" from "authenticated";

revoke trigger on table "public"."agent_runs" from "authenticated";

revoke truncate on table "public"."agent_runs" from "authenticated";

revoke update on table "public"."agent_runs" from "authenticated";

revoke delete on table "public"."agent_runs" from "service_role";

revoke insert on table "public"."agent_runs" from "service_role";

revoke references on table "public"."agent_runs" from "service_role";

revoke select on table "public"."agent_runs" from "service_role";

revoke trigger on table "public"."agent_runs" from "service_role";

revoke truncate on table "public"."agent_runs" from "service_role";

revoke update on table "public"."agent_runs" from "service_role";

revoke delete on table "public"."agent_safety_events" from "anon";

revoke insert on table "public"."agent_safety_events" from "anon";

revoke references on table "public"."agent_safety_events" from "anon";

revoke select on table "public"."agent_safety_events" from "anon";

revoke trigger on table "public"."agent_safety_events" from "anon";

revoke truncate on table "public"."agent_safety_events" from "anon";

revoke update on table "public"."agent_safety_events" from "anon";

revoke delete on table "public"."agent_safety_events" from "authenticated";

revoke insert on table "public"."agent_safety_events" from "authenticated";

revoke references on table "public"."agent_safety_events" from "authenticated";

revoke select on table "public"."agent_safety_events" from "authenticated";

revoke trigger on table "public"."agent_safety_events" from "authenticated";

revoke truncate on table "public"."agent_safety_events" from "authenticated";

revoke update on table "public"."agent_safety_events" from "authenticated";

revoke delete on table "public"."agent_safety_events" from "service_role";

revoke insert on table "public"."agent_safety_events" from "service_role";

revoke references on table "public"."agent_safety_events" from "service_role";

revoke select on table "public"."agent_safety_events" from "service_role";

revoke trigger on table "public"."agent_safety_events" from "service_role";

revoke truncate on table "public"."agent_safety_events" from "service_role";

revoke update on table "public"."agent_safety_events" from "service_role";

revoke delete on table "public"."agent_trace" from "anon";

revoke insert on table "public"."agent_trace" from "anon";

revoke references on table "public"."agent_trace" from "anon";

revoke select on table "public"."agent_trace" from "anon";

revoke trigger on table "public"."agent_trace" from "anon";

revoke truncate on table "public"."agent_trace" from "anon";

revoke update on table "public"."agent_trace" from "anon";

revoke delete on table "public"."agent_trace" from "authenticated";

revoke insert on table "public"."agent_trace" from "authenticated";

revoke references on table "public"."agent_trace" from "authenticated";

revoke select on table "public"."agent_trace" from "authenticated";

revoke trigger on table "public"."agent_trace" from "authenticated";

revoke truncate on table "public"."agent_trace" from "authenticated";

revoke update on table "public"."agent_trace" from "authenticated";

revoke delete on table "public"."agent_trace" from "service_role";

revoke insert on table "public"."agent_trace" from "service_role";

revoke references on table "public"."agent_trace" from "service_role";

revoke select on table "public"."agent_trace" from "service_role";

revoke trigger on table "public"."agent_trace" from "service_role";

revoke truncate on table "public"."agent_trace" from "service_role";

revoke update on table "public"."agent_trace" from "service_role";

revoke delete on table "public"."agent_traces" from "anon";

revoke insert on table "public"."agent_traces" from "anon";

revoke references on table "public"."agent_traces" from "anon";

revoke select on table "public"."agent_traces" from "anon";

revoke trigger on table "public"."agent_traces" from "anon";

revoke truncate on table "public"."agent_traces" from "anon";

revoke update on table "public"."agent_traces" from "anon";

revoke delete on table "public"."agent_traces" from "authenticated";

revoke insert on table "public"."agent_traces" from "authenticated";

revoke references on table "public"."agent_traces" from "authenticated";

revoke select on table "public"."agent_traces" from "authenticated";

revoke trigger on table "public"."agent_traces" from "authenticated";

revoke truncate on table "public"."agent_traces" from "authenticated";

revoke update on table "public"."agent_traces" from "authenticated";

revoke delete on table "public"."agent_traces" from "service_role";

revoke insert on table "public"."agent_traces" from "service_role";

revoke references on table "public"."agent_traces" from "service_role";

revoke select on table "public"."agent_traces" from "service_role";

revoke trigger on table "public"."agent_traces" from "service_role";

revoke truncate on table "public"."agent_traces" from "service_role";

revoke update on table "public"."agent_traces" from "service_role";

revoke delete on table "public"."approval_queue" from "anon";

revoke insert on table "public"."approval_queue" from "anon";

revoke references on table "public"."approval_queue" from "anon";

revoke select on table "public"."approval_queue" from "anon";

revoke trigger on table "public"."approval_queue" from "anon";

revoke truncate on table "public"."approval_queue" from "anon";

revoke update on table "public"."approval_queue" from "anon";

revoke delete on table "public"."approval_queue" from "authenticated";

revoke insert on table "public"."approval_queue" from "authenticated";

revoke references on table "public"."approval_queue" from "authenticated";

revoke select on table "public"."approval_queue" from "authenticated";

revoke trigger on table "public"."approval_queue" from "authenticated";

revoke truncate on table "public"."approval_queue" from "authenticated";

revoke update on table "public"."approval_queue" from "authenticated";

revoke delete on table "public"."approval_queue" from "service_role";

revoke insert on table "public"."approval_queue" from "service_role";

revoke references on table "public"."approval_queue" from "service_role";

revoke select on table "public"."approval_queue" from "service_role";

revoke trigger on table "public"."approval_queue" from "service_role";

revoke truncate on table "public"."approval_queue" from "service_role";

revoke update on table "public"."approval_queue" from "service_role";

revoke delete on table "public"."audit_evidence" from "anon";

revoke insert on table "public"."audit_evidence" from "anon";

revoke references on table "public"."audit_evidence" from "anon";

revoke select on table "public"."audit_evidence" from "anon";

revoke trigger on table "public"."audit_evidence" from "anon";

revoke truncate on table "public"."audit_evidence" from "anon";

revoke update on table "public"."audit_evidence" from "anon";

revoke delete on table "public"."audit_evidence" from "authenticated";

revoke insert on table "public"."audit_evidence" from "authenticated";

revoke references on table "public"."audit_evidence" from "authenticated";

revoke select on table "public"."audit_evidence" from "authenticated";

revoke trigger on table "public"."audit_evidence" from "authenticated";

revoke truncate on table "public"."audit_evidence" from "authenticated";

revoke update on table "public"."audit_evidence" from "authenticated";

revoke delete on table "public"."audit_evidence" from "service_role";

revoke insert on table "public"."audit_evidence" from "service_role";

revoke references on table "public"."audit_evidence" from "service_role";

revoke select on table "public"."audit_evidence" from "service_role";

revoke trigger on table "public"."audit_evidence" from "service_role";

revoke truncate on table "public"."audit_evidence" from "service_role";

revoke update on table "public"."audit_evidence" from "service_role";

revoke delete on table "public"."audit_planned_procedures" from "anon";

revoke insert on table "public"."audit_planned_procedures" from "anon";

revoke references on table "public"."audit_planned_procedures" from "anon";

revoke select on table "public"."audit_planned_procedures" from "anon";

revoke trigger on table "public"."audit_planned_procedures" from "anon";

revoke truncate on table "public"."audit_planned_procedures" from "anon";

revoke update on table "public"."audit_planned_procedures" from "anon";

revoke delete on table "public"."audit_planned_procedures" from "authenticated";

revoke insert on table "public"."audit_planned_procedures" from "authenticated";

revoke references on table "public"."audit_planned_procedures" from "authenticated";

revoke select on table "public"."audit_planned_procedures" from "authenticated";

revoke trigger on table "public"."audit_planned_procedures" from "authenticated";

revoke truncate on table "public"."audit_planned_procedures" from "authenticated";

revoke update on table "public"."audit_planned_procedures" from "authenticated";

revoke delete on table "public"."audit_planned_procedures" from "service_role";

revoke insert on table "public"."audit_planned_procedures" from "service_role";

revoke references on table "public"."audit_planned_procedures" from "service_role";

revoke select on table "public"."audit_planned_procedures" from "service_role";

revoke trigger on table "public"."audit_planned_procedures" from "service_role";

revoke truncate on table "public"."audit_planned_procedures" from "service_role";

revoke update on table "public"."audit_planned_procedures" from "service_role";

revoke delete on table "public"."audit_plans" from "anon";

revoke insert on table "public"."audit_plans" from "anon";

revoke references on table "public"."audit_plans" from "anon";

revoke select on table "public"."audit_plans" from "anon";

revoke trigger on table "public"."audit_plans" from "anon";

revoke truncate on table "public"."audit_plans" from "anon";

revoke update on table "public"."audit_plans" from "anon";

revoke delete on table "public"."audit_plans" from "authenticated";

revoke insert on table "public"."audit_plans" from "authenticated";

revoke references on table "public"."audit_plans" from "authenticated";

revoke select on table "public"."audit_plans" from "authenticated";

revoke trigger on table "public"."audit_plans" from "authenticated";

revoke truncate on table "public"."audit_plans" from "authenticated";

revoke update on table "public"."audit_plans" from "authenticated";

revoke delete on table "public"."audit_plans" from "service_role";

revoke insert on table "public"."audit_plans" from "service_role";

revoke references on table "public"."audit_plans" from "service_role";

revoke select on table "public"."audit_plans" from "service_role";

revoke trigger on table "public"."audit_plans" from "service_role";

revoke truncate on table "public"."audit_plans" from "service_role";

revoke update on table "public"."audit_plans" from "service_role";

revoke delete on table "public"."audit_response_checks" from "anon";

revoke insert on table "public"."audit_response_checks" from "anon";

revoke references on table "public"."audit_response_checks" from "anon";

revoke select on table "public"."audit_response_checks" from "anon";

revoke trigger on table "public"."audit_response_checks" from "anon";

revoke truncate on table "public"."audit_response_checks" from "anon";

revoke update on table "public"."audit_response_checks" from "anon";

revoke delete on table "public"."audit_response_checks" from "authenticated";

revoke insert on table "public"."audit_response_checks" from "authenticated";

revoke references on table "public"."audit_response_checks" from "authenticated";

revoke select on table "public"."audit_response_checks" from "authenticated";

revoke trigger on table "public"."audit_response_checks" from "authenticated";

revoke truncate on table "public"."audit_response_checks" from "authenticated";

revoke update on table "public"."audit_response_checks" from "authenticated";

revoke delete on table "public"."audit_response_checks" from "service_role";

revoke insert on table "public"."audit_response_checks" from "service_role";

revoke references on table "public"."audit_response_checks" from "service_role";

revoke select on table "public"."audit_response_checks" from "service_role";

revoke trigger on table "public"."audit_response_checks" from "service_role";

revoke truncate on table "public"."audit_response_checks" from "service_role";

revoke update on table "public"."audit_response_checks" from "service_role";

revoke delete on table "public"."audit_responses" from "anon";

revoke insert on table "public"."audit_responses" from "anon";

revoke references on table "public"."audit_responses" from "anon";

revoke select on table "public"."audit_responses" from "anon";

revoke trigger on table "public"."audit_responses" from "anon";

revoke truncate on table "public"."audit_responses" from "anon";

revoke update on table "public"."audit_responses" from "anon";

revoke delete on table "public"."audit_responses" from "authenticated";

revoke insert on table "public"."audit_responses" from "authenticated";

revoke references on table "public"."audit_responses" from "authenticated";

revoke select on table "public"."audit_responses" from "authenticated";

revoke trigger on table "public"."audit_responses" from "authenticated";

revoke truncate on table "public"."audit_responses" from "authenticated";

revoke update on table "public"."audit_responses" from "authenticated";

revoke delete on table "public"."audit_responses" from "service_role";

revoke insert on table "public"."audit_responses" from "service_role";

revoke references on table "public"."audit_responses" from "service_role";

revoke select on table "public"."audit_responses" from "service_role";

revoke trigger on table "public"."audit_responses" from "service_role";

revoke truncate on table "public"."audit_responses" from "service_role";

revoke update on table "public"."audit_responses" from "service_role";

revoke delete on table "public"."audit_risk_activity" from "anon";

revoke insert on table "public"."audit_risk_activity" from "anon";

revoke references on table "public"."audit_risk_activity" from "anon";

revoke select on table "public"."audit_risk_activity" from "anon";

revoke trigger on table "public"."audit_risk_activity" from "anon";

revoke truncate on table "public"."audit_risk_activity" from "anon";

revoke update on table "public"."audit_risk_activity" from "anon";

revoke delete on table "public"."audit_risk_activity" from "authenticated";

revoke insert on table "public"."audit_risk_activity" from "authenticated";

revoke references on table "public"."audit_risk_activity" from "authenticated";

revoke select on table "public"."audit_risk_activity" from "authenticated";

revoke trigger on table "public"."audit_risk_activity" from "authenticated";

revoke truncate on table "public"."audit_risk_activity" from "authenticated";

revoke update on table "public"."audit_risk_activity" from "authenticated";

revoke delete on table "public"."audit_risk_activity" from "service_role";

revoke insert on table "public"."audit_risk_activity" from "service_role";

revoke references on table "public"."audit_risk_activity" from "service_role";

revoke select on table "public"."audit_risk_activity" from "service_role";

revoke trigger on table "public"."audit_risk_activity" from "service_role";

revoke truncate on table "public"."audit_risk_activity" from "service_role";

revoke update on table "public"."audit_risk_activity" from "service_role";

revoke delete on table "public"."audit_risk_signals" from "anon";

revoke insert on table "public"."audit_risk_signals" from "anon";

revoke references on table "public"."audit_risk_signals" from "anon";

revoke select on table "public"."audit_risk_signals" from "anon";

revoke trigger on table "public"."audit_risk_signals" from "anon";

revoke truncate on table "public"."audit_risk_signals" from "anon";

revoke update on table "public"."audit_risk_signals" from "anon";

revoke delete on table "public"."audit_risk_signals" from "authenticated";

revoke insert on table "public"."audit_risk_signals" from "authenticated";

revoke references on table "public"."audit_risk_signals" from "authenticated";

revoke select on table "public"."audit_risk_signals" from "authenticated";

revoke trigger on table "public"."audit_risk_signals" from "authenticated";

revoke truncate on table "public"."audit_risk_signals" from "authenticated";

revoke update on table "public"."audit_risk_signals" from "authenticated";

revoke delete on table "public"."audit_risk_signals" from "service_role";

revoke insert on table "public"."audit_risk_signals" from "service_role";

revoke references on table "public"."audit_risk_signals" from "service_role";

revoke select on table "public"."audit_risk_signals" from "service_role";

revoke trigger on table "public"."audit_risk_signals" from "service_role";

revoke truncate on table "public"."audit_risk_signals" from "service_role";

revoke update on table "public"."audit_risk_signals" from "service_role";

revoke delete on table "public"."audit_risks" from "anon";

revoke insert on table "public"."audit_risks" from "anon";

revoke references on table "public"."audit_risks" from "anon";

revoke select on table "public"."audit_risks" from "anon";

revoke trigger on table "public"."audit_risks" from "anon";

revoke truncate on table "public"."audit_risks" from "anon";

revoke update on table "public"."audit_risks" from "anon";

revoke delete on table "public"."audit_risks" from "authenticated";

revoke insert on table "public"."audit_risks" from "authenticated";

revoke references on table "public"."audit_risks" from "authenticated";

revoke select on table "public"."audit_risks" from "authenticated";

revoke trigger on table "public"."audit_risks" from "authenticated";

revoke truncate on table "public"."audit_risks" from "authenticated";

revoke update on table "public"."audit_risks" from "authenticated";

revoke delete on table "public"."audit_risks" from "service_role";

revoke insert on table "public"."audit_risks" from "service_role";

revoke references on table "public"."audit_risks" from "service_role";

revoke select on table "public"."audit_risks" from "service_role";

revoke trigger on table "public"."audit_risks" from "service_role";

revoke truncate on table "public"."audit_risks" from "service_role";

revoke update on table "public"."audit_risks" from "service_role";

revoke delete on table "public"."cfc_inclusions" from "anon";

revoke insert on table "public"."cfc_inclusions" from "anon";

revoke references on table "public"."cfc_inclusions" from "anon";

revoke select on table "public"."cfc_inclusions" from "anon";

revoke trigger on table "public"."cfc_inclusions" from "anon";

revoke truncate on table "public"."cfc_inclusions" from "anon";

revoke update on table "public"."cfc_inclusions" from "anon";

revoke delete on table "public"."cfc_inclusions" from "authenticated";

revoke insert on table "public"."cfc_inclusions" from "authenticated";

revoke references on table "public"."cfc_inclusions" from "authenticated";

revoke select on table "public"."cfc_inclusions" from "authenticated";

revoke trigger on table "public"."cfc_inclusions" from "authenticated";

revoke truncate on table "public"."cfc_inclusions" from "authenticated";

revoke update on table "public"."cfc_inclusions" from "authenticated";

revoke delete on table "public"."cfc_inclusions" from "service_role";

revoke insert on table "public"."cfc_inclusions" from "service_role";

revoke references on table "public"."cfc_inclusions" from "service_role";

revoke select on table "public"."cfc_inclusions" from "service_role";

revoke trigger on table "public"."cfc_inclusions" from "service_role";

revoke truncate on table "public"."cfc_inclusions" from "service_role";

revoke update on table "public"."cfc_inclusions" from "service_role";

revoke delete on table "public"."chatkit_session_transcripts" from "anon";

revoke insert on table "public"."chatkit_session_transcripts" from "anon";

revoke references on table "public"."chatkit_session_transcripts" from "anon";

revoke select on table "public"."chatkit_session_transcripts" from "anon";

revoke trigger on table "public"."chatkit_session_transcripts" from "anon";

revoke truncate on table "public"."chatkit_session_transcripts" from "anon";

revoke update on table "public"."chatkit_session_transcripts" from "anon";

revoke delete on table "public"."chatkit_session_transcripts" from "authenticated";

revoke insert on table "public"."chatkit_session_transcripts" from "authenticated";

revoke references on table "public"."chatkit_session_transcripts" from "authenticated";

revoke select on table "public"."chatkit_session_transcripts" from "authenticated";

revoke trigger on table "public"."chatkit_session_transcripts" from "authenticated";

revoke truncate on table "public"."chatkit_session_transcripts" from "authenticated";

revoke update on table "public"."chatkit_session_transcripts" from "authenticated";

revoke delete on table "public"."chatkit_session_transcripts" from "service_role";

revoke insert on table "public"."chatkit_session_transcripts" from "service_role";

revoke references on table "public"."chatkit_session_transcripts" from "service_role";

revoke select on table "public"."chatkit_session_transcripts" from "service_role";

revoke trigger on table "public"."chatkit_session_transcripts" from "service_role";

revoke truncate on table "public"."chatkit_session_transcripts" from "service_role";

revoke update on table "public"."chatkit_session_transcripts" from "service_role";

revoke delete on table "public"."chatkit_sessions" from "anon";

revoke insert on table "public"."chatkit_sessions" from "anon";

revoke references on table "public"."chatkit_sessions" from "anon";

revoke select on table "public"."chatkit_sessions" from "anon";

revoke trigger on table "public"."chatkit_sessions" from "anon";

revoke truncate on table "public"."chatkit_sessions" from "anon";

revoke update on table "public"."chatkit_sessions" from "anon";

revoke delete on table "public"."chatkit_sessions" from "authenticated";

revoke insert on table "public"."chatkit_sessions" from "authenticated";

revoke references on table "public"."chatkit_sessions" from "authenticated";

revoke select on table "public"."chatkit_sessions" from "authenticated";

revoke trigger on table "public"."chatkit_sessions" from "authenticated";

revoke truncate on table "public"."chatkit_sessions" from "authenticated";

revoke update on table "public"."chatkit_sessions" from "authenticated";

revoke delete on table "public"."chatkit_sessions" from "service_role";

revoke insert on table "public"."chatkit_sessions" from "service_role";

revoke references on table "public"."chatkit_sessions" from "service_role";

revoke select on table "public"."chatkit_sessions" from "service_role";

revoke trigger on table "public"."chatkit_sessions" from "service_role";

revoke truncate on table "public"."chatkit_sessions" from "service_role";

revoke update on table "public"."chatkit_sessions" from "service_role";

revoke delete on table "public"."cit_computations" from "anon";

revoke insert on table "public"."cit_computations" from "anon";

revoke references on table "public"."cit_computations" from "anon";

revoke select on table "public"."cit_computations" from "anon";

revoke trigger on table "public"."cit_computations" from "anon";

revoke truncate on table "public"."cit_computations" from "anon";

revoke update on table "public"."cit_computations" from "anon";

revoke delete on table "public"."cit_computations" from "authenticated";

revoke insert on table "public"."cit_computations" from "authenticated";

revoke references on table "public"."cit_computations" from "authenticated";

revoke select on table "public"."cit_computations" from "authenticated";

revoke trigger on table "public"."cit_computations" from "authenticated";

revoke truncate on table "public"."cit_computations" from "authenticated";

revoke update on table "public"."cit_computations" from "authenticated";

revoke delete on table "public"."cit_computations" from "service_role";

revoke insert on table "public"."cit_computations" from "service_role";

revoke references on table "public"."cit_computations" from "service_role";

revoke select on table "public"."cit_computations" from "service_role";

revoke trigger on table "public"."cit_computations" from "service_role";

revoke truncate on table "public"."cit_computations" from "service_role";

revoke update on table "public"."cit_computations" from "service_role";

revoke delete on table "public"."citation_canonicalizer" from "anon";

revoke insert on table "public"."citation_canonicalizer" from "anon";

revoke references on table "public"."citation_canonicalizer" from "anon";

revoke select on table "public"."citation_canonicalizer" from "anon";

revoke trigger on table "public"."citation_canonicalizer" from "anon";

revoke truncate on table "public"."citation_canonicalizer" from "anon";

revoke update on table "public"."citation_canonicalizer" from "anon";

revoke delete on table "public"."citation_canonicalizer" from "authenticated";

revoke insert on table "public"."citation_canonicalizer" from "authenticated";

revoke references on table "public"."citation_canonicalizer" from "authenticated";

revoke select on table "public"."citation_canonicalizer" from "authenticated";

revoke trigger on table "public"."citation_canonicalizer" from "authenticated";

revoke truncate on table "public"."citation_canonicalizer" from "authenticated";

revoke update on table "public"."citation_canonicalizer" from "authenticated";

revoke delete on table "public"."citation_canonicalizer" from "service_role";

revoke insert on table "public"."citation_canonicalizer" from "service_role";

revoke references on table "public"."citation_canonicalizer" from "service_role";

revoke select on table "public"."citation_canonicalizer" from "service_role";

revoke trigger on table "public"."citation_canonicalizer" from "service_role";

revoke truncate on table "public"."citation_canonicalizer" from "service_role";

revoke update on table "public"."citation_canonicalizer" from "service_role";

revoke delete on table "public"."client_background_checks" from "anon";

revoke insert on table "public"."client_background_checks" from "anon";

revoke references on table "public"."client_background_checks" from "anon";

revoke select on table "public"."client_background_checks" from "anon";

revoke trigger on table "public"."client_background_checks" from "anon";

revoke truncate on table "public"."client_background_checks" from "anon";

revoke update on table "public"."client_background_checks" from "anon";

revoke delete on table "public"."client_background_checks" from "authenticated";

revoke insert on table "public"."client_background_checks" from "authenticated";

revoke references on table "public"."client_background_checks" from "authenticated";

revoke select on table "public"."client_background_checks" from "authenticated";

revoke trigger on table "public"."client_background_checks" from "authenticated";

revoke truncate on table "public"."client_background_checks" from "authenticated";

revoke update on table "public"."client_background_checks" from "authenticated";

revoke delete on table "public"."client_background_checks" from "service_role";

revoke insert on table "public"."client_background_checks" from "service_role";

revoke references on table "public"."client_background_checks" from "service_role";

revoke select on table "public"."client_background_checks" from "service_role";

revoke trigger on table "public"."client_background_checks" from "service_role";

revoke truncate on table "public"."client_background_checks" from "service_role";

revoke update on table "public"."client_background_checks" from "service_role";

revoke delete on table "public"."close_pbc_items" from "anon";

revoke insert on table "public"."close_pbc_items" from "anon";

revoke references on table "public"."close_pbc_items" from "anon";

revoke select on table "public"."close_pbc_items" from "anon";

revoke trigger on table "public"."close_pbc_items" from "anon";

revoke truncate on table "public"."close_pbc_items" from "anon";

revoke update on table "public"."close_pbc_items" from "anon";

revoke delete on table "public"."close_pbc_items" from "authenticated";

revoke insert on table "public"."close_pbc_items" from "authenticated";

revoke references on table "public"."close_pbc_items" from "authenticated";

revoke select on table "public"."close_pbc_items" from "authenticated";

revoke trigger on table "public"."close_pbc_items" from "authenticated";

revoke truncate on table "public"."close_pbc_items" from "authenticated";

revoke update on table "public"."close_pbc_items" from "authenticated";

revoke delete on table "public"."close_pbc_items" from "service_role";

revoke insert on table "public"."close_pbc_items" from "service_role";

revoke references on table "public"."close_pbc_items" from "service_role";

revoke select on table "public"."close_pbc_items" from "service_role";

revoke trigger on table "public"."close_pbc_items" from "service_role";

revoke truncate on table "public"."close_pbc_items" from "service_role";

revoke update on table "public"."close_pbc_items" from "service_role";

revoke delete on table "public"."close_periods" from "anon";

revoke insert on table "public"."close_periods" from "anon";

revoke references on table "public"."close_periods" from "anon";

revoke select on table "public"."close_periods" from "anon";

revoke trigger on table "public"."close_periods" from "anon";

revoke truncate on table "public"."close_periods" from "anon";

revoke update on table "public"."close_periods" from "anon";

revoke delete on table "public"."close_periods" from "authenticated";

revoke insert on table "public"."close_periods" from "authenticated";

revoke references on table "public"."close_periods" from "authenticated";

revoke select on table "public"."close_periods" from "authenticated";

revoke trigger on table "public"."close_periods" from "authenticated";

revoke truncate on table "public"."close_periods" from "authenticated";

revoke update on table "public"."close_periods" from "authenticated";

revoke delete on table "public"."close_periods" from "service_role";

revoke insert on table "public"."close_periods" from "service_role";

revoke references on table "public"."close_periods" from "service_role";

revoke select on table "public"."close_periods" from "service_role";

revoke trigger on table "public"."close_periods" from "service_role";

revoke truncate on table "public"."close_periods" from "service_role";

revoke update on table "public"."close_periods" from "service_role";

revoke delete on table "public"."coa_map" from "anon";

revoke insert on table "public"."coa_map" from "anon";

revoke references on table "public"."coa_map" from "anon";

revoke select on table "public"."coa_map" from "anon";

revoke trigger on table "public"."coa_map" from "anon";

revoke truncate on table "public"."coa_map" from "anon";

revoke update on table "public"."coa_map" from "anon";

revoke delete on table "public"."coa_map" from "authenticated";

revoke insert on table "public"."coa_map" from "authenticated";

revoke references on table "public"."coa_map" from "authenticated";

revoke select on table "public"."coa_map" from "authenticated";

revoke trigger on table "public"."coa_map" from "authenticated";

revoke truncate on table "public"."coa_map" from "authenticated";

revoke update on table "public"."coa_map" from "authenticated";

revoke delete on table "public"."coa_map" from "service_role";

revoke insert on table "public"."coa_map" from "service_role";

revoke references on table "public"."coa_map" from "service_role";

revoke select on table "public"."coa_map" from "service_role";

revoke trigger on table "public"."coa_map" from "service_role";

revoke truncate on table "public"."coa_map" from "service_role";

revoke update on table "public"."coa_map" from "service_role";

revoke delete on table "public"."company_profile_drafts" from "anon";

revoke insert on table "public"."company_profile_drafts" from "anon";

revoke references on table "public"."company_profile_drafts" from "anon";

revoke select on table "public"."company_profile_drafts" from "anon";

revoke trigger on table "public"."company_profile_drafts" from "anon";

revoke truncate on table "public"."company_profile_drafts" from "anon";

revoke update on table "public"."company_profile_drafts" from "anon";

revoke delete on table "public"."company_profile_drafts" from "authenticated";

revoke insert on table "public"."company_profile_drafts" from "authenticated";

revoke references on table "public"."company_profile_drafts" from "authenticated";

revoke select on table "public"."company_profile_drafts" from "authenticated";

revoke trigger on table "public"."company_profile_drafts" from "authenticated";

revoke truncate on table "public"."company_profile_drafts" from "authenticated";

revoke update on table "public"."company_profile_drafts" from "authenticated";

revoke delete on table "public"."company_profile_drafts" from "service_role";

revoke insert on table "public"."company_profile_drafts" from "service_role";

revoke references on table "public"."company_profile_drafts" from "service_role";

revoke select on table "public"."company_profile_drafts" from "service_role";

revoke trigger on table "public"."company_profile_drafts" from "service_role";

revoke truncate on table "public"."company_profile_drafts" from "service_role";

revoke update on table "public"."company_profile_drafts" from "service_role";

revoke delete on table "public"."control_tests" from "anon";

revoke insert on table "public"."control_tests" from "anon";

revoke references on table "public"."control_tests" from "anon";

revoke select on table "public"."control_tests" from "anon";

revoke trigger on table "public"."control_tests" from "anon";

revoke truncate on table "public"."control_tests" from "anon";

revoke update on table "public"."control_tests" from "anon";

revoke delete on table "public"."control_tests" from "authenticated";

revoke insert on table "public"."control_tests" from "authenticated";

revoke references on table "public"."control_tests" from "authenticated";

revoke select on table "public"."control_tests" from "authenticated";

revoke trigger on table "public"."control_tests" from "authenticated";

revoke truncate on table "public"."control_tests" from "authenticated";

revoke update on table "public"."control_tests" from "authenticated";

revoke delete on table "public"."control_tests" from "service_role";

revoke insert on table "public"."control_tests" from "service_role";

revoke references on table "public"."control_tests" from "service_role";

revoke select on table "public"."control_tests" from "service_role";

revoke trigger on table "public"."control_tests" from "service_role";

revoke truncate on table "public"."control_tests" from "service_role";

revoke update on table "public"."control_tests" from "service_role";

revoke delete on table "public"."control_walkthroughs" from "anon";

revoke insert on table "public"."control_walkthroughs" from "anon";

revoke references on table "public"."control_walkthroughs" from "anon";

revoke select on table "public"."control_walkthroughs" from "anon";

revoke trigger on table "public"."control_walkthroughs" from "anon";

revoke truncate on table "public"."control_walkthroughs" from "anon";

revoke update on table "public"."control_walkthroughs" from "anon";

revoke delete on table "public"."control_walkthroughs" from "authenticated";

revoke insert on table "public"."control_walkthroughs" from "authenticated";

revoke references on table "public"."control_walkthroughs" from "authenticated";

revoke select on table "public"."control_walkthroughs" from "authenticated";

revoke trigger on table "public"."control_walkthroughs" from "authenticated";

revoke truncate on table "public"."control_walkthroughs" from "authenticated";

revoke update on table "public"."control_walkthroughs" from "authenticated";

revoke delete on table "public"."control_walkthroughs" from "service_role";

revoke insert on table "public"."control_walkthroughs" from "service_role";

revoke references on table "public"."control_walkthroughs" from "service_role";

revoke select on table "public"."control_walkthroughs" from "service_role";

revoke trigger on table "public"."control_walkthroughs" from "service_role";

revoke truncate on table "public"."control_walkthroughs" from "service_role";

revoke update on table "public"."control_walkthroughs" from "service_role";

revoke delete on table "public"."controls" from "anon";

revoke insert on table "public"."controls" from "anon";

revoke references on table "public"."controls" from "anon";

revoke select on table "public"."controls" from "anon";

revoke trigger on table "public"."controls" from "anon";

revoke truncate on table "public"."controls" from "anon";

revoke update on table "public"."controls" from "anon";

revoke delete on table "public"."controls" from "authenticated";

revoke insert on table "public"."controls" from "authenticated";

revoke references on table "public"."controls" from "authenticated";

revoke select on table "public"."controls" from "authenticated";

revoke trigger on table "public"."controls" from "authenticated";

revoke truncate on table "public"."controls" from "authenticated";

revoke update on table "public"."controls" from "authenticated";

revoke delete on table "public"."controls" from "service_role";

revoke insert on table "public"."controls" from "service_role";

revoke references on table "public"."controls" from "service_role";

revoke select on table "public"."controls" from "service_role";

revoke trigger on table "public"."controls" from "service_role";

revoke truncate on table "public"."controls" from "service_role";

revoke update on table "public"."controls" from "service_role";

revoke delete on table "public"."dac6_arrangements" from "anon";

revoke insert on table "public"."dac6_arrangements" from "anon";

revoke references on table "public"."dac6_arrangements" from "anon";

revoke select on table "public"."dac6_arrangements" from "anon";

revoke trigger on table "public"."dac6_arrangements" from "anon";

revoke truncate on table "public"."dac6_arrangements" from "anon";

revoke update on table "public"."dac6_arrangements" from "anon";

revoke delete on table "public"."dac6_arrangements" from "authenticated";

revoke insert on table "public"."dac6_arrangements" from "authenticated";

revoke references on table "public"."dac6_arrangements" from "authenticated";

revoke select on table "public"."dac6_arrangements" from "authenticated";

revoke trigger on table "public"."dac6_arrangements" from "authenticated";

revoke truncate on table "public"."dac6_arrangements" from "authenticated";

revoke update on table "public"."dac6_arrangements" from "authenticated";

revoke delete on table "public"."dac6_arrangements" from "service_role";

revoke insert on table "public"."dac6_arrangements" from "service_role";

revoke references on table "public"."dac6_arrangements" from "service_role";

revoke select on table "public"."dac6_arrangements" from "service_role";

revoke trigger on table "public"."dac6_arrangements" from "service_role";

revoke truncate on table "public"."dac6_arrangements" from "service_role";

revoke update on table "public"."dac6_arrangements" from "service_role";

revoke delete on table "public"."dac6_filings" from "anon";

revoke insert on table "public"."dac6_filings" from "anon";

revoke references on table "public"."dac6_filings" from "anon";

revoke select on table "public"."dac6_filings" from "anon";

revoke trigger on table "public"."dac6_filings" from "anon";

revoke truncate on table "public"."dac6_filings" from "anon";

revoke update on table "public"."dac6_filings" from "anon";

revoke delete on table "public"."dac6_filings" from "authenticated";

revoke insert on table "public"."dac6_filings" from "authenticated";

revoke references on table "public"."dac6_filings" from "authenticated";

revoke select on table "public"."dac6_filings" from "authenticated";

revoke trigger on table "public"."dac6_filings" from "authenticated";

revoke truncate on table "public"."dac6_filings" from "authenticated";

revoke update on table "public"."dac6_filings" from "authenticated";

revoke delete on table "public"."dac6_filings" from "service_role";

revoke insert on table "public"."dac6_filings" from "service_role";

revoke references on table "public"."dac6_filings" from "service_role";

revoke select on table "public"."dac6_filings" from "service_role";

revoke trigger on table "public"."dac6_filings" from "service_role";

revoke truncate on table "public"."dac6_filings" from "service_role";

revoke update on table "public"."dac6_filings" from "service_role";

revoke delete on table "public"."dac6_hallmarks" from "anon";

revoke insert on table "public"."dac6_hallmarks" from "anon";

revoke references on table "public"."dac6_hallmarks" from "anon";

revoke select on table "public"."dac6_hallmarks" from "anon";

revoke trigger on table "public"."dac6_hallmarks" from "anon";

revoke truncate on table "public"."dac6_hallmarks" from "anon";

revoke update on table "public"."dac6_hallmarks" from "anon";

revoke delete on table "public"."dac6_hallmarks" from "authenticated";

revoke insert on table "public"."dac6_hallmarks" from "authenticated";

revoke references on table "public"."dac6_hallmarks" from "authenticated";

revoke select on table "public"."dac6_hallmarks" from "authenticated";

revoke trigger on table "public"."dac6_hallmarks" from "authenticated";

revoke truncate on table "public"."dac6_hallmarks" from "authenticated";

revoke update on table "public"."dac6_hallmarks" from "authenticated";

revoke delete on table "public"."dac6_hallmarks" from "service_role";

revoke insert on table "public"."dac6_hallmarks" from "service_role";

revoke references on table "public"."dac6_hallmarks" from "service_role";

revoke select on table "public"."dac6_hallmarks" from "service_role";

revoke trigger on table "public"."dac6_hallmarks" from "service_role";

revoke truncate on table "public"."dac6_hallmarks" from "service_role";

revoke update on table "public"."dac6_hallmarks" from "service_role";

revoke delete on table "public"."dac6_participants" from "anon";

revoke insert on table "public"."dac6_participants" from "anon";

revoke references on table "public"."dac6_participants" from "anon";

revoke select on table "public"."dac6_participants" from "anon";

revoke trigger on table "public"."dac6_participants" from "anon";

revoke truncate on table "public"."dac6_participants" from "anon";

revoke update on table "public"."dac6_participants" from "anon";

revoke delete on table "public"."dac6_participants" from "authenticated";

revoke insert on table "public"."dac6_participants" from "authenticated";

revoke references on table "public"."dac6_participants" from "authenticated";

revoke select on table "public"."dac6_participants" from "authenticated";

revoke trigger on table "public"."dac6_participants" from "authenticated";

revoke truncate on table "public"."dac6_participants" from "authenticated";

revoke update on table "public"."dac6_participants" from "authenticated";

revoke delete on table "public"."dac6_participants" from "service_role";

revoke insert on table "public"."dac6_participants" from "service_role";

revoke references on table "public"."dac6_participants" from "service_role";

revoke select on table "public"."dac6_participants" from "service_role";

revoke trigger on table "public"."dac6_participants" from "service_role";

revoke truncate on table "public"."dac6_participants" from "service_role";

revoke update on table "public"."dac6_participants" from "service_role";

revoke delete on table "public"."deficiencies" from "anon";

revoke insert on table "public"."deficiencies" from "anon";

revoke references on table "public"."deficiencies" from "anon";

revoke select on table "public"."deficiencies" from "anon";

revoke trigger on table "public"."deficiencies" from "anon";

revoke truncate on table "public"."deficiencies" from "anon";

revoke update on table "public"."deficiencies" from "anon";

revoke delete on table "public"."deficiencies" from "authenticated";

revoke insert on table "public"."deficiencies" from "authenticated";

revoke references on table "public"."deficiencies" from "authenticated";

revoke select on table "public"."deficiencies" from "authenticated";

revoke trigger on table "public"."deficiencies" from "authenticated";

revoke truncate on table "public"."deficiencies" from "authenticated";

revoke update on table "public"."deficiencies" from "authenticated";

revoke delete on table "public"."deficiencies" from "service_role";

revoke insert on table "public"."deficiencies" from "service_role";

revoke references on table "public"."deficiencies" from "service_role";

revoke select on table "public"."deficiencies" from "service_role";

revoke trigger on table "public"."deficiencies" from "service_role";

revoke truncate on table "public"."deficiencies" from "service_role";

revoke update on table "public"."deficiencies" from "service_role";

revoke delete on table "public"."denylist_deboost" from "anon";

revoke insert on table "public"."denylist_deboost" from "anon";

revoke references on table "public"."denylist_deboost" from "anon";

revoke select on table "public"."denylist_deboost" from "anon";

revoke trigger on table "public"."denylist_deboost" from "anon";

revoke truncate on table "public"."denylist_deboost" from "anon";

revoke update on table "public"."denylist_deboost" from "anon";

revoke delete on table "public"."denylist_deboost" from "authenticated";

revoke insert on table "public"."denylist_deboost" from "authenticated";

revoke references on table "public"."denylist_deboost" from "authenticated";

revoke select on table "public"."denylist_deboost" from "authenticated";

revoke trigger on table "public"."denylist_deboost" from "authenticated";

revoke truncate on table "public"."denylist_deboost" from "authenticated";

revoke update on table "public"."denylist_deboost" from "authenticated";

revoke delete on table "public"."denylist_deboost" from "service_role";

revoke insert on table "public"."denylist_deboost" from "service_role";

revoke references on table "public"."denylist_deboost" from "service_role";

revoke select on table "public"."denylist_deboost" from "service_role";

revoke trigger on table "public"."denylist_deboost" from "service_role";

revoke truncate on table "public"."denylist_deboost" from "service_role";

revoke update on table "public"."denylist_deboost" from "service_role";

revoke delete on table "public"."document_extractions" from "anon";

revoke insert on table "public"."document_extractions" from "anon";

revoke references on table "public"."document_extractions" from "anon";

revoke select on table "public"."document_extractions" from "anon";

revoke trigger on table "public"."document_extractions" from "anon";

revoke truncate on table "public"."document_extractions" from "anon";

revoke update on table "public"."document_extractions" from "anon";

revoke delete on table "public"."document_extractions" from "authenticated";

revoke insert on table "public"."document_extractions" from "authenticated";

revoke references on table "public"."document_extractions" from "authenticated";

revoke select on table "public"."document_extractions" from "authenticated";

revoke trigger on table "public"."document_extractions" from "authenticated";

revoke truncate on table "public"."document_extractions" from "authenticated";

revoke update on table "public"."document_extractions" from "authenticated";

revoke delete on table "public"."document_extractions" from "service_role";

revoke insert on table "public"."document_extractions" from "service_role";

revoke references on table "public"."document_extractions" from "service_role";

revoke select on table "public"."document_extractions" from "service_role";

revoke trigger on table "public"."document_extractions" from "service_role";

revoke truncate on table "public"."document_extractions" from "service_role";

revoke update on table "public"."document_extractions" from "service_role";

revoke delete on table "public"."document_index" from "anon";

revoke insert on table "public"."document_index" from "anon";

revoke references on table "public"."document_index" from "anon";

revoke select on table "public"."document_index" from "anon";

revoke trigger on table "public"."document_index" from "anon";

revoke truncate on table "public"."document_index" from "anon";

revoke update on table "public"."document_index" from "anon";

revoke delete on table "public"."document_index" from "authenticated";

revoke insert on table "public"."document_index" from "authenticated";

revoke references on table "public"."document_index" from "authenticated";

revoke select on table "public"."document_index" from "authenticated";

revoke trigger on table "public"."document_index" from "authenticated";

revoke truncate on table "public"."document_index" from "authenticated";

revoke update on table "public"."document_index" from "authenticated";

revoke delete on table "public"."document_index" from "service_role";

revoke insert on table "public"."document_index" from "service_role";

revoke references on table "public"."document_index" from "service_role";

revoke select on table "public"."document_index" from "service_role";

revoke trigger on table "public"."document_index" from "service_role";

revoke truncate on table "public"."document_index" from "service_role";

revoke update on table "public"."document_index" from "service_role";

revoke delete on table "public"."entities" from "anon";

revoke insert on table "public"."entities" from "anon";

revoke references on table "public"."entities" from "anon";

revoke select on table "public"."entities" from "anon";

revoke trigger on table "public"."entities" from "anon";

revoke truncate on table "public"."entities" from "anon";

revoke update on table "public"."entities" from "anon";

revoke delete on table "public"."entities" from "authenticated";

revoke insert on table "public"."entities" from "authenticated";

revoke references on table "public"."entities" from "authenticated";

revoke select on table "public"."entities" from "authenticated";

revoke trigger on table "public"."entities" from "authenticated";

revoke truncate on table "public"."entities" from "authenticated";

revoke update on table "public"."entities" from "authenticated";

revoke delete on table "public"."entities" from "service_role";

revoke insert on table "public"."entities" from "service_role";

revoke references on table "public"."entities" from "service_role";

revoke select on table "public"."entities" from "service_role";

revoke trigger on table "public"."entities" from "service_role";

revoke truncate on table "public"."entities" from "service_role";

revoke update on table "public"."entities" from "service_role";

revoke delete on table "public"."estimate_register" from "anon";

revoke insert on table "public"."estimate_register" from "anon";

revoke references on table "public"."estimate_register" from "anon";

revoke select on table "public"."estimate_register" from "anon";

revoke trigger on table "public"."estimate_register" from "anon";

revoke truncate on table "public"."estimate_register" from "anon";

revoke update on table "public"."estimate_register" from "anon";

revoke delete on table "public"."estimate_register" from "authenticated";

revoke insert on table "public"."estimate_register" from "authenticated";

revoke references on table "public"."estimate_register" from "authenticated";

revoke select on table "public"."estimate_register" from "authenticated";

revoke trigger on table "public"."estimate_register" from "authenticated";

revoke truncate on table "public"."estimate_register" from "authenticated";

revoke update on table "public"."estimate_register" from "authenticated";

revoke delete on table "public"."estimate_register" from "service_role";

revoke insert on table "public"."estimate_register" from "service_role";

revoke references on table "public"."estimate_register" from "service_role";

revoke select on table "public"."estimate_register" from "service_role";

revoke trigger on table "public"."estimate_register" from "service_role";

revoke truncate on table "public"."estimate_register" from "service_role";

revoke update on table "public"."estimate_register" from "service_role";

revoke delete on table "public"."fiscal_unity_computations" from "anon";

revoke insert on table "public"."fiscal_unity_computations" from "anon";

revoke references on table "public"."fiscal_unity_computations" from "anon";

revoke select on table "public"."fiscal_unity_computations" from "anon";

revoke trigger on table "public"."fiscal_unity_computations" from "anon";

revoke truncate on table "public"."fiscal_unity_computations" from "anon";

revoke update on table "public"."fiscal_unity_computations" from "anon";

revoke delete on table "public"."fiscal_unity_computations" from "authenticated";

revoke insert on table "public"."fiscal_unity_computations" from "authenticated";

revoke references on table "public"."fiscal_unity_computations" from "authenticated";

revoke select on table "public"."fiscal_unity_computations" from "authenticated";

revoke trigger on table "public"."fiscal_unity_computations" from "authenticated";

revoke truncate on table "public"."fiscal_unity_computations" from "authenticated";

revoke update on table "public"."fiscal_unity_computations" from "authenticated";

revoke delete on table "public"."fiscal_unity_computations" from "service_role";

revoke insert on table "public"."fiscal_unity_computations" from "service_role";

revoke references on table "public"."fiscal_unity_computations" from "service_role";

revoke select on table "public"."fiscal_unity_computations" from "service_role";

revoke trigger on table "public"."fiscal_unity_computations" from "service_role";

revoke truncate on table "public"."fiscal_unity_computations" from "service_role";

revoke update on table "public"."fiscal_unity_computations" from "service_role";

revoke delete on table "public"."fraud_plan_actions" from "anon";

revoke insert on table "public"."fraud_plan_actions" from "anon";

revoke references on table "public"."fraud_plan_actions" from "anon";

revoke select on table "public"."fraud_plan_actions" from "anon";

revoke trigger on table "public"."fraud_plan_actions" from "anon";

revoke truncate on table "public"."fraud_plan_actions" from "anon";

revoke update on table "public"."fraud_plan_actions" from "anon";

revoke delete on table "public"."fraud_plan_actions" from "authenticated";

revoke insert on table "public"."fraud_plan_actions" from "authenticated";

revoke references on table "public"."fraud_plan_actions" from "authenticated";

revoke select on table "public"."fraud_plan_actions" from "authenticated";

revoke trigger on table "public"."fraud_plan_actions" from "authenticated";

revoke truncate on table "public"."fraud_plan_actions" from "authenticated";

revoke update on table "public"."fraud_plan_actions" from "authenticated";

revoke delete on table "public"."fraud_plan_actions" from "service_role";

revoke insert on table "public"."fraud_plan_actions" from "service_role";

revoke references on table "public"."fraud_plan_actions" from "service_role";

revoke select on table "public"."fraud_plan_actions" from "service_role";

revoke trigger on table "public"."fraud_plan_actions" from "service_role";

revoke truncate on table "public"."fraud_plan_actions" from "service_role";

revoke update on table "public"."fraud_plan_actions" from "service_role";

revoke delete on table "public"."fraud_plans" from "anon";

revoke insert on table "public"."fraud_plans" from "anon";

revoke references on table "public"."fraud_plans" from "anon";

revoke select on table "public"."fraud_plans" from "anon";

revoke trigger on table "public"."fraud_plans" from "anon";

revoke truncate on table "public"."fraud_plans" from "anon";

revoke update on table "public"."fraud_plans" from "anon";

revoke delete on table "public"."fraud_plans" from "authenticated";

revoke insert on table "public"."fraud_plans" from "authenticated";

revoke references on table "public"."fraud_plans" from "authenticated";

revoke select on table "public"."fraud_plans" from "authenticated";

revoke trigger on table "public"."fraud_plans" from "authenticated";

revoke truncate on table "public"."fraud_plans" from "authenticated";

revoke update on table "public"."fraud_plans" from "authenticated";

revoke delete on table "public"."fraud_plans" from "service_role";

revoke insert on table "public"."fraud_plans" from "service_role";

revoke references on table "public"."fraud_plans" from "service_role";

revoke select on table "public"."fraud_plans" from "service_role";

revoke trigger on table "public"."fraud_plans" from "service_role";

revoke truncate on table "public"."fraud_plans" from "service_role";

revoke update on table "public"."fraud_plans" from "service_role";

revoke delete on table "public"."fs_lines" from "anon";

revoke insert on table "public"."fs_lines" from "anon";

revoke references on table "public"."fs_lines" from "anon";

revoke select on table "public"."fs_lines" from "anon";

revoke trigger on table "public"."fs_lines" from "anon";

revoke truncate on table "public"."fs_lines" from "anon";

revoke update on table "public"."fs_lines" from "anon";

revoke delete on table "public"."fs_lines" from "authenticated";

revoke insert on table "public"."fs_lines" from "authenticated";

revoke references on table "public"."fs_lines" from "authenticated";

revoke select on table "public"."fs_lines" from "authenticated";

revoke trigger on table "public"."fs_lines" from "authenticated";

revoke truncate on table "public"."fs_lines" from "authenticated";

revoke update on table "public"."fs_lines" from "authenticated";

revoke delete on table "public"."fs_lines" from "service_role";

revoke insert on table "public"."fs_lines" from "service_role";

revoke references on table "public"."fs_lines" from "service_role";

revoke select on table "public"."fs_lines" from "service_role";

revoke trigger on table "public"."fs_lines" from "service_role";

revoke truncate on table "public"."fs_lines" from "service_role";

revoke update on table "public"."fs_lines" from "service_role";

revoke delete on table "public"."gdrive_change_queue" from "anon";

revoke insert on table "public"."gdrive_change_queue" from "anon";

revoke references on table "public"."gdrive_change_queue" from "anon";

revoke select on table "public"."gdrive_change_queue" from "anon";

revoke trigger on table "public"."gdrive_change_queue" from "anon";

revoke truncate on table "public"."gdrive_change_queue" from "anon";

revoke update on table "public"."gdrive_change_queue" from "anon";

revoke delete on table "public"."gdrive_change_queue" from "authenticated";

revoke insert on table "public"."gdrive_change_queue" from "authenticated";

revoke references on table "public"."gdrive_change_queue" from "authenticated";

revoke select on table "public"."gdrive_change_queue" from "authenticated";

revoke trigger on table "public"."gdrive_change_queue" from "authenticated";

revoke truncate on table "public"."gdrive_change_queue" from "authenticated";

revoke update on table "public"."gdrive_change_queue" from "authenticated";

revoke delete on table "public"."gdrive_change_queue" from "service_role";

revoke insert on table "public"."gdrive_change_queue" from "service_role";

revoke references on table "public"."gdrive_change_queue" from "service_role";

revoke select on table "public"."gdrive_change_queue" from "service_role";

revoke trigger on table "public"."gdrive_change_queue" from "service_role";

revoke truncate on table "public"."gdrive_change_queue" from "service_role";

revoke update on table "public"."gdrive_change_queue" from "service_role";

revoke delete on table "public"."gdrive_connectors" from "anon";

revoke insert on table "public"."gdrive_connectors" from "anon";

revoke references on table "public"."gdrive_connectors" from "anon";

revoke select on table "public"."gdrive_connectors" from "anon";

revoke trigger on table "public"."gdrive_connectors" from "anon";

revoke truncate on table "public"."gdrive_connectors" from "anon";

revoke update on table "public"."gdrive_connectors" from "anon";

revoke delete on table "public"."gdrive_connectors" from "authenticated";

revoke insert on table "public"."gdrive_connectors" from "authenticated";

revoke references on table "public"."gdrive_connectors" from "authenticated";

revoke select on table "public"."gdrive_connectors" from "authenticated";

revoke trigger on table "public"."gdrive_connectors" from "authenticated";

revoke truncate on table "public"."gdrive_connectors" from "authenticated";

revoke update on table "public"."gdrive_connectors" from "authenticated";

revoke delete on table "public"."gdrive_connectors" from "service_role";

revoke insert on table "public"."gdrive_connectors" from "service_role";

revoke references on table "public"."gdrive_connectors" from "service_role";

revoke select on table "public"."gdrive_connectors" from "service_role";

revoke trigger on table "public"."gdrive_connectors" from "service_role";

revoke truncate on table "public"."gdrive_connectors" from "service_role";

revoke update on table "public"."gdrive_connectors" from "service_role";

revoke delete on table "public"."gdrive_documents" from "anon";

revoke insert on table "public"."gdrive_documents" from "anon";

revoke references on table "public"."gdrive_documents" from "anon";

revoke select on table "public"."gdrive_documents" from "anon";

revoke trigger on table "public"."gdrive_documents" from "anon";

revoke truncate on table "public"."gdrive_documents" from "anon";

revoke update on table "public"."gdrive_documents" from "anon";

revoke delete on table "public"."gdrive_documents" from "authenticated";

revoke insert on table "public"."gdrive_documents" from "authenticated";

revoke references on table "public"."gdrive_documents" from "authenticated";

revoke select on table "public"."gdrive_documents" from "authenticated";

revoke trigger on table "public"."gdrive_documents" from "authenticated";

revoke truncate on table "public"."gdrive_documents" from "authenticated";

revoke update on table "public"."gdrive_documents" from "authenticated";

revoke delete on table "public"."gdrive_documents" from "service_role";

revoke insert on table "public"."gdrive_documents" from "service_role";

revoke references on table "public"."gdrive_documents" from "service_role";

revoke select on table "public"."gdrive_documents" from "service_role";

revoke trigger on table "public"."gdrive_documents" from "service_role";

revoke truncate on table "public"."gdrive_documents" from "service_role";

revoke update on table "public"."gdrive_documents" from "service_role";

revoke delete on table "public"."gdrive_file_metadata" from "anon";

revoke insert on table "public"."gdrive_file_metadata" from "anon";

revoke references on table "public"."gdrive_file_metadata" from "anon";

revoke select on table "public"."gdrive_file_metadata" from "anon";

revoke trigger on table "public"."gdrive_file_metadata" from "anon";

revoke truncate on table "public"."gdrive_file_metadata" from "anon";

revoke update on table "public"."gdrive_file_metadata" from "anon";

revoke delete on table "public"."gdrive_file_metadata" from "authenticated";

revoke insert on table "public"."gdrive_file_metadata" from "authenticated";

revoke references on table "public"."gdrive_file_metadata" from "authenticated";

revoke select on table "public"."gdrive_file_metadata" from "authenticated";

revoke trigger on table "public"."gdrive_file_metadata" from "authenticated";

revoke truncate on table "public"."gdrive_file_metadata" from "authenticated";

revoke update on table "public"."gdrive_file_metadata" from "authenticated";

revoke delete on table "public"."gdrive_file_metadata" from "service_role";

revoke insert on table "public"."gdrive_file_metadata" from "service_role";

revoke references on table "public"."gdrive_file_metadata" from "service_role";

revoke select on table "public"."gdrive_file_metadata" from "service_role";

revoke trigger on table "public"."gdrive_file_metadata" from "service_role";

revoke truncate on table "public"."gdrive_file_metadata" from "service_role";

revoke update on table "public"."gdrive_file_metadata" from "service_role";

revoke delete on table "public"."going_concern_worksheets" from "anon";

revoke insert on table "public"."going_concern_worksheets" from "anon";

revoke references on table "public"."going_concern_worksheets" from "anon";

revoke select on table "public"."going_concern_worksheets" from "anon";

revoke trigger on table "public"."going_concern_worksheets" from "anon";

revoke truncate on table "public"."going_concern_worksheets" from "anon";

revoke update on table "public"."going_concern_worksheets" from "anon";

revoke delete on table "public"."going_concern_worksheets" from "authenticated";

revoke insert on table "public"."going_concern_worksheets" from "authenticated";

revoke references on table "public"."going_concern_worksheets" from "authenticated";

revoke select on table "public"."going_concern_worksheets" from "authenticated";

revoke trigger on table "public"."going_concern_worksheets" from "authenticated";

revoke truncate on table "public"."going_concern_worksheets" from "authenticated";

revoke update on table "public"."going_concern_worksheets" from "authenticated";

revoke delete on table "public"."going_concern_worksheets" from "service_role";

revoke insert on table "public"."going_concern_worksheets" from "service_role";

revoke references on table "public"."going_concern_worksheets" from "service_role";

revoke select on table "public"."going_concern_worksheets" from "service_role";

revoke trigger on table "public"."going_concern_worksheets" from "service_role";

revoke truncate on table "public"."going_concern_worksheets" from "service_role";

revoke update on table "public"."going_concern_worksheets" from "service_role";

revoke delete on table "public"."idempotency_keys" from "anon";

revoke insert on table "public"."idempotency_keys" from "anon";

revoke references on table "public"."idempotency_keys" from "anon";

revoke select on table "public"."idempotency_keys" from "anon";

revoke trigger on table "public"."idempotency_keys" from "anon";

revoke truncate on table "public"."idempotency_keys" from "anon";

revoke update on table "public"."idempotency_keys" from "anon";

revoke delete on table "public"."idempotency_keys" from "authenticated";

revoke insert on table "public"."idempotency_keys" from "authenticated";

revoke references on table "public"."idempotency_keys" from "authenticated";

revoke select on table "public"."idempotency_keys" from "authenticated";

revoke trigger on table "public"."idempotency_keys" from "authenticated";

revoke truncate on table "public"."idempotency_keys" from "authenticated";

revoke update on table "public"."idempotency_keys" from "authenticated";

revoke delete on table "public"."idempotency_keys" from "service_role";

revoke insert on table "public"."idempotency_keys" from "service_role";

revoke references on table "public"."idempotency_keys" from "service_role";

revoke select on table "public"."idempotency_keys" from "service_role";

revoke trigger on table "public"."idempotency_keys" from "service_role";

revoke truncate on table "public"."idempotency_keys" from "service_role";

revoke update on table "public"."idempotency_keys" from "service_role";

revoke delete on table "public"."independence_assessments" from "anon";

revoke insert on table "public"."independence_assessments" from "anon";

revoke references on table "public"."independence_assessments" from "anon";

revoke select on table "public"."independence_assessments" from "anon";

revoke trigger on table "public"."independence_assessments" from "anon";

revoke truncate on table "public"."independence_assessments" from "anon";

revoke update on table "public"."independence_assessments" from "anon";

revoke delete on table "public"."independence_assessments" from "authenticated";

revoke insert on table "public"."independence_assessments" from "authenticated";

revoke references on table "public"."independence_assessments" from "authenticated";

revoke select on table "public"."independence_assessments" from "authenticated";

revoke trigger on table "public"."independence_assessments" from "authenticated";

revoke truncate on table "public"."independence_assessments" from "authenticated";

revoke update on table "public"."independence_assessments" from "authenticated";

revoke delete on table "public"."independence_assessments" from "service_role";

revoke insert on table "public"."independence_assessments" from "service_role";

revoke references on table "public"."independence_assessments" from "service_role";

revoke select on table "public"."independence_assessments" from "service_role";

revoke trigger on table "public"."independence_assessments" from "service_role";

revoke truncate on table "public"."independence_assessments" from "service_role";

revoke update on table "public"."independence_assessments" from "service_role";

revoke delete on table "public"."interest_limitation_computations" from "anon";

revoke insert on table "public"."interest_limitation_computations" from "anon";

revoke references on table "public"."interest_limitation_computations" from "anon";

revoke select on table "public"."interest_limitation_computations" from "anon";

revoke trigger on table "public"."interest_limitation_computations" from "anon";

revoke truncate on table "public"."interest_limitation_computations" from "anon";

revoke update on table "public"."interest_limitation_computations" from "anon";

revoke delete on table "public"."interest_limitation_computations" from "authenticated";

revoke insert on table "public"."interest_limitation_computations" from "authenticated";

revoke references on table "public"."interest_limitation_computations" from "authenticated";

revoke select on table "public"."interest_limitation_computations" from "authenticated";

revoke trigger on table "public"."interest_limitation_computations" from "authenticated";

revoke truncate on table "public"."interest_limitation_computations" from "authenticated";

revoke update on table "public"."interest_limitation_computations" from "authenticated";

revoke delete on table "public"."interest_limitation_computations" from "service_role";

revoke insert on table "public"."interest_limitation_computations" from "service_role";

revoke references on table "public"."interest_limitation_computations" from "service_role";

revoke select on table "public"."interest_limitation_computations" from "service_role";

revoke trigger on table "public"."interest_limitation_computations" from "service_role";

revoke truncate on table "public"."interest_limitation_computations" from "service_role";

revoke update on table "public"."interest_limitation_computations" from "service_role";

revoke delete on table "public"."itgc_groups" from "anon";

revoke insert on table "public"."itgc_groups" from "anon";

revoke references on table "public"."itgc_groups" from "anon";

revoke select on table "public"."itgc_groups" from "anon";

revoke trigger on table "public"."itgc_groups" from "anon";

revoke truncate on table "public"."itgc_groups" from "anon";

revoke update on table "public"."itgc_groups" from "anon";

revoke delete on table "public"."itgc_groups" from "authenticated";

revoke insert on table "public"."itgc_groups" from "authenticated";

revoke references on table "public"."itgc_groups" from "authenticated";

revoke select on table "public"."itgc_groups" from "authenticated";

revoke trigger on table "public"."itgc_groups" from "authenticated";

revoke truncate on table "public"."itgc_groups" from "authenticated";

revoke update on table "public"."itgc_groups" from "authenticated";

revoke delete on table "public"."itgc_groups" from "service_role";

revoke insert on table "public"."itgc_groups" from "service_role";

revoke references on table "public"."itgc_groups" from "service_role";

revoke select on table "public"."itgc_groups" from "service_role";

revoke trigger on table "public"."itgc_groups" from "service_role";

revoke truncate on table "public"."itgc_groups" from "service_role";

revoke update on table "public"."itgc_groups" from "service_role";

revoke delete on table "public"."je_control_alerts" from "anon";

revoke insert on table "public"."je_control_alerts" from "anon";

revoke references on table "public"."je_control_alerts" from "anon";

revoke select on table "public"."je_control_alerts" from "anon";

revoke trigger on table "public"."je_control_alerts" from "anon";

revoke truncate on table "public"."je_control_alerts" from "anon";

revoke update on table "public"."je_control_alerts" from "anon";

revoke delete on table "public"."je_control_alerts" from "authenticated";

revoke insert on table "public"."je_control_alerts" from "authenticated";

revoke references on table "public"."je_control_alerts" from "authenticated";

revoke select on table "public"."je_control_alerts" from "authenticated";

revoke trigger on table "public"."je_control_alerts" from "authenticated";

revoke truncate on table "public"."je_control_alerts" from "authenticated";

revoke update on table "public"."je_control_alerts" from "authenticated";

revoke delete on table "public"."je_control_alerts" from "service_role";

revoke insert on table "public"."je_control_alerts" from "service_role";

revoke references on table "public"."je_control_alerts" from "service_role";

revoke select on table "public"."je_control_alerts" from "service_role";

revoke trigger on table "public"."je_control_alerts" from "service_role";

revoke truncate on table "public"."je_control_alerts" from "service_role";

revoke update on table "public"."je_control_alerts" from "service_role";

revoke delete on table "public"."job_schedules" from "anon";

revoke insert on table "public"."job_schedules" from "anon";

revoke references on table "public"."job_schedules" from "anon";

revoke select on table "public"."job_schedules" from "anon";

revoke trigger on table "public"."job_schedules" from "anon";

revoke truncate on table "public"."job_schedules" from "anon";

revoke update on table "public"."job_schedules" from "anon";

revoke delete on table "public"."job_schedules" from "authenticated";

revoke insert on table "public"."job_schedules" from "authenticated";

revoke references on table "public"."job_schedules" from "authenticated";

revoke select on table "public"."job_schedules" from "authenticated";

revoke trigger on table "public"."job_schedules" from "authenticated";

revoke truncate on table "public"."job_schedules" from "authenticated";

revoke update on table "public"."job_schedules" from "authenticated";

revoke delete on table "public"."job_schedules" from "service_role";

revoke insert on table "public"."job_schedules" from "service_role";

revoke references on table "public"."job_schedules" from "service_role";

revoke select on table "public"."job_schedules" from "service_role";

revoke trigger on table "public"."job_schedules" from "service_role";

revoke truncate on table "public"."job_schedules" from "service_role";

revoke update on table "public"."job_schedules" from "service_role";

revoke delete on table "public"."jobs" from "anon";

revoke insert on table "public"."jobs" from "anon";

revoke references on table "public"."jobs" from "anon";

revoke select on table "public"."jobs" from "anon";

revoke trigger on table "public"."jobs" from "anon";

revoke truncate on table "public"."jobs" from "anon";

revoke update on table "public"."jobs" from "anon";

revoke delete on table "public"."jobs" from "authenticated";

revoke insert on table "public"."jobs" from "authenticated";

revoke references on table "public"."jobs" from "authenticated";

revoke select on table "public"."jobs" from "authenticated";

revoke trigger on table "public"."jobs" from "authenticated";

revoke truncate on table "public"."jobs" from "authenticated";

revoke update on table "public"."jobs" from "authenticated";

revoke delete on table "public"."jobs" from "service_role";

revoke insert on table "public"."jobs" from "service_role";

revoke references on table "public"."jobs" from "service_role";

revoke select on table "public"."jobs" from "service_role";

revoke trigger on table "public"."jobs" from "service_role";

revoke truncate on table "public"."jobs" from "service_role";

revoke update on table "public"."jobs" from "service_role";

revoke delete on table "public"."journal_batches" from "anon";

revoke insert on table "public"."journal_batches" from "anon";

revoke references on table "public"."journal_batches" from "anon";

revoke select on table "public"."journal_batches" from "anon";

revoke trigger on table "public"."journal_batches" from "anon";

revoke truncate on table "public"."journal_batches" from "anon";

revoke update on table "public"."journal_batches" from "anon";

revoke delete on table "public"."journal_batches" from "authenticated";

revoke insert on table "public"."journal_batches" from "authenticated";

revoke references on table "public"."journal_batches" from "authenticated";

revoke select on table "public"."journal_batches" from "authenticated";

revoke trigger on table "public"."journal_batches" from "authenticated";

revoke truncate on table "public"."journal_batches" from "authenticated";

revoke update on table "public"."journal_batches" from "authenticated";

revoke delete on table "public"."journal_batches" from "service_role";

revoke insert on table "public"."journal_batches" from "service_role";

revoke references on table "public"."journal_batches" from "service_role";

revoke select on table "public"."journal_batches" from "service_role";

revoke trigger on table "public"."journal_batches" from "service_role";

revoke truncate on table "public"."journal_batches" from "service_role";

revoke update on table "public"."journal_batches" from "service_role";

revoke delete on table "public"."journal_entry_strategies" from "anon";

revoke insert on table "public"."journal_entry_strategies" from "anon";

revoke references on table "public"."journal_entry_strategies" from "anon";

revoke select on table "public"."journal_entry_strategies" from "anon";

revoke trigger on table "public"."journal_entry_strategies" from "anon";

revoke truncate on table "public"."journal_entry_strategies" from "anon";

revoke update on table "public"."journal_entry_strategies" from "anon";

revoke delete on table "public"."journal_entry_strategies" from "authenticated";

revoke insert on table "public"."journal_entry_strategies" from "authenticated";

revoke references on table "public"."journal_entry_strategies" from "authenticated";

revoke select on table "public"."journal_entry_strategies" from "authenticated";

revoke trigger on table "public"."journal_entry_strategies" from "authenticated";

revoke truncate on table "public"."journal_entry_strategies" from "authenticated";

revoke update on table "public"."journal_entry_strategies" from "authenticated";

revoke delete on table "public"."journal_entry_strategies" from "service_role";

revoke insert on table "public"."journal_entry_strategies" from "service_role";

revoke references on table "public"."journal_entry_strategies" from "service_role";

revoke select on table "public"."journal_entry_strategies" from "service_role";

revoke trigger on table "public"."journal_entry_strategies" from "service_role";

revoke truncate on table "public"."journal_entry_strategies" from "service_role";

revoke update on table "public"."journal_entry_strategies" from "service_role";

revoke delete on table "public"."kam_candidates" from "anon";

revoke insert on table "public"."kam_candidates" from "anon";

revoke references on table "public"."kam_candidates" from "anon";

revoke select on table "public"."kam_candidates" from "anon";

revoke trigger on table "public"."kam_candidates" from "anon";

revoke truncate on table "public"."kam_candidates" from "anon";

revoke update on table "public"."kam_candidates" from "anon";

revoke delete on table "public"."kam_candidates" from "authenticated";

revoke insert on table "public"."kam_candidates" from "authenticated";

revoke references on table "public"."kam_candidates" from "authenticated";

revoke select on table "public"."kam_candidates" from "authenticated";

revoke trigger on table "public"."kam_candidates" from "authenticated";

revoke truncate on table "public"."kam_candidates" from "authenticated";

revoke update on table "public"."kam_candidates" from "authenticated";

revoke delete on table "public"."kam_candidates" from "service_role";

revoke insert on table "public"."kam_candidates" from "service_role";

revoke references on table "public"."kam_candidates" from "service_role";

revoke select on table "public"."kam_candidates" from "service_role";

revoke trigger on table "public"."kam_candidates" from "service_role";

revoke truncate on table "public"."kam_candidates" from "service_role";

revoke update on table "public"."kam_candidates" from "service_role";

revoke delete on table "public"."kam_drafts" from "anon";

revoke insert on table "public"."kam_drafts" from "anon";

revoke references on table "public"."kam_drafts" from "anon";

revoke select on table "public"."kam_drafts" from "anon";

revoke trigger on table "public"."kam_drafts" from "anon";

revoke truncate on table "public"."kam_drafts" from "anon";

revoke update on table "public"."kam_drafts" from "anon";

revoke delete on table "public"."kam_drafts" from "authenticated";

revoke insert on table "public"."kam_drafts" from "authenticated";

revoke references on table "public"."kam_drafts" from "authenticated";

revoke select on table "public"."kam_drafts" from "authenticated";

revoke trigger on table "public"."kam_drafts" from "authenticated";

revoke truncate on table "public"."kam_drafts" from "authenticated";

revoke update on table "public"."kam_drafts" from "authenticated";

revoke delete on table "public"."kam_drafts" from "service_role";

revoke insert on table "public"."kam_drafts" from "service_role";

revoke references on table "public"."kam_drafts" from "service_role";

revoke select on table "public"."kam_drafts" from "service_role";

revoke trigger on table "public"."kam_drafts" from "service_role";

revoke truncate on table "public"."kam_drafts" from "service_role";

revoke update on table "public"."kam_drafts" from "service_role";

revoke delete on table "public"."learning_metrics" from "anon";

revoke insert on table "public"."learning_metrics" from "anon";

revoke references on table "public"."learning_metrics" from "anon";

revoke select on table "public"."learning_metrics" from "anon";

revoke trigger on table "public"."learning_metrics" from "anon";

revoke truncate on table "public"."learning_metrics" from "anon";

revoke update on table "public"."learning_metrics" from "anon";

revoke delete on table "public"."learning_metrics" from "authenticated";

revoke insert on table "public"."learning_metrics" from "authenticated";

revoke references on table "public"."learning_metrics" from "authenticated";

revoke select on table "public"."learning_metrics" from "authenticated";

revoke trigger on table "public"."learning_metrics" from "authenticated";

revoke truncate on table "public"."learning_metrics" from "authenticated";

revoke update on table "public"."learning_metrics" from "authenticated";

revoke delete on table "public"."learning_metrics" from "service_role";

revoke insert on table "public"."learning_metrics" from "service_role";

revoke references on table "public"."learning_metrics" from "service_role";

revoke select on table "public"."learning_metrics" from "service_role";

revoke trigger on table "public"."learning_metrics" from "service_role";

revoke truncate on table "public"."learning_metrics" from "service_role";

revoke update on table "public"."learning_metrics" from "service_role";

revoke delete on table "public"."learning_signals" from "anon";

revoke insert on table "public"."learning_signals" from "anon";

revoke references on table "public"."learning_signals" from "anon";

revoke select on table "public"."learning_signals" from "anon";

revoke trigger on table "public"."learning_signals" from "anon";

revoke truncate on table "public"."learning_signals" from "anon";

revoke update on table "public"."learning_signals" from "anon";

revoke delete on table "public"."learning_signals" from "authenticated";

revoke insert on table "public"."learning_signals" from "authenticated";

revoke references on table "public"."learning_signals" from "authenticated";

revoke select on table "public"."learning_signals" from "authenticated";

revoke trigger on table "public"."learning_signals" from "authenticated";

revoke truncate on table "public"."learning_signals" from "authenticated";

revoke update on table "public"."learning_signals" from "authenticated";

revoke delete on table "public"."learning_signals" from "service_role";

revoke insert on table "public"."learning_signals" from "service_role";

revoke references on table "public"."learning_signals" from "service_role";

revoke select on table "public"."learning_signals" from "service_role";

revoke trigger on table "public"."learning_signals" from "service_role";

revoke truncate on table "public"."learning_signals" from "service_role";

revoke update on table "public"."learning_signals" from "service_role";

revoke delete on table "public"."ledger_accounts" from "anon";

revoke insert on table "public"."ledger_accounts" from "anon";

revoke references on table "public"."ledger_accounts" from "anon";

revoke select on table "public"."ledger_accounts" from "anon";

revoke trigger on table "public"."ledger_accounts" from "anon";

revoke truncate on table "public"."ledger_accounts" from "anon";

revoke update on table "public"."ledger_accounts" from "anon";

revoke delete on table "public"."ledger_accounts" from "authenticated";

revoke insert on table "public"."ledger_accounts" from "authenticated";

revoke references on table "public"."ledger_accounts" from "authenticated";

revoke select on table "public"."ledger_accounts" from "authenticated";

revoke trigger on table "public"."ledger_accounts" from "authenticated";

revoke truncate on table "public"."ledger_accounts" from "authenticated";

revoke update on table "public"."ledger_accounts" from "authenticated";

revoke delete on table "public"."ledger_accounts" from "service_role";

revoke insert on table "public"."ledger_accounts" from "service_role";

revoke references on table "public"."ledger_accounts" from "service_role";

revoke select on table "public"."ledger_accounts" from "service_role";

revoke trigger on table "public"."ledger_accounts" from "service_role";

revoke truncate on table "public"."ledger_accounts" from "service_role";

revoke update on table "public"."ledger_accounts" from "service_role";

revoke delete on table "public"."ledger_entries" from "anon";

revoke insert on table "public"."ledger_entries" from "anon";

revoke references on table "public"."ledger_entries" from "anon";

revoke select on table "public"."ledger_entries" from "anon";

revoke trigger on table "public"."ledger_entries" from "anon";

revoke truncate on table "public"."ledger_entries" from "anon";

revoke update on table "public"."ledger_entries" from "anon";

revoke delete on table "public"."ledger_entries" from "authenticated";

revoke insert on table "public"."ledger_entries" from "authenticated";

revoke references on table "public"."ledger_entries" from "authenticated";

revoke select on table "public"."ledger_entries" from "authenticated";

revoke trigger on table "public"."ledger_entries" from "authenticated";

revoke truncate on table "public"."ledger_entries" from "authenticated";

revoke update on table "public"."ledger_entries" from "authenticated";

revoke delete on table "public"."ledger_entries" from "service_role";

revoke insert on table "public"."ledger_entries" from "service_role";

revoke references on table "public"."ledger_entries" from "service_role";

revoke select on table "public"."ledger_entries" from "service_role";

revoke trigger on table "public"."ledger_entries" from "service_role";

revoke truncate on table "public"."ledger_entries" from "service_role";

revoke update on table "public"."ledger_entries" from "service_role";

revoke delete on table "public"."nid_computations" from "anon";

revoke insert on table "public"."nid_computations" from "anon";

revoke references on table "public"."nid_computations" from "anon";

revoke select on table "public"."nid_computations" from "anon";

revoke trigger on table "public"."nid_computations" from "anon";

revoke truncate on table "public"."nid_computations" from "anon";

revoke update on table "public"."nid_computations" from "anon";

revoke delete on table "public"."nid_computations" from "authenticated";

revoke insert on table "public"."nid_computations" from "authenticated";

revoke references on table "public"."nid_computations" from "authenticated";

revoke select on table "public"."nid_computations" from "authenticated";

revoke trigger on table "public"."nid_computations" from "authenticated";

revoke truncate on table "public"."nid_computations" from "authenticated";

revoke update on table "public"."nid_computations" from "authenticated";

revoke delete on table "public"."nid_computations" from "service_role";

revoke insert on table "public"."nid_computations" from "service_role";

revoke references on table "public"."nid_computations" from "service_role";

revoke select on table "public"."nid_computations" from "service_role";

revoke trigger on table "public"."nid_computations" from "service_role";

revoke truncate on table "public"."nid_computations" from "service_role";

revoke update on table "public"."nid_computations" from "service_role";

revoke delete on table "public"."nps_responses" from "anon";

revoke insert on table "public"."nps_responses" from "anon";

revoke references on table "public"."nps_responses" from "anon";

revoke select on table "public"."nps_responses" from "anon";

revoke trigger on table "public"."nps_responses" from "anon";

revoke truncate on table "public"."nps_responses" from "anon";

revoke update on table "public"."nps_responses" from "anon";

revoke delete on table "public"."nps_responses" from "authenticated";

revoke insert on table "public"."nps_responses" from "authenticated";

revoke references on table "public"."nps_responses" from "authenticated";

revoke select on table "public"."nps_responses" from "authenticated";

revoke trigger on table "public"."nps_responses" from "authenticated";

revoke truncate on table "public"."nps_responses" from "authenticated";

revoke update on table "public"."nps_responses" from "authenticated";

revoke delete on table "public"."nps_responses" from "service_role";

revoke insert on table "public"."nps_responses" from "service_role";

revoke references on table "public"."nps_responses" from "service_role";

revoke select on table "public"."nps_responses" from "service_role";

revoke trigger on table "public"."nps_responses" from "service_role";

revoke truncate on table "public"."nps_responses" from "service_role";

revoke update on table "public"."nps_responses" from "service_role";

revoke delete on table "public"."onboarding_checklist_items" from "anon";

revoke insert on table "public"."onboarding_checklist_items" from "anon";

revoke references on table "public"."onboarding_checklist_items" from "anon";

revoke select on table "public"."onboarding_checklist_items" from "anon";

revoke trigger on table "public"."onboarding_checklist_items" from "anon";

revoke truncate on table "public"."onboarding_checklist_items" from "anon";

revoke update on table "public"."onboarding_checklist_items" from "anon";

revoke delete on table "public"."onboarding_checklist_items" from "authenticated";

revoke insert on table "public"."onboarding_checklist_items" from "authenticated";

revoke references on table "public"."onboarding_checklist_items" from "authenticated";

revoke select on table "public"."onboarding_checklist_items" from "authenticated";

revoke trigger on table "public"."onboarding_checklist_items" from "authenticated";

revoke truncate on table "public"."onboarding_checklist_items" from "authenticated";

revoke update on table "public"."onboarding_checklist_items" from "authenticated";

revoke delete on table "public"."onboarding_checklist_items" from "service_role";

revoke insert on table "public"."onboarding_checklist_items" from "service_role";

revoke references on table "public"."onboarding_checklist_items" from "service_role";

revoke select on table "public"."onboarding_checklist_items" from "service_role";

revoke trigger on table "public"."onboarding_checklist_items" from "service_role";

revoke truncate on table "public"."onboarding_checklist_items" from "service_role";

revoke update on table "public"."onboarding_checklist_items" from "service_role";

revoke delete on table "public"."onboarding_checklists" from "anon";

revoke insert on table "public"."onboarding_checklists" from "anon";

revoke references on table "public"."onboarding_checklists" from "anon";

revoke select on table "public"."onboarding_checklists" from "anon";

revoke trigger on table "public"."onboarding_checklists" from "anon";

revoke truncate on table "public"."onboarding_checklists" from "anon";

revoke update on table "public"."onboarding_checklists" from "anon";

revoke delete on table "public"."onboarding_checklists" from "authenticated";

revoke insert on table "public"."onboarding_checklists" from "authenticated";

revoke references on table "public"."onboarding_checklists" from "authenticated";

revoke select on table "public"."onboarding_checklists" from "authenticated";

revoke trigger on table "public"."onboarding_checklists" from "authenticated";

revoke truncate on table "public"."onboarding_checklists" from "authenticated";

revoke update on table "public"."onboarding_checklists" from "authenticated";

revoke delete on table "public"."onboarding_checklists" from "service_role";

revoke insert on table "public"."onboarding_checklists" from "service_role";

revoke references on table "public"."onboarding_checklists" from "service_role";

revoke select on table "public"."onboarding_checklists" from "service_role";

revoke trigger on table "public"."onboarding_checklists" from "service_role";

revoke truncate on table "public"."onboarding_checklists" from "service_role";

revoke update on table "public"."onboarding_checklists" from "service_role";

revoke delete on table "public"."openai_debug_events" from "anon";

revoke insert on table "public"."openai_debug_events" from "anon";

revoke references on table "public"."openai_debug_events" from "anon";

revoke select on table "public"."openai_debug_events" from "anon";

revoke trigger on table "public"."openai_debug_events" from "anon";

revoke truncate on table "public"."openai_debug_events" from "anon";

revoke update on table "public"."openai_debug_events" from "anon";

revoke delete on table "public"."openai_debug_events" from "authenticated";

revoke insert on table "public"."openai_debug_events" from "authenticated";

revoke references on table "public"."openai_debug_events" from "authenticated";

revoke select on table "public"."openai_debug_events" from "authenticated";

revoke trigger on table "public"."openai_debug_events" from "authenticated";

revoke truncate on table "public"."openai_debug_events" from "authenticated";

revoke update on table "public"."openai_debug_events" from "authenticated";

revoke delete on table "public"."openai_debug_events" from "service_role";

revoke insert on table "public"."openai_debug_events" from "service_role";

revoke references on table "public"."openai_debug_events" from "service_role";

revoke select on table "public"."openai_debug_events" from "service_role";

revoke trigger on table "public"."openai_debug_events" from "service_role";

revoke truncate on table "public"."openai_debug_events" from "service_role";

revoke update on table "public"."openai_debug_events" from "service_role";

revoke delete on table "public"."participation_exemptions" from "anon";

revoke insert on table "public"."participation_exemptions" from "anon";

revoke references on table "public"."participation_exemptions" from "anon";

revoke select on table "public"."participation_exemptions" from "anon";

revoke trigger on table "public"."participation_exemptions" from "anon";

revoke truncate on table "public"."participation_exemptions" from "anon";

revoke update on table "public"."participation_exemptions" from "anon";

revoke delete on table "public"."participation_exemptions" from "authenticated";

revoke insert on table "public"."participation_exemptions" from "authenticated";

revoke references on table "public"."participation_exemptions" from "authenticated";

revoke select on table "public"."participation_exemptions" from "authenticated";

revoke trigger on table "public"."participation_exemptions" from "authenticated";

revoke truncate on table "public"."participation_exemptions" from "authenticated";

revoke update on table "public"."participation_exemptions" from "authenticated";

revoke delete on table "public"."participation_exemptions" from "service_role";

revoke insert on table "public"."participation_exemptions" from "service_role";

revoke references on table "public"."participation_exemptions" from "service_role";

revoke select on table "public"."participation_exemptions" from "service_role";

revoke trigger on table "public"."participation_exemptions" from "service_role";

revoke truncate on table "public"."participation_exemptions" from "service_role";

revoke update on table "public"."participation_exemptions" from "service_role";

revoke delete on table "public"."patent_box_computations" from "anon";

revoke insert on table "public"."patent_box_computations" from "anon";

revoke references on table "public"."patent_box_computations" from "anon";

revoke select on table "public"."patent_box_computations" from "anon";

revoke trigger on table "public"."patent_box_computations" from "anon";

revoke truncate on table "public"."patent_box_computations" from "anon";

revoke update on table "public"."patent_box_computations" from "anon";

revoke delete on table "public"."patent_box_computations" from "authenticated";

revoke insert on table "public"."patent_box_computations" from "authenticated";

revoke references on table "public"."patent_box_computations" from "authenticated";

revoke select on table "public"."patent_box_computations" from "authenticated";

revoke trigger on table "public"."patent_box_computations" from "authenticated";

revoke truncate on table "public"."patent_box_computations" from "authenticated";

revoke update on table "public"."patent_box_computations" from "authenticated";

revoke delete on table "public"."patent_box_computations" from "service_role";

revoke insert on table "public"."patent_box_computations" from "service_role";

revoke references on table "public"."patent_box_computations" from "service_role";

revoke select on table "public"."patent_box_computations" from "service_role";

revoke trigger on table "public"."patent_box_computations" from "service_role";

revoke truncate on table "public"."patent_box_computations" from "service_role";

revoke update on table "public"."patent_box_computations" from "service_role";

revoke delete on table "public"."pillar_two_computations" from "anon";

revoke insert on table "public"."pillar_two_computations" from "anon";

revoke references on table "public"."pillar_two_computations" from "anon";

revoke select on table "public"."pillar_two_computations" from "anon";

revoke trigger on table "public"."pillar_two_computations" from "anon";

revoke truncate on table "public"."pillar_two_computations" from "anon";

revoke update on table "public"."pillar_two_computations" from "anon";

revoke delete on table "public"."pillar_two_computations" from "authenticated";

revoke insert on table "public"."pillar_two_computations" from "authenticated";

revoke references on table "public"."pillar_two_computations" from "authenticated";

revoke select on table "public"."pillar_two_computations" from "authenticated";

revoke trigger on table "public"."pillar_two_computations" from "authenticated";

revoke truncate on table "public"."pillar_two_computations" from "authenticated";

revoke update on table "public"."pillar_two_computations" from "authenticated";

revoke delete on table "public"."pillar_two_computations" from "service_role";

revoke insert on table "public"."pillar_two_computations" from "service_role";

revoke references on table "public"."pillar_two_computations" from "service_role";

revoke select on table "public"."pillar_two_computations" from "service_role";

revoke trigger on table "public"."pillar_two_computations" from "service_role";

revoke truncate on table "public"."pillar_two_computations" from "service_role";

revoke update on table "public"."pillar_two_computations" from "service_role";

revoke delete on table "public"."plan_change_log" from "anon";

revoke insert on table "public"."plan_change_log" from "anon";

revoke references on table "public"."plan_change_log" from "anon";

revoke select on table "public"."plan_change_log" from "anon";

revoke trigger on table "public"."plan_change_log" from "anon";

revoke truncate on table "public"."plan_change_log" from "anon";

revoke update on table "public"."plan_change_log" from "anon";

revoke delete on table "public"."plan_change_log" from "authenticated";

revoke insert on table "public"."plan_change_log" from "authenticated";

revoke references on table "public"."plan_change_log" from "authenticated";

revoke select on table "public"."plan_change_log" from "authenticated";

revoke trigger on table "public"."plan_change_log" from "authenticated";

revoke truncate on table "public"."plan_change_log" from "authenticated";

revoke update on table "public"."plan_change_log" from "authenticated";

revoke delete on table "public"."plan_change_log" from "service_role";

revoke insert on table "public"."plan_change_log" from "service_role";

revoke references on table "public"."plan_change_log" from "service_role";

revoke select on table "public"."plan_change_log" from "service_role";

revoke trigger on table "public"."plan_change_log" from "service_role";

revoke truncate on table "public"."plan_change_log" from "service_role";

revoke update on table "public"."plan_change_log" from "service_role";

revoke delete on table "public"."query_hints" from "anon";

revoke insert on table "public"."query_hints" from "anon";

revoke references on table "public"."query_hints" from "anon";

revoke select on table "public"."query_hints" from "anon";

revoke trigger on table "public"."query_hints" from "anon";

revoke truncate on table "public"."query_hints" from "anon";

revoke update on table "public"."query_hints" from "anon";

revoke delete on table "public"."query_hints" from "authenticated";

revoke insert on table "public"."query_hints" from "authenticated";

revoke references on table "public"."query_hints" from "authenticated";

revoke select on table "public"."query_hints" from "authenticated";

revoke trigger on table "public"."query_hints" from "authenticated";

revoke truncate on table "public"."query_hints" from "authenticated";

revoke update on table "public"."query_hints" from "authenticated";

revoke delete on table "public"."query_hints" from "service_role";

revoke insert on table "public"."query_hints" from "service_role";

revoke references on table "public"."query_hints" from "service_role";

revoke select on table "public"."query_hints" from "service_role";

revoke trigger on table "public"."query_hints" from "service_role";

revoke truncate on table "public"."query_hints" from "service_role";

revoke update on table "public"."query_hints" from "service_role";

revoke delete on table "public"."rate_limits" from "anon";

revoke insert on table "public"."rate_limits" from "anon";

revoke references on table "public"."rate_limits" from "anon";

revoke select on table "public"."rate_limits" from "anon";

revoke trigger on table "public"."rate_limits" from "anon";

revoke truncate on table "public"."rate_limits" from "anon";

revoke update on table "public"."rate_limits" from "anon";

revoke delete on table "public"."rate_limits" from "authenticated";

revoke insert on table "public"."rate_limits" from "authenticated";

revoke references on table "public"."rate_limits" from "authenticated";

revoke select on table "public"."rate_limits" from "authenticated";

revoke trigger on table "public"."rate_limits" from "authenticated";

revoke truncate on table "public"."rate_limits" from "authenticated";

revoke update on table "public"."rate_limits" from "authenticated";

revoke delete on table "public"."rate_limits" from "service_role";

revoke insert on table "public"."rate_limits" from "service_role";

revoke references on table "public"."rate_limits" from "service_role";

revoke select on table "public"."rate_limits" from "service_role";

revoke trigger on table "public"."rate_limits" from "service_role";

revoke truncate on table "public"."rate_limits" from "service_role";

revoke update on table "public"."rate_limits" from "service_role";

revoke delete on table "public"."reconciliation_items" from "anon";

revoke insert on table "public"."reconciliation_items" from "anon";

revoke references on table "public"."reconciliation_items" from "anon";

revoke select on table "public"."reconciliation_items" from "anon";

revoke trigger on table "public"."reconciliation_items" from "anon";

revoke truncate on table "public"."reconciliation_items" from "anon";

revoke update on table "public"."reconciliation_items" from "anon";

revoke delete on table "public"."reconciliation_items" from "authenticated";

revoke insert on table "public"."reconciliation_items" from "authenticated";

revoke references on table "public"."reconciliation_items" from "authenticated";

revoke select on table "public"."reconciliation_items" from "authenticated";

revoke trigger on table "public"."reconciliation_items" from "authenticated";

revoke truncate on table "public"."reconciliation_items" from "authenticated";

revoke update on table "public"."reconciliation_items" from "authenticated";

revoke delete on table "public"."reconciliation_items" from "service_role";

revoke insert on table "public"."reconciliation_items" from "service_role";

revoke references on table "public"."reconciliation_items" from "service_role";

revoke select on table "public"."reconciliation_items" from "service_role";

revoke trigger on table "public"."reconciliation_items" from "service_role";

revoke truncate on table "public"."reconciliation_items" from "service_role";

revoke update on table "public"."reconciliation_items" from "service_role";

revoke delete on table "public"."reconciliations" from "anon";

revoke insert on table "public"."reconciliations" from "anon";

revoke references on table "public"."reconciliations" from "anon";

revoke select on table "public"."reconciliations" from "anon";

revoke trigger on table "public"."reconciliations" from "anon";

revoke truncate on table "public"."reconciliations" from "anon";

revoke update on table "public"."reconciliations" from "anon";

revoke delete on table "public"."reconciliations" from "authenticated";

revoke insert on table "public"."reconciliations" from "authenticated";

revoke references on table "public"."reconciliations" from "authenticated";

revoke select on table "public"."reconciliations" from "authenticated";

revoke trigger on table "public"."reconciliations" from "authenticated";

revoke truncate on table "public"."reconciliations" from "authenticated";

revoke update on table "public"."reconciliations" from "authenticated";

revoke delete on table "public"."reconciliations" from "service_role";

revoke insert on table "public"."reconciliations" from "service_role";

revoke references on table "public"."reconciliations" from "service_role";

revoke select on table "public"."reconciliations" from "service_role";

revoke trigger on table "public"."reconciliations" from "service_role";

revoke truncate on table "public"."reconciliations" from "service_role";

revoke update on table "public"."reconciliations" from "service_role";

revoke delete on table "public"."return_files" from "anon";

revoke insert on table "public"."return_files" from "anon";

revoke references on table "public"."return_files" from "anon";

revoke select on table "public"."return_files" from "anon";

revoke trigger on table "public"."return_files" from "anon";

revoke truncate on table "public"."return_files" from "anon";

revoke update on table "public"."return_files" from "anon";

revoke delete on table "public"."return_files" from "authenticated";

revoke insert on table "public"."return_files" from "authenticated";

revoke references on table "public"."return_files" from "authenticated";

revoke select on table "public"."return_files" from "authenticated";

revoke trigger on table "public"."return_files" from "authenticated";

revoke truncate on table "public"."return_files" from "authenticated";

revoke update on table "public"."return_files" from "authenticated";

revoke delete on table "public"."return_files" from "service_role";

revoke insert on table "public"."return_files" from "service_role";

revoke references on table "public"."return_files" from "service_role";

revoke select on table "public"."return_files" from "service_role";

revoke trigger on table "public"."return_files" from "service_role";

revoke truncate on table "public"."return_files" from "service_role";

revoke update on table "public"."return_files" from "service_role";

revoke delete on table "public"."system_settings" from "anon";

revoke insert on table "public"."system_settings" from "anon";

revoke references on table "public"."system_settings" from "anon";

revoke select on table "public"."system_settings" from "anon";

revoke trigger on table "public"."system_settings" from "anon";

revoke truncate on table "public"."system_settings" from "anon";

revoke update on table "public"."system_settings" from "anon";

revoke delete on table "public"."system_settings" from "authenticated";

revoke insert on table "public"."system_settings" from "authenticated";

revoke references on table "public"."system_settings" from "authenticated";

revoke select on table "public"."system_settings" from "authenticated";

revoke trigger on table "public"."system_settings" from "authenticated";

revoke truncate on table "public"."system_settings" from "authenticated";

revoke update on table "public"."system_settings" from "authenticated";

revoke delete on table "public"."system_settings" from "service_role";

revoke insert on table "public"."system_settings" from "service_role";

revoke references on table "public"."system_settings" from "service_role";

revoke select on table "public"."system_settings" from "service_role";

revoke trigger on table "public"."system_settings" from "service_role";

revoke truncate on table "public"."system_settings" from "service_role";

revoke update on table "public"."system_settings" from "service_role";

revoke delete on table "public"."task_attachments" from "anon";

revoke insert on table "public"."task_attachments" from "anon";

revoke references on table "public"."task_attachments" from "anon";

revoke select on table "public"."task_attachments" from "anon";

revoke trigger on table "public"."task_attachments" from "anon";

revoke truncate on table "public"."task_attachments" from "anon";

revoke update on table "public"."task_attachments" from "anon";

revoke delete on table "public"."task_attachments" from "authenticated";

revoke insert on table "public"."task_attachments" from "authenticated";

revoke references on table "public"."task_attachments" from "authenticated";

revoke select on table "public"."task_attachments" from "authenticated";

revoke trigger on table "public"."task_attachments" from "authenticated";

revoke truncate on table "public"."task_attachments" from "authenticated";

revoke update on table "public"."task_attachments" from "authenticated";

revoke delete on table "public"."task_attachments" from "service_role";

revoke insert on table "public"."task_attachments" from "service_role";

revoke references on table "public"."task_attachments" from "service_role";

revoke select on table "public"."task_attachments" from "service_role";

revoke trigger on table "public"."task_attachments" from "service_role";

revoke truncate on table "public"."task_attachments" from "service_role";

revoke update on table "public"."task_attachments" from "service_role";

revoke delete on table "public"."task_comments" from "anon";

revoke insert on table "public"."task_comments" from "anon";

revoke references on table "public"."task_comments" from "anon";

revoke select on table "public"."task_comments" from "anon";

revoke trigger on table "public"."task_comments" from "anon";

revoke truncate on table "public"."task_comments" from "anon";

revoke update on table "public"."task_comments" from "anon";

revoke delete on table "public"."task_comments" from "authenticated";

revoke insert on table "public"."task_comments" from "authenticated";

revoke references on table "public"."task_comments" from "authenticated";

revoke select on table "public"."task_comments" from "authenticated";

revoke trigger on table "public"."task_comments" from "authenticated";

revoke truncate on table "public"."task_comments" from "authenticated";

revoke update on table "public"."task_comments" from "authenticated";

revoke delete on table "public"."task_comments" from "service_role";

revoke insert on table "public"."task_comments" from "service_role";

revoke references on table "public"."task_comments" from "service_role";

revoke select on table "public"."task_comments" from "service_role";

revoke trigger on table "public"."task_comments" from "service_role";

revoke truncate on table "public"."task_comments" from "service_role";

revoke update on table "public"."task_comments" from "service_role";

revoke delete on table "public"."tax_accounts" from "anon";

revoke insert on table "public"."tax_accounts" from "anon";

revoke references on table "public"."tax_accounts" from "anon";

revoke select on table "public"."tax_accounts" from "anon";

revoke trigger on table "public"."tax_accounts" from "anon";

revoke truncate on table "public"."tax_accounts" from "anon";

revoke update on table "public"."tax_accounts" from "anon";

revoke delete on table "public"."tax_accounts" from "authenticated";

revoke insert on table "public"."tax_accounts" from "authenticated";

revoke references on table "public"."tax_accounts" from "authenticated";

revoke select on table "public"."tax_accounts" from "authenticated";

revoke trigger on table "public"."tax_accounts" from "authenticated";

revoke truncate on table "public"."tax_accounts" from "authenticated";

revoke update on table "public"."tax_accounts" from "authenticated";

revoke delete on table "public"."tax_accounts" from "service_role";

revoke insert on table "public"."tax_accounts" from "service_role";

revoke references on table "public"."tax_accounts" from "service_role";

revoke select on table "public"."tax_accounts" from "service_role";

revoke trigger on table "public"."tax_accounts" from "service_role";

revoke truncate on table "public"."tax_accounts" from "service_role";

revoke update on table "public"."tax_accounts" from "service_role";

revoke delete on table "public"."tax_dispute_cases" from "anon";

revoke insert on table "public"."tax_dispute_cases" from "anon";

revoke references on table "public"."tax_dispute_cases" from "anon";

revoke select on table "public"."tax_dispute_cases" from "anon";

revoke trigger on table "public"."tax_dispute_cases" from "anon";

revoke truncate on table "public"."tax_dispute_cases" from "anon";

revoke update on table "public"."tax_dispute_cases" from "anon";

revoke delete on table "public"."tax_dispute_cases" from "authenticated";

revoke insert on table "public"."tax_dispute_cases" from "authenticated";

revoke references on table "public"."tax_dispute_cases" from "authenticated";

revoke select on table "public"."tax_dispute_cases" from "authenticated";

revoke trigger on table "public"."tax_dispute_cases" from "authenticated";

revoke truncate on table "public"."tax_dispute_cases" from "authenticated";

revoke update on table "public"."tax_dispute_cases" from "authenticated";

revoke delete on table "public"."tax_dispute_cases" from "service_role";

revoke insert on table "public"."tax_dispute_cases" from "service_role";

revoke references on table "public"."tax_dispute_cases" from "service_role";

revoke select on table "public"."tax_dispute_cases" from "service_role";

revoke trigger on table "public"."tax_dispute_cases" from "service_role";

revoke truncate on table "public"."tax_dispute_cases" from "service_role";

revoke update on table "public"."tax_dispute_cases" from "service_role";

revoke delete on table "public"."tax_dispute_events" from "anon";

revoke insert on table "public"."tax_dispute_events" from "anon";

revoke references on table "public"."tax_dispute_events" from "anon";

revoke select on table "public"."tax_dispute_events" from "anon";

revoke trigger on table "public"."tax_dispute_events" from "anon";

revoke truncate on table "public"."tax_dispute_events" from "anon";

revoke update on table "public"."tax_dispute_events" from "anon";

revoke delete on table "public"."tax_dispute_events" from "authenticated";

revoke insert on table "public"."tax_dispute_events" from "authenticated";

revoke references on table "public"."tax_dispute_events" from "authenticated";

revoke select on table "public"."tax_dispute_events" from "authenticated";

revoke trigger on table "public"."tax_dispute_events" from "authenticated";

revoke truncate on table "public"."tax_dispute_events" from "authenticated";

revoke update on table "public"."tax_dispute_events" from "authenticated";

revoke delete on table "public"."tax_dispute_events" from "service_role";

revoke insert on table "public"."tax_dispute_events" from "service_role";

revoke references on table "public"."tax_dispute_events" from "service_role";

revoke select on table "public"."tax_dispute_events" from "service_role";

revoke trigger on table "public"."tax_dispute_events" from "service_role";

revoke truncate on table "public"."tax_dispute_events" from "service_role";

revoke update on table "public"."tax_dispute_events" from "service_role";

revoke delete on table "public"."tax_entities" from "anon";

revoke insert on table "public"."tax_entities" from "anon";

revoke references on table "public"."tax_entities" from "anon";

revoke select on table "public"."tax_entities" from "anon";

revoke trigger on table "public"."tax_entities" from "anon";

revoke truncate on table "public"."tax_entities" from "anon";

revoke update on table "public"."tax_entities" from "anon";

revoke delete on table "public"."tax_entities" from "authenticated";

revoke insert on table "public"."tax_entities" from "authenticated";

revoke references on table "public"."tax_entities" from "authenticated";

revoke select on table "public"."tax_entities" from "authenticated";

revoke trigger on table "public"."tax_entities" from "authenticated";

revoke truncate on table "public"."tax_entities" from "authenticated";

revoke update on table "public"."tax_entities" from "authenticated";

revoke delete on table "public"."tax_entities" from "service_role";

revoke insert on table "public"."tax_entities" from "service_role";

revoke references on table "public"."tax_entities" from "service_role";

revoke select on table "public"."tax_entities" from "service_role";

revoke trigger on table "public"."tax_entities" from "service_role";

revoke truncate on table "public"."tax_entities" from "service_role";

revoke update on table "public"."tax_entities" from "service_role";

revoke delete on table "public"."tax_entity_relationships" from "anon";

revoke insert on table "public"."tax_entity_relationships" from "anon";

revoke references on table "public"."tax_entity_relationships" from "anon";

revoke select on table "public"."tax_entity_relationships" from "anon";

revoke trigger on table "public"."tax_entity_relationships" from "anon";

revoke truncate on table "public"."tax_entity_relationships" from "anon";

revoke update on table "public"."tax_entity_relationships" from "anon";

revoke delete on table "public"."tax_entity_relationships" from "authenticated";

revoke insert on table "public"."tax_entity_relationships" from "authenticated";

revoke references on table "public"."tax_entity_relationships" from "authenticated";

revoke select on table "public"."tax_entity_relationships" from "authenticated";

revoke trigger on table "public"."tax_entity_relationships" from "authenticated";

revoke truncate on table "public"."tax_entity_relationships" from "authenticated";

revoke update on table "public"."tax_entity_relationships" from "authenticated";

revoke delete on table "public"."tax_entity_relationships" from "service_role";

revoke insert on table "public"."tax_entity_relationships" from "service_role";

revoke references on table "public"."tax_entity_relationships" from "service_role";

revoke select on table "public"."tax_entity_relationships" from "service_role";

revoke trigger on table "public"."tax_entity_relationships" from "service_role";

revoke truncate on table "public"."tax_entity_relationships" from "service_role";

revoke update on table "public"."tax_entity_relationships" from "service_role";

revoke delete on table "public"."telemetry_coverage_metrics" from "anon";

revoke insert on table "public"."telemetry_coverage_metrics" from "anon";

revoke references on table "public"."telemetry_coverage_metrics" from "anon";

revoke select on table "public"."telemetry_coverage_metrics" from "anon";

revoke trigger on table "public"."telemetry_coverage_metrics" from "anon";

revoke truncate on table "public"."telemetry_coverage_metrics" from "anon";

revoke update on table "public"."telemetry_coverage_metrics" from "anon";

revoke delete on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke insert on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke references on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke select on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke trigger on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke truncate on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke update on table "public"."telemetry_coverage_metrics" from "authenticated";

revoke delete on table "public"."telemetry_coverage_metrics" from "service_role";

revoke insert on table "public"."telemetry_coverage_metrics" from "service_role";

revoke references on table "public"."telemetry_coverage_metrics" from "service_role";

revoke select on table "public"."telemetry_coverage_metrics" from "service_role";

revoke trigger on table "public"."telemetry_coverage_metrics" from "service_role";

revoke truncate on table "public"."telemetry_coverage_metrics" from "service_role";

revoke update on table "public"."telemetry_coverage_metrics" from "service_role";

revoke delete on table "public"."telemetry_refusal_events" from "anon";

revoke insert on table "public"."telemetry_refusal_events" from "anon";

revoke references on table "public"."telemetry_refusal_events" from "anon";

revoke select on table "public"."telemetry_refusal_events" from "anon";

revoke trigger on table "public"."telemetry_refusal_events" from "anon";

revoke truncate on table "public"."telemetry_refusal_events" from "anon";

revoke update on table "public"."telemetry_refusal_events" from "anon";

revoke delete on table "public"."telemetry_refusal_events" from "authenticated";

revoke insert on table "public"."telemetry_refusal_events" from "authenticated";

revoke references on table "public"."telemetry_refusal_events" from "authenticated";

revoke select on table "public"."telemetry_refusal_events" from "authenticated";

revoke trigger on table "public"."telemetry_refusal_events" from "authenticated";

revoke truncate on table "public"."telemetry_refusal_events" from "authenticated";

revoke update on table "public"."telemetry_refusal_events" from "authenticated";

revoke delete on table "public"."telemetry_refusal_events" from "service_role";

revoke insert on table "public"."telemetry_refusal_events" from "service_role";

revoke references on table "public"."telemetry_refusal_events" from "service_role";

revoke select on table "public"."telemetry_refusal_events" from "service_role";

revoke trigger on table "public"."telemetry_refusal_events" from "service_role";

revoke truncate on table "public"."telemetry_refusal_events" from "service_role";

revoke update on table "public"."telemetry_refusal_events" from "service_role";

revoke delete on table "public"."telemetry_service_levels" from "anon";

revoke insert on table "public"."telemetry_service_levels" from "anon";

revoke references on table "public"."telemetry_service_levels" from "anon";

revoke select on table "public"."telemetry_service_levels" from "anon";

revoke trigger on table "public"."telemetry_service_levels" from "anon";

revoke truncate on table "public"."telemetry_service_levels" from "anon";

revoke update on table "public"."telemetry_service_levels" from "anon";

revoke delete on table "public"."telemetry_service_levels" from "authenticated";

revoke insert on table "public"."telemetry_service_levels" from "authenticated";

revoke references on table "public"."telemetry_service_levels" from "authenticated";

revoke select on table "public"."telemetry_service_levels" from "authenticated";

revoke trigger on table "public"."telemetry_service_levels" from "authenticated";

revoke truncate on table "public"."telemetry_service_levels" from "authenticated";

revoke update on table "public"."telemetry_service_levels" from "authenticated";

revoke delete on table "public"."telemetry_service_levels" from "service_role";

revoke insert on table "public"."telemetry_service_levels" from "service_role";

revoke references on table "public"."telemetry_service_levels" from "service_role";

revoke select on table "public"."telemetry_service_levels" from "service_role";

revoke trigger on table "public"."telemetry_service_levels" from "service_role";

revoke truncate on table "public"."telemetry_service_levels" from "service_role";

revoke update on table "public"."telemetry_service_levels" from "service_role";

revoke delete on table "public"."tool_registry" from "anon";

revoke insert on table "public"."tool_registry" from "anon";

revoke references on table "public"."tool_registry" from "anon";

revoke select on table "public"."tool_registry" from "anon";

revoke trigger on table "public"."tool_registry" from "anon";

revoke truncate on table "public"."tool_registry" from "anon";

revoke update on table "public"."tool_registry" from "anon";

revoke delete on table "public"."tool_registry" from "authenticated";

revoke insert on table "public"."tool_registry" from "authenticated";

revoke references on table "public"."tool_registry" from "authenticated";

revoke select on table "public"."tool_registry" from "authenticated";

revoke trigger on table "public"."tool_registry" from "authenticated";

revoke truncate on table "public"."tool_registry" from "authenticated";

revoke update on table "public"."tool_registry" from "authenticated";

revoke delete on table "public"."tool_registry" from "service_role";

revoke insert on table "public"."tool_registry" from "service_role";

revoke references on table "public"."tool_registry" from "service_role";

revoke select on table "public"."tool_registry" from "service_role";

revoke trigger on table "public"."tool_registry" from "service_role";

revoke truncate on table "public"."tool_registry" from "service_role";

revoke update on table "public"."tool_registry" from "service_role";

revoke delete on table "public"."treaty_wht_calculations" from "anon";

revoke insert on table "public"."treaty_wht_calculations" from "anon";

revoke references on table "public"."treaty_wht_calculations" from "anon";

revoke select on table "public"."treaty_wht_calculations" from "anon";

revoke trigger on table "public"."treaty_wht_calculations" from "anon";

revoke truncate on table "public"."treaty_wht_calculations" from "anon";

revoke update on table "public"."treaty_wht_calculations" from "anon";

revoke delete on table "public"."treaty_wht_calculations" from "authenticated";

revoke insert on table "public"."treaty_wht_calculations" from "authenticated";

revoke references on table "public"."treaty_wht_calculations" from "authenticated";

revoke select on table "public"."treaty_wht_calculations" from "authenticated";

revoke trigger on table "public"."treaty_wht_calculations" from "authenticated";

revoke truncate on table "public"."treaty_wht_calculations" from "authenticated";

revoke update on table "public"."treaty_wht_calculations" from "authenticated";

revoke delete on table "public"."treaty_wht_calculations" from "service_role";

revoke insert on table "public"."treaty_wht_calculations" from "service_role";

revoke references on table "public"."treaty_wht_calculations" from "service_role";

revoke select on table "public"."treaty_wht_calculations" from "service_role";

revoke trigger on table "public"."treaty_wht_calculations" from "service_role";

revoke truncate on table "public"."treaty_wht_calculations" from "service_role";

revoke update on table "public"."treaty_wht_calculations" from "service_role";

revoke delete on table "public"."trial_balance_snapshots" from "anon";

revoke insert on table "public"."trial_balance_snapshots" from "anon";

revoke references on table "public"."trial_balance_snapshots" from "anon";

revoke select on table "public"."trial_balance_snapshots" from "anon";

revoke trigger on table "public"."trial_balance_snapshots" from "anon";

revoke truncate on table "public"."trial_balance_snapshots" from "anon";

revoke update on table "public"."trial_balance_snapshots" from "anon";

revoke delete on table "public"."trial_balance_snapshots" from "authenticated";

revoke insert on table "public"."trial_balance_snapshots" from "authenticated";

revoke references on table "public"."trial_balance_snapshots" from "authenticated";

revoke select on table "public"."trial_balance_snapshots" from "authenticated";

revoke trigger on table "public"."trial_balance_snapshots" from "authenticated";

revoke truncate on table "public"."trial_balance_snapshots" from "authenticated";

revoke update on table "public"."trial_balance_snapshots" from "authenticated";

revoke delete on table "public"."trial_balance_snapshots" from "service_role";

revoke insert on table "public"."trial_balance_snapshots" from "service_role";

revoke references on table "public"."trial_balance_snapshots" from "service_role";

revoke select on table "public"."trial_balance_snapshots" from "service_role";

revoke trigger on table "public"."trial_balance_snapshots" from "service_role";

revoke truncate on table "public"."trial_balance_snapshots" from "service_role";

revoke update on table "public"."trial_balance_snapshots" from "service_role";

revoke delete on table "public"."us_tax_overlay_calculations" from "anon";

revoke insert on table "public"."us_tax_overlay_calculations" from "anon";

revoke references on table "public"."us_tax_overlay_calculations" from "anon";

revoke select on table "public"."us_tax_overlay_calculations" from "anon";

revoke trigger on table "public"."us_tax_overlay_calculations" from "anon";

revoke truncate on table "public"."us_tax_overlay_calculations" from "anon";

revoke update on table "public"."us_tax_overlay_calculations" from "anon";

revoke delete on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke insert on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke references on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke select on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke trigger on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke truncate on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke update on table "public"."us_tax_overlay_calculations" from "authenticated";

revoke delete on table "public"."us_tax_overlay_calculations" from "service_role";

revoke insert on table "public"."us_tax_overlay_calculations" from "service_role";

revoke references on table "public"."us_tax_overlay_calculations" from "service_role";

revoke select on table "public"."us_tax_overlay_calculations" from "service_role";

revoke trigger on table "public"."us_tax_overlay_calculations" from "service_role";

revoke truncate on table "public"."us_tax_overlay_calculations" from "service_role";

revoke update on table "public"."us_tax_overlay_calculations" from "service_role";

revoke delete on table "public"."variance_results" from "anon";

revoke insert on table "public"."variance_results" from "anon";

revoke references on table "public"."variance_results" from "anon";

revoke select on table "public"."variance_results" from "anon";

revoke trigger on table "public"."variance_results" from "anon";

revoke truncate on table "public"."variance_results" from "anon";

revoke update on table "public"."variance_results" from "anon";

revoke delete on table "public"."variance_results" from "authenticated";

revoke insert on table "public"."variance_results" from "authenticated";

revoke references on table "public"."variance_results" from "authenticated";

revoke select on table "public"."variance_results" from "authenticated";

revoke trigger on table "public"."variance_results" from "authenticated";

revoke truncate on table "public"."variance_results" from "authenticated";

revoke update on table "public"."variance_results" from "authenticated";

revoke delete on table "public"."variance_results" from "service_role";

revoke insert on table "public"."variance_results" from "service_role";

revoke references on table "public"."variance_results" from "service_role";

revoke select on table "public"."variance_results" from "service_role";

revoke trigger on table "public"."variance_results" from "service_role";

revoke truncate on table "public"."variance_results" from "service_role";

revoke update on table "public"."variance_results" from "service_role";

revoke delete on table "public"."variance_rules" from "anon";

revoke insert on table "public"."variance_rules" from "anon";

revoke references on table "public"."variance_rules" from "anon";

revoke select on table "public"."variance_rules" from "anon";

revoke trigger on table "public"."variance_rules" from "anon";

revoke truncate on table "public"."variance_rules" from "anon";

revoke update on table "public"."variance_rules" from "anon";

revoke delete on table "public"."variance_rules" from "authenticated";

revoke insert on table "public"."variance_rules" from "authenticated";

revoke references on table "public"."variance_rules" from "authenticated";

revoke select on table "public"."variance_rules" from "authenticated";

revoke trigger on table "public"."variance_rules" from "authenticated";

revoke truncate on table "public"."variance_rules" from "authenticated";

revoke update on table "public"."variance_rules" from "authenticated";

revoke delete on table "public"."variance_rules" from "service_role";

revoke insert on table "public"."variance_rules" from "service_role";

revoke references on table "public"."variance_rules" from "service_role";

revoke select on table "public"."variance_rules" from "service_role";

revoke trigger on table "public"."variance_rules" from "service_role";

revoke truncate on table "public"."variance_rules" from "service_role";

revoke update on table "public"."variance_rules" from "service_role";

revoke delete on table "public"."vat_filings" from "anon";

revoke insert on table "public"."vat_filings" from "anon";

revoke references on table "public"."vat_filings" from "anon";

revoke select on table "public"."vat_filings" from "anon";

revoke trigger on table "public"."vat_filings" from "anon";

revoke truncate on table "public"."vat_filings" from "anon";

revoke update on table "public"."vat_filings" from "anon";

revoke delete on table "public"."vat_filings" from "authenticated";

revoke insert on table "public"."vat_filings" from "authenticated";

revoke references on table "public"."vat_filings" from "authenticated";

revoke select on table "public"."vat_filings" from "authenticated";

revoke trigger on table "public"."vat_filings" from "authenticated";

revoke truncate on table "public"."vat_filings" from "authenticated";

revoke update on table "public"."vat_filings" from "authenticated";

revoke delete on table "public"."vat_filings" from "service_role";

revoke insert on table "public"."vat_filings" from "service_role";

revoke references on table "public"."vat_filings" from "service_role";

revoke select on table "public"."vat_filings" from "service_role";

revoke trigger on table "public"."vat_filings" from "service_role";

revoke truncate on table "public"."vat_filings" from "service_role";

revoke update on table "public"."vat_filings" from "service_role";

alter table "public"."documents" drop constraint "documents_engagement_id_fkey";

alter table "public"."documents" drop constraint "documents_task_id_fkey";

alter table "public"."tasks" drop constraint "tasks_engagement_id_fkey";

create table "public"."_prisma_migrations" (
    "id" character varying(36) not null,
    "checksum" character varying(64) not null,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) not null,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone not null default now(),
    "applied_steps_count" integer not null default 0
);


alter table "public"."agent_sessions" add column "embedding" extensions.vector(1536);

alter table "public"."chunks" alter column "content_hash" set default encode(extensions.digest(COALESCE(content, ''::text), 'sha256'::text), 'hex'::text);

alter table "public"."chunks" alter column "embedding" set data type extensions.vector(1536) using "embedding"::extensions.vector(1536);

alter table "public"."documents" drop column "engagement_id";

alter table "public"."documents" drop column "file_path";

alter table "public"."documents" drop column "file_type";

alter table "public"."documents" drop column "task_id";

alter table "public"."documents" add column "checksum" text;

alter table "public"."documents" alter column "created_at" set not null;

alter table "public"."documents" alter column "file_size" set data type bigint using "file_size"::bigint;

alter table "public"."documents" alter column "filename" drop default;

alter table "public"."documents" alter column "storage_path" drop default;

alter table "public"."engagements" alter column "non_audit_services" drop default;

alter table "public"."notifications" drop column "message";

alter table "public"."notifications" drop column "type";

alter table "public"."notifications" add column "body" text;

alter table "public"."notifications" add column "kind" text not null;

alter table "public"."notifications" add column "link" text;

alter table "public"."notifications" add column "urgent" boolean not null default false;

alter table "public"."notifications" alter column "created_at" set not null;

alter table "public"."notifications" alter column "read" set not null;

alter table "public"."tasks" drop column "completed_at";

alter table "public"."tasks" add column "created_by" uuid not null;

alter table "public"."tasks" alter column "created_at" set not null;

alter table "public"."tasks" alter column "due_date" set data type timestamp with time zone using "due_date"::timestamp with time zone;

alter table "public"."tasks" alter column "priority" set default 'MEDIUM'::text;

alter table "public"."tasks" alter column "priority" set not null;

alter table "public"."tasks" alter column "status" set default 'TODO'::text;

alter table "public"."tasks" alter column "status" set not null;

alter table "public"."tasks" alter column "updated_at" set not null;

drop extension if exists "btree_gin";

drop extension if exists "pg_trgm";

drop extension if exists "vector";

CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);

CREATE INDEX agent_sessions_embedding_hnsw ON public.agent_sessions USING hnsw (embedding extensions.vector_l2_ops);

alter table "public"."_prisma_migrations" add constraint "_prisma_migrations_pkey" PRIMARY KEY using index "_prisma_migrations_pkey";

alter table "public"."documents" add constraint "documents_storage_path_key" UNIQUE using index "documents_storage_path_key";

alter table "public"."notifications" add constraint "notifications_kind_check" CHECK ((kind = ANY (ARRAY['TASK'::text, 'DOC'::text, 'APPROVAL'::text, 'SYSTEM'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_kind_check";

alter table "public"."tasks" add constraint "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_created_by_fkey";

alter table "public"."tasks" add constraint "tasks_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'URGENT'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_priority_check";

alter table "public"."tasks" add constraint "tasks_status_check" CHECK ((status = ANY (ARRAY['TODO'::text, 'IN_PROGRESS'::text, 'REVIEW'::text, 'COMPLETED'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_status_check";

alter table "public"."tasks" add constraint "tasks_engagement_id_fkey" FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE SET NULL not valid;

alter table "public"."tasks" validate constraint "tasks_engagement_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_org_id uuid, p_resource text, p_limit integer, p_window_seconds integer)
 RETURNS TABLE(allowed boolean, request_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min org_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_role AS (
    SELECT
      m.role,
      CASE m.role
        WHEN 'SYSTEM_ADMIN' THEN 100
        WHEN 'PARTNER' THEN 90
        WHEN 'EQR' THEN 85
        WHEN 'MANAGER' THEN 70
        WHEN 'SERVICE_ACCOUNT' THEN 45
        WHEN 'EMPLOYEE' THEN 40
        WHEN 'CLIENT' THEN 30
        WHEN 'READONLY' THEN 20
        ELSE 0
      END AS precedence
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT 1
  ),
  required_role AS (
    SELECT CASE min
      WHEN 'SYSTEM_ADMIN' THEN 100
      WHEN 'PARTNER' THEN 90
      WHEN 'EQR' THEN 85
      WHEN 'MANAGER' THEN 70
      WHEN 'SERVICE_ACCOUNT' THEN 45
      WHEN 'EMPLOYEE' THEN 40
      WHEN 'CLIENT' THEN 30
      WHEN 'READONLY' THEN 20
      ELSE 0
    END AS precedence
  )
  SELECT COALESCE(
    (SELECT cr.precedence >= rr.precedence FROM current_role cr, required_role rr),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min role_level)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_min_role(org, CASE min
    WHEN 'SYSTEM_ADMIN' THEN 'SYSTEM_ADMIN'::public.org_role
    WHEN 'MANAGER' THEN 'MANAGER'::public.org_role
    ELSE 'EMPLOYEE'::public.org_role
  END);
$function$
;

CREATE OR REPLACE FUNCTION public.is_member_of(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
  );
$function$
;

create policy "cit_rw"
on "public"."cit_computations"
as permissive
for all
to public
using (app.is_org_member(org_id, 'staff'::org_role))
with check (app.is_org_member(org_id, 'staff'::org_role));


create policy "cfc_inclusions_rw"
on "public"."cfc_inclusions"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));


create policy "fiscal_unity_rw"
on "public"."fiscal_unity_computations"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));


create policy "interest_limitation_rw"
on "public"."interest_limitation_computations"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));


create policy "memberships_read"
on "public"."memberships"
as permissive
for select
to public
using (((user_id = auth.uid()) OR has_min_role(org_id, 'MANAGER'::role_level) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.is_system_admin = true))))));


create policy "nid_computations_write"
on "public"."nid_computations"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));


create policy "patent_box_computations_write"
on "public"."patent_box_computations"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));


create policy "vat_filings_rw"
on "public"."vat_filings"
as permissive
for all
to public
using (app.is_member_of(org_id, 'staff'::text))
with check (app.is_member_of(org_id, 'staff'::text));




  create policy "documents_service_role_manage flreew_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'documents'::text));



  create policy "documents_service_role_manage flreew_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'documents'::text));



  create policy "documents_service_role_manage flreew_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'documents'::text));



  create policy "documents_service_role_manage flreew_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'documents'::text));



