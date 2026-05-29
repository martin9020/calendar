-- The calendar does not need Supabase Realtime. Keeping this table in the
-- realtime publication causes WAL/RLS processing even though normal REST reads
-- and writes are enough for this app.

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reservations'
  ) then
    alter publication supabase_realtime drop table public.reservations;
  end if;
end;
$$;
