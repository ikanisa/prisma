set check_function_bodies = off;

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

drop extension if exists "pg_net";

revoke delete on table "public"."accounting" from "anon";

revoke insert on table "public"."accounting" from "anon";

revoke references on table "public"."accounting" from "anon";

revoke select on table "public"."accounting" from "anon";

revoke trigger on table "public"."accounting" from "anon";

revoke truncate on table "public"."accounting" from "anon";

revoke update on table "public"."accounting" from "anon";

revoke delete on table "public"."accounting" from "authenticated";

revoke insert on table "public"."accounting" from "authenticated";

revoke references on table "public"."accounting" from "authenticated";

revoke select on table "public"."accounting" from "authenticated";

revoke trigger on table "public"."accounting" from "authenticated";

revoke truncate on table "public"."accounting" from "authenticated";

revoke update on table "public"."accounting" from "authenticated";

revoke delete on table "public"."accounting" from "service_role";

revoke insert on table "public"."accounting" from "service_role";

revoke references on table "public"."accounting" from "service_role";

revoke select on table "public"."accounting" from "service_role";

revoke trigger on table "public"."accounting" from "service_role";

revoke truncate on table "public"."accounting" from "service_role";

revoke update on table "public"."accounting" from "service_role";

revoke delete on table "public"."activity_log" from "anon";

revoke insert on table "public"."activity_log" from "anon";

revoke references on table "public"."activity_log" from "anon";

revoke select on table "public"."activity_log" from "anon";

revoke trigger on table "public"."activity_log" from "anon";

revoke truncate on table "public"."activity_log" from "anon";

revoke update on table "public"."activity_log" from "anon";

revoke delete on table "public"."activity_log" from "authenticated";

revoke insert on table "public"."activity_log" from "authenticated";

revoke references on table "public"."activity_log" from "authenticated";

revoke select on table "public"."activity_log" from "authenticated";

revoke trigger on table "public"."activity_log" from "authenticated";

revoke truncate on table "public"."activity_log" from "authenticated";

revoke update on table "public"."activity_log" from "authenticated";

revoke delete on table "public"."activity_log" from "service_role";

revoke insert on table "public"."activity_log" from "service_role";

revoke references on table "public"."activity_log" from "service_role";

revoke select on table "public"."activity_log" from "service_role";

revoke trigger on table "public"."activity_log" from "service_role";

revoke truncate on table "public"."activity_log" from "service_role";

revoke update on table "public"."activity_log" from "service_role";

revoke delete on table "public"."agent_feedback" from "anon";

revoke insert on table "public"."agent_feedback" from "anon";

revoke references on table "public"."agent_feedback" from "anon";

revoke select on table "public"."agent_feedback" from "anon";

revoke trigger on table "public"."agent_feedback" from "anon";

revoke truncate on table "public"."agent_feedback" from "anon";

revoke update on table "public"."agent_feedback" from "anon";

revoke delete on table "public"."agent_feedback" from "authenticated";

revoke insert on table "public"."agent_feedback" from "authenticated";

revoke references on table "public"."agent_feedback" from "authenticated";

revoke select on table "public"."agent_feedback" from "authenticated";

revoke trigger on table "public"."agent_feedback" from "authenticated";

revoke truncate on table "public"."agent_feedback" from "authenticated";

revoke update on table "public"."agent_feedback" from "authenticated";

revoke delete on table "public"."agent_feedback" from "service_role";

revoke insert on table "public"."agent_feedback" from "service_role";

revoke references on table "public"."agent_feedback" from "service_role";

revoke select on table "public"."agent_feedback" from "service_role";

revoke trigger on table "public"."agent_feedback" from "service_role";

revoke truncate on table "public"."agent_feedback" from "service_role";

revoke update on table "public"."agent_feedback" from "service_role";

revoke delete on table "public"."agent_logs" from "anon";

revoke insert on table "public"."agent_logs" from "anon";

revoke references on table "public"."agent_logs" from "anon";

revoke select on table "public"."agent_logs" from "anon";

revoke trigger on table "public"."agent_logs" from "anon";

revoke truncate on table "public"."agent_logs" from "anon";

revoke update on table "public"."agent_logs" from "anon";

revoke delete on table "public"."agent_logs" from "authenticated";

revoke insert on table "public"."agent_logs" from "authenticated";

revoke references on table "public"."agent_logs" from "authenticated";

revoke select on table "public"."agent_logs" from "authenticated";

revoke trigger on table "public"."agent_logs" from "authenticated";

revoke truncate on table "public"."agent_logs" from "authenticated";

revoke update on table "public"."agent_logs" from "authenticated";

revoke delete on table "public"."agent_logs" from "service_role";

revoke insert on table "public"."agent_logs" from "service_role";

revoke references on table "public"."agent_logs" from "service_role";

revoke select on table "public"."agent_logs" from "service_role";

revoke trigger on table "public"."agent_logs" from "service_role";

revoke truncate on table "public"."agent_logs" from "service_role";

revoke update on table "public"."agent_logs" from "service_role";

revoke delete on table "public"."agent_profiles" from "anon";

revoke insert on table "public"."agent_profiles" from "anon";

revoke references on table "public"."agent_profiles" from "anon";

revoke select on table "public"."agent_profiles" from "anon";

revoke trigger on table "public"."agent_profiles" from "anon";

revoke truncate on table "public"."agent_profiles" from "anon";

revoke update on table "public"."agent_profiles" from "anon";

revoke delete on table "public"."agent_profiles" from "authenticated";

revoke insert on table "public"."agent_profiles" from "authenticated";

revoke references on table "public"."agent_profiles" from "authenticated";

revoke select on table "public"."agent_profiles" from "authenticated";

revoke trigger on table "public"."agent_profiles" from "authenticated";

revoke truncate on table "public"."agent_profiles" from "authenticated";

revoke update on table "public"."agent_profiles" from "authenticated";

revoke delete on table "public"."agent_profiles" from "service_role";

revoke insert on table "public"."agent_profiles" from "service_role";

revoke references on table "public"."agent_profiles" from "service_role";

revoke select on table "public"."agent_profiles" from "service_role";

revoke trigger on table "public"."agent_profiles" from "service_role";

revoke truncate on table "public"."agent_profiles" from "service_role";

revoke update on table "public"."agent_profiles" from "service_role";

revoke delete on table "public"."agent_sessions" from "anon";

revoke insert on table "public"."agent_sessions" from "anon";

revoke references on table "public"."agent_sessions" from "anon";

revoke select on table "public"."agent_sessions" from "anon";

revoke trigger on table "public"."agent_sessions" from "anon";

revoke truncate on table "public"."agent_sessions" from "anon";

revoke update on table "public"."agent_sessions" from "anon";

revoke delete on table "public"."agent_sessions" from "authenticated";

revoke insert on table "public"."agent_sessions" from "authenticated";

revoke references on table "public"."agent_sessions" from "authenticated";

revoke select on table "public"."agent_sessions" from "authenticated";

revoke trigger on table "public"."agent_sessions" from "authenticated";

revoke truncate on table "public"."agent_sessions" from "authenticated";

revoke update on table "public"."agent_sessions" from "authenticated";

revoke delete on table "public"."agent_sessions" from "service_role";

