-- Verwijder uitsluitend activity-logregels die horen bij een verwijderd Bandbericht.
-- Het Bandbericht zelf is op dit moment al verwijderd; overige activiteiten en data
-- blijven volledig intact.

create or replace function public.cleanup_deleted_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.band_activity_log
  where entity_type = 'message'
    and entity_id = old.id;

  return old;
end;
$$;

revoke all on function public.cleanup_deleted_message_activity() from public, anon, authenticated;

drop trigger if exists cleanup_deleted_message_activity on public.band_messages;
create trigger cleanup_deleted_message_activity
after delete on public.band_messages
for each row execute function public.cleanup_deleted_message_activity();
