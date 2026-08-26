-- GoodTimes Band-app: reacties op bandberichten.
-- Niet-destructief: bestaande berichten en leesbevestigingen blijven behouden.

create table if not exists public.message_comments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.band_messages(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_comments_message_created_idx
on public.message_comments(message_id, created_at);

drop trigger if exists message_comments_updated_at on public.message_comments;
create trigger message_comments_updated_at before update on public.message_comments
for each row execute function public.set_updated_at();

alter table public.message_comments enable row level security;

drop policy if exists "Band members read message comments" on public.message_comments;
create policy "Band members read message comments" on public.message_comments
for select to authenticated using (public.is_band_member());

drop policy if exists "Band members add own comments" on public.message_comments;
create policy "Band members add own comments" on public.message_comments
for insert to authenticated
with check (public.is_band_member() and author_id = auth.uid());

drop policy if exists "Authors update own comments" on public.message_comments;
create policy "Authors update own comments" on public.message_comments
for update to authenticated
using (public.is_band_member() and author_id = auth.uid())
with check (public.is_band_member() and author_id = auth.uid());

drop policy if exists "Authors and admins delete comments" on public.message_comments;
create policy "Authors and admins delete comments" on public.message_comments
for delete to authenticated
using (public.is_band_member() and (author_id = auth.uid() or public.is_admin()));

grant select, insert, update, delete on public.message_comments to authenticated;

create or replace function public.on_message_comment_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare message_title text;
begin
  delete from public.message_reads
  where message_id = new.message_id and user_id <> new.author_id;

  insert into public.message_reads(message_id, user_id, read_at)
  values (new.message_id, new.author_id, now())
  on conflict (message_id, user_id) do update set read_at = excluded.read_at;

  select title into message_title from public.band_messages where id = new.message_id;
  insert into public.band_activity_log(entity_type, entity_id, action, title, new_data, actor_id)
  values ('message', new.message_id, 'updated', coalesce(message_title, 'Bandbericht'),
    jsonb_build_object('comment_id', new.id, 'message_id', new.message_id, 'change_summary', 'Nieuwe reactie'), new.author_id);
  return new;
end;
$$;

revoke all on function public.on_message_comment_created() from public, anon, authenticated;
drop trigger if exists message_comment_created on public.message_comments;
create trigger message_comment_created after insert on public.message_comments
for each row execute function public.on_message_comment_created();

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_comments') then
    alter publication supabase_realtime add table public.message_comments;
  end if;
end $$;