revoke insert on table "public"."agent_sessions" from "service_role";

revoke references on table "public"."agent_sessions" from "service_role";

revoke select on table "public"."agent_sessions" from "service_role";

revoke trigger on table "public"."agent_sessions" from "service_role";

revoke truncate on table "public"."agent_sessions" from "service_role";

revoke update on table "public"."agent_sessions" from "service_role";

revoke delete on table "public"."api_keys" from "anon";

revoke insert on table "public"."api_keys" from "anon";

revoke references on table "public"."api_keys" from "anon";

revoke select on table "public"."api_keys" from "anon";

revoke trigger on table "public"."api_keys" from "anon";

revoke truncate on table "public"."api_keys" from "anon";

revoke update on table "public"."api_keys" from "anon";

revoke delete on table "public"."api_keys" from "authenticated";

revoke insert on table "public"."api_keys" from "authenticated";

revoke references on table "public"."api_keys" from "authenticated";

revoke select on table "public"."api_keys" from "authenticated";

revoke trigger on table "public"."api_keys" from "authenticated";

revoke truncate on table "public"."api_keys" from "authenticated";

revoke update on table "public"."api_keys" from "authenticated";

revoke delete on table "public"."api_keys" from "service_role";

revoke insert on table "public"."api_keys" from "service_role";

revoke references on table "public"."api_keys" from "service_role";

revoke select on table "public"."api_keys" from "service_role";

revoke trigger on table "public"."api_keys" from "service_role";

revoke truncate on table "public"."api_keys" from "service_role";

revoke update on table "public"."api_keys" from "service_role";

revoke delete on table "public"."app_users" from "anon";

revoke insert on table "public"."app_users" from "anon";

revoke references on table "public"."app_users" from "anon";

revoke select on table "public"."app_users" from "anon";

revoke trigger on table "public"."app_users" from "anon";

revoke truncate on table "public"."app_users" from "anon";

revoke update on table "public"."app_users" from "anon";

revoke delete on table "public"."app_users" from "authenticated";

revoke insert on table "public"."app_users" from "authenticated";

revoke references on table "public"."app_users" from "authenticated";

revoke select on table "public"."app_users" from "authenticated";

revoke trigger on table "public"."app_users" from "authenticated";

revoke truncate on table "public"."app_users" from "authenticated";

revoke update on table "public"."app_users" from "authenticated";

revoke delete on table "public"."app_users" from "service_role";

revoke insert on table "public"."app_users" from "service_role";

revoke references on table "public"."app_users" from "service_role";

revoke select on table "public"."app_users" from "service_role";

revoke trigger on table "public"."app_users" from "service_role";

revoke truncate on table "public"."app_users" from "service_role";

revoke update on table "public"."app_users" from "service_role";

revoke delete on table "public"."audit" from "anon";

revoke insert on table "public"."audit" from "anon";

revoke references on table "public"."audit" from "anon";

revoke select on table "public"."audit" from "anon";

revoke trigger on table "public"."audit" from "anon";

revoke truncate on table "public"."audit" from "anon";

revoke update on table "public"."audit" from "anon";

revoke delete on table "public"."audit" from "authenticated";

revoke insert on table "public"."audit" from "authenticated";

revoke references on table "public"."audit" from "authenticated";

revoke select on table "public"."audit" from "authenticated";

revoke trigger on table "public"."audit" from "authenticated";

revoke truncate on table "public"."audit" from "authenticated";

revoke update on table "public"."audit" from "authenticated";

revoke delete on table "public"."audit" from "service_role";

revoke insert on table "public"."audit" from "service_role";

revoke references on table "public"."audit" from "service_role";

revoke select on table "public"."audit" from "service_role";

revoke trigger on table "public"."audit" from "service_role";

revoke truncate on table "public"."audit" from "service_role";

revoke update on table "public"."audit" from "service_role";

revoke delete on table "public"."categories" from "anon";

revoke insert on table "public"."categories" from "anon";

revoke references on table "public"."categories" from "anon";

revoke select on table "public"."categories" from "anon";

revoke trigger on table "public"."categories" from "anon";

revoke truncate on table "public"."categories" from "anon";

revoke update on table "public"."categories" from "anon";

revoke delete on table "public"."categories" from "authenticated";

revoke insert on table "public"."categories" from "authenticated";

revoke references on table "public"."categories" from "authenticated";

revoke select on table "public"."categories" from "authenticated";

revoke trigger on table "public"."categories" from "authenticated";

revoke truncate on table "public"."categories" from "authenticated";

revoke update on table "public"."categories" from "authenticated";

revoke delete on table "public"."categories" from "service_role";

revoke insert on table "public"."categories" from "service_role";

revoke references on table "public"."categories" from "service_role";

revoke select on table "public"."categories" from "service_role";

revoke trigger on table "public"."categories" from "service_role";

revoke truncate on table "public"."categories" from "service_role";

revoke update on table "public"."categories" from "service_role";

revoke delete on table "public"."chart_of_accounts" from "anon";

revoke insert on table "public"."chart_of_accounts" from "anon";

revoke references on table "public"."chart_of_accounts" from "anon";

revoke select on table "public"."chart_of_accounts" from "anon";

revoke trigger on table "public"."chart_of_accounts" from "anon";

revoke truncate on table "public"."chart_of_accounts" from "anon";

revoke update on table "public"."chart_of_accounts" from "anon";

revoke delete on table "public"."chart_of_accounts" from "authenticated";

revoke insert on table "public"."chart_of_accounts" from "authenticated";

revoke references on table "public"."chart_of_accounts" from "authenticated";

revoke select on table "public"."chart_of_accounts" from "authenticated";

revoke trigger on table "public"."chart_of_accounts" from "authenticated";

revoke truncate on table "public"."chart_of_accounts" from "authenticated";

revoke update on table "public"."chart_of_accounts" from "authenticated";

revoke delete on table "public"."chart_of_accounts" from "service_role";

revoke insert on table "public"."chart_of_accounts" from "service_role";

revoke references on table "public"."chart_of_accounts" from "service_role";

revoke select on table "public"."chart_of_accounts" from "service_role";

revoke trigger on table "public"."chart_of_accounts" from "service_role";

revoke truncate on table "public"."chart_of_accounts" from "service_role";

revoke update on table "public"."chart_of_accounts" from "service_role";

revoke delete on table "public"."chunks" from "anon";

revoke insert on table "public"."chunks" from "anon";

revoke references on table "public"."chunks" from "anon";

revoke select on table "public"."chunks" from "anon";

revoke trigger on table "public"."chunks" from "anon";

revoke truncate on table "public"."chunks" from "anon";

revoke update on table "public"."chunks" from "anon";

revoke delete on table "public"."chunks" from "authenticated";

revoke insert on table "public"."chunks" from "authenticated";

revoke references on table "public"."chunks" from "authenticated";

revoke select on table "public"."chunks" from "authenticated";

revoke trigger on table "public"."chunks" from "authenticated";

revoke truncate on table "public"."chunks" from "authenticated";

revoke update on table "public"."chunks" from "authenticated";

revoke delete on table "public"."chunks" from "service_role";

revoke insert on table "public"."chunks" from "service_role";

revoke references on table "public"."chunks" from "service_role";

revoke select on table "public"."chunks" from "service_role";

