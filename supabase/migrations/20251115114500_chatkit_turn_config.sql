set check_function_bodies = off;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'system_settings' and column_name = 'chatkit_turn_config') then
    alter table public.system_settings add column chatkit_turn_config jsonb default '{}'::jsonb;
  end if;
end $$;
