-- ATENCAO: este script apaga objetos do schema public.
-- Ele nao apaga auth, storage nem configuracoes internas do Supabase.
do $$
declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  for r in (select viewname from pg_views where schemaname = 'public') loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;

  for r in (
    select p.proname as routine_name, oidvectortypes(p.proargtypes) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ) loop
    execute format('drop function if exists public.%I(%s) cascade', r.routine_name, r.args);
  end loop;

  for r in (select typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e') loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;