revoke trigger on table "public"."chunks" from "service_role";

revoke truncate on table "public"."chunks" from "service_role";

revoke update on table "public"."chunks" from "service_role";

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

revoke delete on table "public"."clients" from "anon";

revoke insert on table "public"."clients" from "anon";

revoke references on table "public"."clients" from "anon";

revoke select on table "public"."clients" from "anon";

revoke trigger on table "public"."clients" from "anon";

revoke truncate on table "public"."clients" from "anon";

revoke update on table "public"."clients" from "anon";

revoke delete on table "public"."clients" from "authenticated";

revoke insert on table "public"."clients" from "authenticated";

revoke references on table "public"."clients" from "authenticated";

revoke select on table "public"."clients" from "authenticated";

revoke trigger on table "public"."clients" from "authenticated";

revoke truncate on table "public"."clients" from "authenticated";

revoke update on table "public"."clients" from "authenticated";

revoke delete on table "public"."clients" from "service_role";

revoke insert on table "public"."clients" from "service_role";

revoke references on table "public"."clients" from "service_role";

revoke select on table "public"."clients" from "service_role";

revoke trigger on table "public"."clients" from "service_role";

revoke truncate on table "public"."clients" from "service_role";

revoke update on table "public"."clients" from "service_role";

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

revoke delete on table "public"."documents" from "anon";

revoke insert on table "public"."documents" from "anon";

revoke references on table "public"."documents" from "anon";

revoke select on table "public"."documents" from "anon";

revoke trigger on table "public"."documents" from "anon";

revoke truncate on table "public"."documents" from "anon";

revoke update on table "public"."documents" from "anon";

revoke delete on table "public"."documents" from "authenticated";

revoke insert on table "public"."documents" from "authenticated";

revoke references on table "public"."documents" from "authenticated";

revoke select on table "public"."documents" from "authenticated";

revoke trigger on table "public"."documents" from "authenticated";

revoke truncate on table "public"."documents" from "authenticated";

revoke update on table "public"."documents" from "authenticated";

revoke delete on table "public"."documents" from "service_role";

revoke insert on table "public"."documents" from "service_role";

revoke references on table "public"."documents" from "service_role";

revoke select on table "public"."documents" from "service_role";

revoke trigger on table "public"."documents" from "service_role";

revoke truncate on table "public"."documents" from "service_role";

revoke update on table "public"."documents" from "service_role";

revoke delete on table "public"."engagements" from "anon";

revoke insert on table "public"."engagements" from "anon";

revoke references on table "public"."engagements" from "anon";

revoke select on table "public"."engagements" from "anon";

revoke trigger on table "public"."engagements" from "anon";

revoke truncate on table "public"."engagements" from "anon";

revoke update on table "public"."engagements" from "anon";

revoke delete on table "public"."engagements" from "authenticated";

revoke insert on table "public"."engagements" from "authenticated";

revoke references on table "public"."engagements" from "authenticated";

revoke select on table "public"."engagements" from "authenticated";

revoke trigger on table "public"."engagements" from "authenticated";

revoke truncate on table "public"."engagements" from "authenticated";

revoke update on table "public"."engagements" from "authenticated";

revoke delete on table "public"."engagements" from "service_role";

revoke insert on table "public"."engagements" from "service_role";

revoke references on table "public"."engagements" from "service_role";

revoke select on table "public"."engagements" from "service_role";

revoke trigger on table "public"."engagements" from "service_role";

revoke truncate on table "public"."engagements" from "service_role";

revoke update on table "public"."engagements" from "service_role";

revoke delete on table "public"."errors" from "anon";

revoke insert on table "public"."errors" from "anon";

revoke references on table "public"."errors" from "anon";

revoke select on table "public"."errors" from "anon";

revoke trigger on table "public"."errors" from "anon";

revoke truncate on table "public"."errors" from "anon";

revoke update on table "public"."errors" from "anon";

revoke delete on table "public"."errors" from "authenticated";

revoke insert on table "public"."errors" from "authenticated";

revoke references on table "public"."errors" from "authenticated";

revoke select on table "public"."errors" from "authenticated";

revoke trigger on table "public"."errors" from "authenticated";

revoke truncate on table "public"."errors" from "authenticated";

revoke update on table "public"."errors" from "authenticated";

revoke delete on table "public"."errors" from "service_role";

revoke insert on table "public"."errors" from "service_role";

revoke references on table "public"."errors" from "service_role";

revoke select on table "public"."errors" from "service_role";

revoke trigger on table "public"."errors" from "service_role";

revoke truncate on table "public"."errors" from "service_role";

revoke update on table "public"."errors" from "service_role";

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

revoke delete on table "public"."independence_checks" from "anon";

revoke insert on table "public"."independence_checks" from "anon";

revoke references on table "public"."independence_checks" from "anon";

revoke select on table "public"."independence_checks" from "anon";

revoke trigger on table "public"."independence_checks" from "anon";

revoke truncate on table "public"."independence_checks" from "anon";

revoke update on table "public"."independence_checks" from "anon";

revoke delete on table "public"."independence_checks" from "authenticated";

revoke insert on table "public"."independence_checks" from "authenticated";

revoke references on table "public"."independence_checks" from "authenticated";

revoke select on table "public"."independence_checks" from "authenticated";

revoke trigger on table "public"."independence_checks" from "authenticated";

revoke truncate on table "public"."independence_checks" from "authenticated";

revoke update on table "public"."independence_checks" from "authenticated";

revoke delete on table "public"."independence_checks" from "service_role";

revoke insert on table "public"."independence_checks" from "service_role";

revoke references on table "public"."independence_checks" from "service_role";

revoke select on table "public"."independence_checks" from "service_role";

revoke trigger on table "public"."independence_checks" from "service_role";

revoke truncate on table "public"."independence_checks" from "service_role";

revoke update on table "public"."independence_checks" from "service_role";

revoke delete on table "public"."ingest_jobs" from "anon";

revoke insert on table "public"."ingest_jobs" from "anon";

revoke references on table "public"."ingest_jobs" from "anon";

revoke select on table "public"."ingest_jobs" from "anon";

revoke trigger on table "public"."ingest_jobs" from "anon";

revoke truncate on table "public"."ingest_jobs" from "anon";

revoke update on table "public"."ingest_jobs" from "anon";

revoke delete on table "public"."ingest_jobs" from "authenticated";

revoke insert on table "public"."ingest_jobs" from "authenticated";

revoke references on table "public"."ingest_jobs" from "authenticated";

revoke select on table "public"."ingest_jobs" from "authenticated";

revoke trigger on table "public"."ingest_jobs" from "authenticated";

revoke truncate on table "public"."ingest_jobs" from "authenticated";

revoke update on table "public"."ingest_jobs" from "authenticated";

revoke delete on table "public"."ingest_jobs" from "service_role";

revoke insert on table "public"."ingest_jobs" from "service_role";

revoke references on table "public"."ingest_jobs" from "service_role";

revoke select on table "public"."ingest_jobs" from "service_role";

revoke trigger on table "public"."ingest_jobs" from "service_role";

revoke truncate on table "public"."ingest_jobs" from "service_role";

revoke update on table "public"."ingest_jobs" from "service_role";

revoke delete on table "public"."journal_entries" from "anon";

