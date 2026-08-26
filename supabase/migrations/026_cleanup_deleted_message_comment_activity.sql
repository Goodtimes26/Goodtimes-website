-- Verwijder uitsluitend de activiteit van een verwijderde reactie.
create or replace function public.on_message_comment_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.band_activity_log
  where entity_type = 'message' and entity_id = old.message_id
    and new_data->>'comment_id' = old.id::text;
  return old;
end;
$$;

revoke all on function public.on_message_comment_deleted() from public, anon, authenticated;
drop trigger if exists message_comment_deleted on public.message_comments;
create trigger message_comment_deleted after delete on public.message_comments
for each row execute function public.on_message_comment_deleted();
