-- Realtime voor bandberichten en de persoonlijke gelezen-status.
-- Herhaalbaar: bestaande publicatiekoppelingen worden niet opnieuw toegevoegd.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'band_messages'
  ) then
    alter publication supabase_realtime add table public.band_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end
$$;