revoke insert on table "public"."journal_entries" from "anon";

revoke references on table "public"."journal_entries" from "anon";

revoke select on table "public"."journal_entries" from "anon";

revoke trigger on table "public"."journal_entries" from "anon";

revoke truncate on table "public"."journal_entries" from "anon";

revoke update on table "public"."journal_entries" from "anon";

revoke delete on table "public"."journal_entries" from "authenticated";

revoke insert on table "public"."journal_entries" from "authenticated";

revoke references on table "public"."journal_entries" from "authenticated";

revoke select on table "public"."journal_entries" from "authenticated";

revoke trigger on table "public"."journal_entries" from "authenticated";

revoke truncate on table "public"."journal_entries" from "authenticated";

revoke update on table "public"."journal_entries" from "authenticated";

revoke delete on table "public"."journal_entries" from "service_role";

revoke insert on table "public"."journal_entries" from "service_role";

revoke references on table "public"."journal_entries" from "service_role";

revoke select on table "public"."journal_entries" from "service_role";

revoke trigger on table "public"."journal_entries" from "service_role";

revoke truncate on table "public"."journal_entries" from "service_role";

revoke update on table "public"."journal_entries" from "service_role";

revoke delete on table "public"."journal_lines" from "anon";

revoke insert on table "public"."journal_lines" from "anon";

revoke references on table "public"."journal_lines" from "anon";

revoke select on table "public"."journal_lines" from "anon";

revoke trigger on table "public"."journal_lines" from "anon";

revoke truncate on table "public"."journal_lines" from "anon";

revoke update on table "public"."journal_lines" from "anon";

revoke delete on table "public"."journal_lines" from "authenticated";

revoke insert on table "public"."journal_lines" from "authenticated";

revoke references on table "public"."journal_lines" from "authenticated";

revoke select on table "public"."journal_lines" from "authenticated";

revoke trigger on table "public"."journal_lines" from "authenticated";

revoke truncate on table "public"."journal_lines" from "authenticated";

revoke update on table "public"."journal_lines" from "authenticated";

revoke delete on table "public"."journal_lines" from "service_role";

revoke insert on table "public"."journal_lines" from "service_role";

revoke references on table "public"."journal_lines" from "service_role";

revoke select on table "public"."journal_lines" from "service_role";

revoke trigger on table "public"."journal_lines" from "service_role";

revoke truncate on table "public"."journal_lines" from "service_role";

revoke update on table "public"."journal_lines" from "service_role";

revoke delete on table "public"."kams" from "anon";

revoke insert on table "public"."kams" from "anon";

revoke references on table "public"."kams" from "anon";

revoke select on table "public"."kams" from "anon";

revoke trigger on table "public"."kams" from "anon";

revoke truncate on table "public"."kams" from "anon";

revoke update on table "public"."kams" from "anon";

revoke delete on table "public"."kams" from "authenticated";

revoke insert on table "public"."kams" from "authenticated";

revoke references on table "public"."kams" from "authenticated";

revoke select on table "public"."kams" from "authenticated";

revoke trigger on table "public"."kams" from "authenticated";

revoke truncate on table "public"."kams" from "authenticated";

revoke update on table "public"."kams" from "authenticated";

revoke delete on table "public"."kams" from "service_role";

revoke insert on table "public"."kams" from "service_role";

revoke references on table "public"."kams" from "service_role";

revoke select on table "public"."kams" from "service_role";

revoke trigger on table "public"."kams" from "service_role";

revoke truncate on table "public"."kams" from "service_role";

revoke update on table "public"."kams" from "service_role";

revoke delete on table "public"."knowledge_corpora" from "anon";

revoke insert on table "public"."knowledge_corpora" from "anon";

revoke references on table "public"."knowledge_corpora" from "anon";

revoke select on table "public"."knowledge_corpora" from "anon";

revoke trigger on table "public"."knowledge_corpora" from "anon";

revoke truncate on table "public"."knowledge_corpora" from "anon";

revoke update on table "public"."knowledge_corpora" from "anon";

revoke delete on table "public"."knowledge_corpora" from "authenticated";

revoke insert on table "public"."knowledge_corpora" from "authenticated";

revoke references on table "public"."knowledge_corpora" from "authenticated";

revoke select on table "public"."knowledge_corpora" from "authenticated";

revoke trigger on table "public"."knowledge_corpora" from "authenticated";

revoke truncate on table "public"."knowledge_corpora" from "authenticated";

revoke update on table "public"."knowledge_corpora" from "authenticated";

revoke delete on table "public"."knowledge_corpora" from "service_role";

revoke insert on table "public"."knowledge_corpora" from "service_role";

revoke references on table "public"."knowledge_corpora" from "service_role";

revoke select on table "public"."knowledge_corpora" from "service_role";

revoke trigger on table "public"."knowledge_corpora" from "service_role";

revoke truncate on table "public"."knowledge_corpora" from "service_role";

revoke update on table "public"."knowledge_corpora" from "service_role";

revoke delete on table "public"."knowledge_events" from "anon";

revoke insert on table "public"."knowledge_events" from "anon";

revoke references on table "public"."knowledge_events" from "anon";

revoke select on table "public"."knowledge_events" from "anon";

revoke trigger on table "public"."knowledge_events" from "anon";

revoke truncate on table "public"."knowledge_events" from "anon";

revoke update on table "public"."knowledge_events" from "anon";

revoke delete on table "public"."knowledge_events" from "authenticated";

revoke insert on table "public"."knowledge_events" from "authenticated";

revoke references on table "public"."knowledge_events" from "authenticated";

revoke select on table "public"."knowledge_events" from "authenticated";

revoke trigger on table "public"."knowledge_events" from "authenticated";

revoke truncate on table "public"."knowledge_events" from "authenticated";

revoke update on table "public"."knowledge_events" from "authenticated";

revoke delete on table "public"."knowledge_events" from "service_role";

revoke insert on table "public"."knowledge_events" from "service_role";

revoke references on table "public"."knowledge_events" from "service_role";

revoke select on table "public"."knowledge_events" from "service_role";

revoke trigger on table "public"."knowledge_events" from "service_role";

revoke truncate on table "public"."knowledge_events" from "service_role";

revoke update on table "public"."knowledge_events" from "service_role";

revoke delete on table "public"."knowledge_sources" from "anon";

revoke insert on table "public"."knowledge_sources" from "anon";

revoke references on table "public"."knowledge_sources" from "anon";

revoke select on table "public"."knowledge_sources" from "anon";

revoke trigger on table "public"."knowledge_sources" from "anon";

revoke truncate on table "public"."knowledge_sources" from "anon";

revoke update on table "public"."knowledge_sources" from "anon";

revoke delete on table "public"."knowledge_sources" from "authenticated";

revoke insert on table "public"."knowledge_sources" from "authenticated";

revoke references on table "public"."knowledge_sources" from "authenticated";

revoke select on table "public"."knowledge_sources" from "authenticated";

revoke trigger on table "public"."knowledge_sources" from "authenticated";

revoke truncate on table "public"."knowledge_sources" from "authenticated";

revoke update on table "public"."knowledge_sources" from "authenticated";

revoke delete on table "public"."knowledge_sources" from "service_role";

