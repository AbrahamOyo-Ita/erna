-- Supabase projects can carry broad default table grants for Data API roles.
-- RLS blocked those writes, but financial and moderation tables should not
-- expose the underlying write capability at all. Revoke it schema-wide and
-- add back only the two column-scoped mutations the browser actually uses.

do $$
declare
  v_table record;
begin
  for v_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on table %I.%I from anon, authenticated',
      v_table.schema_name,
      v_table.table_name
    );
  end loop;
end
$$;

revoke insert, update, delete on table storage.objects from anon, authenticated;

-- Keep future migration-created tables least-privileged by default.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables
  from anon, authenticated;

-- Safe, owner-scoped browser mutations retained by their existing RLS
-- policies. All other writes go through authenticated server handlers.
grant update (full_name, phone) on table public.profiles to authenticated;
grant update (read_at) on table public.notifications to authenticated;
