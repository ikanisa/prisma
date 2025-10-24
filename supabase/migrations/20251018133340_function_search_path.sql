-- Phase 2 hardening: enforce explicit search_path on app schema functions

BEGIN;

ALTER FUNCTION app.activity_log_enrich() SET search_path TO app, auth, public;
ALTER FUNCTION app.create_api_key(text, text, jsonb) SET search_path TO app, auth, public;
ALTER FUNCTION app.current_user_id() SET search_path TO app, auth, public;
ALTER FUNCTION app.is_member_of(uuid, text) SET search_path TO app, auth, public;
ALTER FUNCTION app.is_org_admin(uuid) SET search_path TO app, auth, public;
ALTER FUNCTION app.is_org_member(uuid, org_role) SET search_path TO app, auth, public;
ALTER FUNCTION app.role_rank(org_role) SET search_path TO app, auth, public;
ALTER FUNCTION app.set_tenant(uuid) SET search_path TO app, auth, public;
ALTER FUNCTION app.touch_updated_at() SET search_path TO app, auth, public;

COMMIT;