revoke insert on table "public"."knowledge_sources" from "service_role";

revoke references on table "public"."knowledge_sources" from "service_role";

revoke select on table "public"."knowledge_sources" from "service_role";

revoke trigger on table "public"."knowledge_sources" from "service_role";

revoke truncate on table "public"."knowledge_sources" from "service_role";

revoke update on table "public"."knowledge_sources" from "service_role";

revoke delete on table "public"."learning_runs" from "anon";

revoke insert on table "public"."learning_runs" from "anon";

revoke references on table "public"."learning_runs" from "anon";

revoke select on table "public"."learning_runs" from "anon";

revoke trigger on table "public"."learning_runs" from "anon";

revoke truncate on table "public"."learning_runs" from "anon";

revoke update on table "public"."learning_runs" from "anon";

revoke delete on table "public"."learning_runs" from "authenticated";

revoke insert on table "public"."learning_runs" from "authenticated";

revoke references on table "public"."learning_runs" from "authenticated";

revoke select on table "public"."learning_runs" from "authenticated";

revoke trigger on table "public"."learning_runs" from "authenticated";

revoke truncate on table "public"."learning_runs" from "authenticated";

revoke update on table "public"."learning_runs" from "authenticated";

revoke delete on table "public"."learning_runs" from "service_role";

revoke insert on table "public"."learning_runs" from "service_role";

revoke references on table "public"."learning_runs" from "service_role";

revoke select on table "public"."learning_runs" from "service_role";

revoke trigger on table "public"."learning_runs" from "service_role";

revoke truncate on table "public"."learning_runs" from "service_role";

revoke update on table "public"."learning_runs" from "service_role";

revoke delete on table "public"."materiality_sets" from "anon";

revoke insert on table "public"."materiality_sets" from "anon";

revoke references on table "public"."materiality_sets" from "anon";

revoke select on table "public"."materiality_sets" from "anon";

revoke trigger on table "public"."materiality_sets" from "anon";

revoke truncate on table "public"."materiality_sets" from "anon";

revoke update on table "public"."materiality_sets" from "anon";

revoke delete on table "public"."materiality_sets" from "authenticated";

revoke insert on table "public"."materiality_sets" from "authenticated";

revoke references on table "public"."materiality_sets" from "authenticated";

revoke select on table "public"."materiality_sets" from "authenticated";

revoke trigger on table "public"."materiality_sets" from "authenticated";

revoke truncate on table "public"."materiality_sets" from "authenticated";

revoke update on table "public"."materiality_sets" from "authenticated";

revoke delete on table "public"."materiality_sets" from "service_role";

revoke insert on table "public"."materiality_sets" from "service_role";

revoke references on table "public"."materiality_sets" from "service_role";

revoke select on table "public"."materiality_sets" from "service_role";

revoke trigger on table "public"."materiality_sets" from "service_role";

revoke truncate on table "public"."materiality_sets" from "service_role";

revoke update on table "public"."materiality_sets" from "service_role";

revoke delete on table "public"."members" from "anon";

revoke insert on table "public"."members" from "anon";

revoke references on table "public"."members" from "anon";

revoke select on table "public"."members" from "anon";

revoke trigger on table "public"."members" from "anon";

revoke truncate on table "public"."members" from "anon";

revoke update on table "public"."members" from "anon";

revoke delete on table "public"."members" from "authenticated";

revoke insert on table "public"."members" from "authenticated";

revoke references on table "public"."members" from "authenticated";

revoke select on table "public"."members" from "authenticated";

revoke trigger on table "public"."members" from "authenticated";

revoke truncate on table "public"."members" from "authenticated";

revoke update on table "public"."members" from "authenticated";

revoke delete on table "public"."members" from "service_role";

revoke insert on table "public"."members" from "service_role";

revoke references on table "public"."members" from "service_role";

revoke select on table "public"."members" from "service_role";

revoke trigger on table "public"."members" from "service_role";

revoke truncate on table "public"."members" from "service_role";

revoke update on table "public"."members" from "service_role";

revoke delete on table "public"."memberships" from "anon";

revoke insert on table "public"."memberships" from "anon";

revoke references on table "public"."memberships" from "anon";

revoke select on table "public"."memberships" from "anon";

revoke trigger on table "public"."memberships" from "anon";

revoke truncate on table "public"."memberships" from "anon";

revoke update on table "public"."memberships" from "anon";

revoke delete on table "public"."memberships" from "authenticated";

revoke insert on table "public"."memberships" from "authenticated";

revoke references on table "public"."memberships" from "authenticated";

revoke select on table "public"."memberships" from "authenticated";

revoke trigger on table "public"."memberships" from "authenticated";

revoke truncate on table "public"."memberships" from "authenticated";

revoke update on table "public"."memberships" from "authenticated";

revoke delete on table "public"."memberships" from "service_role";

revoke insert on table "public"."memberships" from "service_role";

revoke references on table "public"."memberships" from "service_role";

revoke select on table "public"."memberships" from "service_role";

revoke trigger on table "public"."memberships" from "service_role";

revoke truncate on table "public"."memberships" from "service_role";

revoke update on table "public"."memberships" from "service_role";

revoke delete on table "public"."misstatements" from "anon";

revoke insert on table "public"."misstatements" from "anon";

revoke references on table "public"."misstatements" from "anon";

revoke select on table "public"."misstatements" from "anon";

revoke trigger on table "public"."misstatements" from "anon";

revoke truncate on table "public"."misstatements" from "anon";

revoke update on table "public"."misstatements" from "anon";

revoke delete on table "public"."misstatements" from "authenticated";

revoke insert on table "public"."misstatements" from "authenticated";

revoke references on table "public"."misstatements" from "authenticated";

revoke select on table "public"."misstatements" from "authenticated";

revoke trigger on table "public"."misstatements" from "authenticated";

revoke truncate on table "public"."misstatements" from "authenticated";

revoke update on table "public"."misstatements" from "authenticated";

revoke delete on table "public"."misstatements" from "service_role";

revoke insert on table "public"."misstatements" from "service_role";

revoke references on table "public"."misstatements" from "service_role";

revoke select on table "public"."misstatements" from "service_role";

revoke trigger on table "public"."misstatements" from "service_role";

revoke truncate on table "public"."misstatements" from "service_role";

revoke update on table "public"."misstatements" from "service_role";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."notifications" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";

revoke references on table "public"."notifications" from "authenticated";

revoke select on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke update on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."organizations" from "anon";

revoke insert on table "public"."organizations" from "anon";

revoke references on table "public"."organizations" from "anon";

revoke select on table "public"."organizations" from "anon";

revoke trigger on table "public"."organizations" from "anon";

revoke truncate on table "public"."organizations" from "anon";

revoke update on table "public"."organizations" from "anon";

revoke delete on table "public"."organizations" from "authenticated";

revoke insert on table "public"."organizations" from "authenticated";

revoke references on table "public"."organizations" from "authenticated";

revoke select on table "public"."organizations" from "authenticated";

revoke trigger on table "public"."organizations" from "authenticated";

revoke truncate on table "public"."organizations" from "authenticated";

revoke update on table "public"."organizations" from "authenticated";

revoke delete on table "public"."organizations" from "service_role";

revoke insert on table "public"."organizations" from "service_role";

revoke references on table "public"."organizations" from "service_role";

revoke select on table "public"."organizations" from "service_role";

revoke trigger on table "public"."organizations" from "service_role";

revoke truncate on table "public"."organizations" from "service_role";

revoke update on table "public"."organizations" from "service_role";

revoke delete on table "public"."pbc_items" from "anon";

revoke insert on table "public"."pbc_items" from "anon";

revoke references on table "public"."pbc_items" from "anon";

revoke select on table "public"."pbc_items" from "anon";

revoke trigger on table "public"."pbc_items" from "anon";

revoke truncate on table "public"."pbc_items" from "anon";

revoke update on table "public"."pbc_items" from "anon";

revoke delete on table "public"."pbc_items" from "authenticated";

revoke insert on table "public"."pbc_items" from "authenticated";

revoke references on table "public"."pbc_items" from "authenticated";

revoke select on table "public"."pbc_items" from "authenticated";

revoke trigger on table "public"."pbc_items" from "authenticated";

revoke truncate on table "public"."pbc_items" from "authenticated";

revoke update on table "public"."pbc_items" from "authenticated";

revoke delete on table "public"."pbc_items" from "service_role";

revoke insert on table "public"."pbc_items" from "service_role";

revoke references on table "public"."pbc_items" from "service_role";

revoke select on table "public"."pbc_items" from "service_role";

revoke trigger on table "public"."pbc_items" from "service_role";

revoke truncate on table "public"."pbc_items" from "service_role";

revoke update on table "public"."pbc_items" from "service_role";

revoke delete on table "public"."pbc_requests" from "anon";

revoke insert on table "public"."pbc_requests" from "anon";

revoke references on table "public"."pbc_requests" from "anon";

revoke select on table "public"."pbc_requests" from "anon";

revoke trigger on table "public"."pbc_requests" from "anon";

revoke truncate on table "public"."pbc_requests" from "anon";

revoke update on table "public"."pbc_requests" from "anon";

revoke delete on table "public"."pbc_requests" from "authenticated";

revoke insert on table "public"."pbc_requests" from "authenticated";

revoke references on table "public"."pbc_requests" from "authenticated";

revoke select on table "public"."pbc_requests" from "authenticated";

revoke trigger on table "public"."pbc_requests" from "authenticated";

revoke truncate on table "public"."pbc_requests" from "authenticated";

revoke update on table "public"."pbc_requests" from "authenticated";

revoke delete on table "public"."pbc_requests" from "service_role";

revoke insert on table "public"."pbc_requests" from "service_role";

revoke references on table "public"."pbc_requests" from "service_role";

revoke select on table "public"."pbc_requests" from "service_role";

revoke trigger on table "public"."pbc_requests" from "service_role";

revoke truncate on table "public"."pbc_requests" from "service_role";

revoke update on table "public"."pbc_requests" from "service_role";

revoke delete on table "public"."policies" from "anon";

revoke insert on table "public"."policies" from "anon";

revoke references on table "public"."policies" from "anon";

revoke select on table "public"."policies" from "anon";

revoke trigger on table "public"."policies" from "anon";

revoke truncate on table "public"."policies" from "anon";

revoke update on table "public"."policies" from "anon";

revoke delete on table "public"."policies" from "authenticated";

revoke insert on table "public"."policies" from "authenticated";

revoke references on table "public"."policies" from "authenticated";

revoke select on table "public"."policies" from "authenticated";

revoke trigger on table "public"."policies" from "authenticated";

revoke truncate on table "public"."policies" from "authenticated";

revoke update on table "public"."policies" from "authenticated";

revoke delete on table "public"."policies" from "service_role";

revoke insert on table "public"."policies" from "service_role";

revoke references on table "public"."policies" from "service_role";

revoke select on table "public"."policies" from "service_role";

revoke trigger on table "public"."policies" from "service_role";

revoke truncate on table "public"."policies" from "service_role";

revoke update on table "public"."policies" from "service_role";

revoke delete on table "public"."portal_sessions" from "anon";

revoke insert on table "public"."portal_sessions" from "anon";

revoke references on table "public"."portal_sessions" from "anon";

revoke select on table "public"."portal_sessions" from "anon";

revoke trigger on table "public"."portal_sessions" from "anon";

revoke truncate on table "public"."portal_sessions" from "anon";

revoke update on table "public"."portal_sessions" from "anon";

revoke delete on table "public"."portal_sessions" from "authenticated";

revoke insert on table "public"."portal_sessions" from "authenticated";

revoke references on table "public"."portal_sessions" from "authenticated";

revoke select on table "public"."portal_sessions" from "authenticated";

revoke trigger on table "public"."portal_sessions" from "authenticated";

revoke truncate on table "public"."portal_sessions" from "authenticated";

revoke update on table "public"."portal_sessions" from "authenticated";

revoke delete on table "public"."portal_sessions" from "service_role";

revoke insert on table "public"."portal_sessions" from "service_role";

revoke references on table "public"."portal_sessions" from "service_role";

revoke select on table "public"."portal_sessions" from "service_role";

revoke trigger on table "public"."portal_sessions" from "service_role";

revoke truncate on table "public"."portal_sessions" from "service_role";

revoke update on table "public"."portal_sessions" from "service_role";

revoke delete on table "public"."risks" from "anon";

revoke insert on table "public"."risks" from "anon";

revoke references on table "public"."risks" from "anon";

revoke select on table "public"."risks" from "anon";

revoke trigger on table "public"."risks" from "anon";

revoke truncate on table "public"."risks" from "anon";

revoke update on table "public"."risks" from "anon";

revoke delete on table "public"."risks" from "authenticated";

revoke insert on table "public"."risks" from "authenticated";

revoke references on table "public"."risks" from "authenticated";

revoke select on table "public"."risks" from "authenticated";

revoke trigger on table "public"."risks" from "authenticated";

revoke truncate on table "public"."risks" from "authenticated";

revoke update on table "public"."risks" from "authenticated";

revoke delete on table "public"."risks" from "service_role";

revoke insert on table "public"."risks" from "service_role";

revoke references on table "public"."risks" from "service_role";

revoke select on table "public"."risks" from "service_role";

revoke trigger on table "public"."risks" from "service_role";

revoke truncate on table "public"."risks" from "service_role";

revoke update on table "public"."risks" from "service_role";

revoke delete on table "public"."samples" from "anon";

revoke insert on table "public"."samples" from "anon";

revoke references on table "public"."samples" from "anon";

revoke select on table "public"."samples" from "anon";

revoke trigger on table "public"."samples" from "anon";

revoke truncate on table "public"."samples" from "anon";

revoke update on table "public"."samples" from "anon";

revoke delete on table "public"."samples" from "authenticated";

revoke insert on table "public"."samples" from "authenticated";

revoke references on table "public"."samples" from "authenticated";

revoke select on table "public"."samples" from "authenticated";

revoke trigger on table "public"."samples" from "authenticated";

revoke truncate on table "public"."samples" from "authenticated";

revoke update on table "public"."samples" from "authenticated";

revoke delete on table "public"."samples" from "service_role";

revoke insert on table "public"."samples" from "service_role";

revoke references on table "public"."samples" from "service_role";

revoke select on table "public"."samples" from "service_role";

revoke trigger on table "public"."samples" from "service_role";

revoke truncate on table "public"."samples" from "service_role";

revoke update on table "public"."samples" from "service_role";

revoke delete on table "public"."tasks" from "anon";

revoke insert on table "public"."tasks" from "anon";

revoke references on table "public"."tasks" from "anon";

revoke select on table "public"."tasks" from "anon";

revoke trigger on table "public"."tasks" from "anon";

revoke truncate on table "public"."tasks" from "anon";

revoke update on table "public"."tasks" from "anon";

revoke delete on table "public"."tasks" from "authenticated";

revoke insert on table "public"."tasks" from "authenticated";

revoke references on table "public"."tasks" from "authenticated";

revoke select on table "public"."tasks" from "authenticated";

revoke trigger on table "public"."tasks" from "authenticated";

revoke truncate on table "public"."tasks" from "authenticated";

revoke update on table "public"."tasks" from "authenticated";

revoke delete on table "public"."tasks" from "service_role";

revoke insert on table "public"."tasks" from "service_role";

revoke references on table "public"."tasks" from "service_role";

revoke select on table "public"."tasks" from "service_role";

revoke trigger on table "public"."tasks" from "service_role";

revoke truncate on table "public"."tasks" from "service_role";

revoke update on table "public"."tasks" from "service_role";

revoke delete on table "public"."tax" from "anon";

revoke insert on table "public"."tax" from "anon";

revoke references on table "public"."tax" from "anon";

revoke select on table "public"."tax" from "anon";

revoke trigger on table "public"."tax" from "anon";

revoke truncate on table "public"."tax" from "anon";

revoke update on table "public"."tax" from "anon";

revoke delete on table "public"."tax" from "authenticated";

revoke insert on table "public"."tax" from "authenticated";

revoke references on table "public"."tax" from "authenticated";

revoke select on table "public"."tax" from "authenticated";

revoke trigger on table "public"."tax" from "authenticated";

revoke truncate on table "public"."tax" from "authenticated";

revoke update on table "public"."tax" from "authenticated";

revoke delete on table "public"."tax" from "service_role";

revoke insert on table "public"."tax" from "service_role";

revoke references on table "public"."tax" from "service_role";

revoke select on table "public"."tax" from "service_role";

revoke trigger on table "public"."tax" from "service_role";

revoke truncate on table "public"."tax" from "service_role";

revoke update on table "public"."tax" from "service_role";

revoke delete on table "public"."tests" from "anon";

revoke insert on table "public"."tests" from "anon";

revoke references on table "public"."tests" from "anon";

revoke select on table "public"."tests" from "anon";

revoke trigger on table "public"."tests" from "anon";

revoke truncate on table "public"."tests" from "anon";

revoke update on table "public"."tests" from "anon";

revoke delete on table "public"."tests" from "authenticated";

revoke insert on table "public"."tests" from "authenticated";

revoke references on table "public"."tests" from "authenticated";

revoke select on table "public"."tests" from "authenticated";

revoke trigger on table "public"."tests" from "authenticated";

revoke truncate on table "public"."tests" from "authenticated";

revoke update on table "public"."tests" from "authenticated";

revoke delete on table "public"."tests" from "service_role";

revoke insert on table "public"."tests" from "service_role";

revoke references on table "public"."tests" from "service_role";

revoke select on table "public"."tests" from "service_role";

revoke trigger on table "public"."tests" from "service_role";

revoke truncate on table "public"."tests" from "service_role";

revoke update on table "public"."tests" from "service_role";

revoke delete on table "public"."transactions" from "anon";

revoke insert on table "public"."transactions" from "anon";

revoke references on table "public"."transactions" from "anon";

revoke select on table "public"."transactions" from "anon";

revoke trigger on table "public"."transactions" from "anon";

revoke truncate on table "public"."transactions" from "anon";

revoke update on table "public"."transactions" from "anon";

revoke delete on table "public"."transactions" from "authenticated";

revoke insert on table "public"."transactions" from "authenticated";

revoke references on table "public"."transactions" from "authenticated";

revoke select on table "public"."transactions" from "authenticated";

revoke trigger on table "public"."transactions" from "authenticated";

revoke truncate on table "public"."transactions" from "authenticated";

revoke update on table "public"."transactions" from "authenticated";

revoke delete on table "public"."transactions" from "service_role";

revoke insert on table "public"."transactions" from "service_role";

revoke references on table "public"."transactions" from "service_role";

revoke select on table "public"."transactions" from "service_role";

revoke trigger on table "public"."transactions" from "service_role";

revoke truncate on table "public"."transactions" from "service_role";

revoke update on table "public"."transactions" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."vat_returns" from "anon";

revoke insert on table "public"."vat_returns" from "anon";

revoke references on table "public"."vat_returns" from "anon";

revoke select on table "public"."vat_returns" from "anon";

revoke trigger on table "public"."vat_returns" from "anon";

revoke truncate on table "public"."vat_returns" from "anon";

revoke update on table "public"."vat_returns" from "anon";

revoke delete on table "public"."vat_returns" from "authenticated";

revoke insert on table "public"."vat_returns" from "authenticated";

revoke references on table "public"."vat_returns" from "authenticated";

revoke select on table "public"."vat_returns" from "authenticated";

revoke trigger on table "public"."vat_returns" from "authenticated";

revoke truncate on table "public"."vat_returns" from "authenticated";

revoke update on table "public"."vat_returns" from "authenticated";

revoke delete on table "public"."vat_returns" from "service_role";

revoke insert on table "public"."vat_returns" from "service_role";

revoke references on table "public"."vat_returns" from "service_role";

revoke select on table "public"."vat_returns" from "service_role";

revoke trigger on table "public"."vat_returns" from "service_role";

revoke truncate on table "public"."vat_returns" from "service_role";

revoke update on table "public"."vat_returns" from "service_role";

revoke delete on table "public"."vat_rules" from "anon";

revoke insert on table "public"."vat_rules" from "anon";

revoke references on table "public"."vat_rules" from "anon";

revoke select on table "public"."vat_rules" from "anon";

revoke trigger on table "public"."vat_rules" from "anon";

revoke truncate on table "public"."vat_rules" from "anon";

revoke update on table "public"."vat_rules" from "anon";

revoke delete on table "public"."vat_rules" from "authenticated";

revoke insert on table "public"."vat_rules" from "authenticated";

revoke references on table "public"."vat_rules" from "authenticated";

revoke select on table "public"."vat_rules" from "authenticated";

revoke trigger on table "public"."vat_rules" from "authenticated";

revoke truncate on table "public"."vat_rules" from "authenticated";

revoke update on table "public"."vat_rules" from "authenticated";

revoke delete on table "public"."vat_rules" from "service_role";

revoke insert on table "public"."vat_rules" from "service_role";

revoke references on table "public"."vat_rules" from "service_role";

revoke select on table "public"."vat_rules" from "service_role";

revoke trigger on table "public"."vat_rules" from "service_role";

revoke truncate on table "public"."vat_rules" from "service_role";

revoke update on table "public"."vat_rules" from "service_role";

revoke delete on table "public"."vendor_category_mappings" from "anon";

revoke insert on table "public"."vendor_category_mappings" from "anon";

revoke references on table "public"."vendor_category_mappings" from "anon";

revoke select on table "public"."vendor_category_mappings" from "anon";

revoke trigger on table "public"."vendor_category_mappings" from "anon";

revoke truncate on table "public"."vendor_category_mappings" from "anon";

revoke update on table "public"."vendor_category_mappings" from "anon";

revoke delete on table "public"."vendor_category_mappings" from "authenticated";

revoke insert on table "public"."vendor_category_mappings" from "authenticated";

revoke references on table "public"."vendor_category_mappings" from "authenticated";

revoke select on table "public"."vendor_category_mappings" from "authenticated";

revoke trigger on table "public"."vendor_category_mappings" from "authenticated";

revoke truncate on table "public"."vendor_category_mappings" from "authenticated";

revoke update on table "public"."vendor_category_mappings" from "authenticated";

revoke delete on table "public"."vendor_category_mappings" from "service_role";

revoke insert on table "public"."vendor_category_mappings" from "service_role";

revoke references on table "public"."vendor_category_mappings" from "service_role";

revoke select on table "public"."vendor_category_mappings" from "service_role";

revoke trigger on table "public"."vendor_category_mappings" from "service_role";

revoke truncate on table "public"."vendor_category_mappings" from "service_role";

revoke update on table "public"."vendor_category_mappings" from "service_role";

revoke delete on table "public"."vendors" from "anon";

revoke insert on table "public"."vendors" from "anon";

revoke references on table "public"."vendors" from "anon";

revoke select on table "public"."vendors" from "anon";

revoke trigger on table "public"."vendors" from "anon";

revoke truncate on table "public"."vendors" from "anon";

revoke update on table "public"."vendors" from "anon";

revoke delete on table "public"."vendors" from "authenticated";

revoke insert on table "public"."vendors" from "authenticated";

revoke references on table "public"."vendors" from "authenticated";

revoke select on table "public"."vendors" from "authenticated";

revoke trigger on table "public"."vendors" from "authenticated";

revoke truncate on table "public"."vendors" from "authenticated";

revoke update on table "public"."vendors" from "authenticated";

revoke delete on table "public"."vendors" from "service_role";

revoke insert on table "public"."vendors" from "service_role";

revoke references on table "public"."vendors" from "service_role";

revoke select on table "public"."vendors" from "service_role";

revoke trigger on table "public"."vendors" from "service_role";

revoke truncate on table "public"."vendors" from "service_role";

revoke update on table "public"."vendors" from "service_role";

revoke delete on table "public"."vies_checks" from "anon";

revoke insert on table "public"."vies_checks" from "anon";

revoke references on table "public"."vies_checks" from "anon";

revoke select on table "public"."vies_checks" from "anon";

revoke trigger on table "public"."vies_checks" from "anon";

revoke truncate on table "public"."vies_checks" from "anon";

revoke update on table "public"."vies_checks" from "anon";

revoke delete on table "public"."vies_checks" from "authenticated";

revoke insert on table "public"."vies_checks" from "authenticated";

revoke references on table "public"."vies_checks" from "authenticated";

revoke select on table "public"."vies_checks" from "authenticated";

revoke trigger on table "public"."vies_checks" from "authenticated";

revoke truncate on table "public"."vies_checks" from "authenticated";

revoke update on table "public"."vies_checks" from "authenticated";

revoke delete on table "public"."vies_checks" from "service_role";

revoke insert on table "public"."vies_checks" from "service_role";

revoke references on table "public"."vies_checks" from "service_role";

revoke select on table "public"."vies_checks" from "service_role";

revoke trigger on table "public"."vies_checks" from "service_role";

revoke truncate on table "public"."vies_checks" from "service_role";

revoke update on table "public"."vies_checks" from "service_role";

revoke delete on table "public"."web_knowledge_sources" from "anon";

revoke insert on table "public"."web_knowledge_sources" from "anon";

revoke references on table "public"."web_knowledge_sources" from "anon";

revoke select on table "public"."web_knowledge_sources" from "anon";

revoke trigger on table "public"."web_knowledge_sources" from "anon";

revoke truncate on table "public"."web_knowledge_sources" from "anon";

revoke update on table "public"."web_knowledge_sources" from "anon";

revoke delete on table "public"."web_knowledge_sources" from "authenticated";

revoke insert on table "public"."web_knowledge_sources" from "authenticated";

revoke references on table "public"."web_knowledge_sources" from "authenticated";

revoke select on table "public"."web_knowledge_sources" from "authenticated";

revoke trigger on table "public"."web_knowledge_sources" from "authenticated";

revoke truncate on table "public"."web_knowledge_sources" from "authenticated";

revoke update on table "public"."web_knowledge_sources" from "authenticated";

revoke delete on table "public"."web_knowledge_sources" from "service_role";

revoke insert on table "public"."web_knowledge_sources" from "service_role";

revoke references on table "public"."web_knowledge_sources" from "service_role";

revoke select on table "public"."web_knowledge_sources" from "service_role";

revoke trigger on table "public"."web_knowledge_sources" from "service_role";

revoke truncate on table "public"."web_knowledge_sources" from "service_role";

revoke update on table "public"."web_knowledge_sources" from "service_role";

revoke delete on table "public"."workpapers" from "anon";

revoke insert on table "public"."workpapers" from "anon";

revoke references on table "public"."workpapers" from "anon";

revoke select on table "public"."workpapers" from "anon";

revoke trigger on table "public"."workpapers" from "anon";

revoke truncate on table "public"."workpapers" from "anon";

revoke update on table "public"."workpapers" from "anon";

revoke delete on table "public"."workpapers" from "authenticated";

revoke insert on table "public"."workpapers" from "authenticated";

revoke references on table "public"."workpapers" from "authenticated";

revoke select on table "public"."workpapers" from "authenticated";

revoke trigger on table "public"."workpapers" from "authenticated";

revoke truncate on table "public"."workpapers" from "authenticated";

revoke update on table "public"."workpapers" from "authenticated";

revoke delete on table "public"."workpapers" from "service_role";

revoke insert on table "public"."workpapers" from "service_role";

revoke references on table "public"."workpapers" from "service_role";

revoke select on table "public"."workpapers" from "service_role";

revoke trigger on table "public"."workpapers" from "service_role";

revoke truncate on table "public"."workpapers" from "service_role";

revoke update on table "public"."workpapers" from "service_role";

alter table "public"."chunks" drop constraint "chunks_content_hash_key";

drop index if exists "public"."chunks_content_hash_key";

drop index if exists "public"."activity_log_org_created_at_idx";

alter table "public"."chunks" alter column "content_hash" set default encode(extensions.digest(COALESCE(content, ''::text), 'sha256'::text), 'hex'::text);

alter table "public"."chunks" alter column "last_embedded_at" drop default;

alter table "public"."chunks" alter column "last_embedded_at" drop not null;

CREATE UNIQUE INDEX chunks_org_id_content_hash_key ON public.chunks USING btree (org_id, content_hash);

CREATE INDEX activity_log_org_created_at_idx ON public.activity_log USING btree (org_id, created_at);

alter table "public"."chunks" add constraint "chunks_org_id_content_hash_key" UNIQUE using index "chunks_org_id_content_hash_key";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.has_min_role(org uuid, min role_level)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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


