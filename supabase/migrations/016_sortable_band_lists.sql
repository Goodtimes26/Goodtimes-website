-- Permanente handmatige volgorde voor de geordende Bandportaal-lijsten.
-- Niet-destructief: bestaande volgordes worden als beginvolgorde overgenomen.

alter table public.songs add column if not exists portal_order integer;
alter table public.rehearsal_songs add column if not exists position integer;
alter table public.rehearsal_songs alter column position set default 0;

with ranked as (
  select id, row_number() over (order by source_order nulls last, title, id) - 1 as position
  from public.songs
)
update public.songs as song
set portal_order = ranked.position
from ranked
where song.id = ranked.id
  and song.portal_order is null;

with ranked as (
  select id, row_number() over (partition by rehearsal_id order by created_at, id) - 1 as position
  from public.rehearsal_songs
)
update public.rehearsal_songs as rehearsal_song
set position = ranked.position
from ranked
where rehearsal_song.id = ranked.id
  and rehearsal_song.position is null;

alter table public.rehearsal_songs alter column position set not null;

create index if not exists songs_portal_order_idx on public.songs(portal_order);
create index if not exists rehearsal_songs_order_idx on public.rehearsal_songs(rehearsal_id, position);

create or replace function public.save_song_order(p_song_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  supplied_count integer := coalesce(cardinality(p_song_ids), 0);
  distinct_count integer;
  existing_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Alleen beheerders mogen de repertoirevolgorde wijzigen';
  end if;

  select count(distinct song_id) into distinct_count
  from unnest(coalesce(p_song_ids, array[]::uuid[])) as song_id;
  select count(*) into existing_count
  from public.songs where id = any(coalesce(p_song_ids, array[]::uuid[]));

  if supplied_count <> distinct_count or supplied_count <> existing_count then
    raise exception 'Ongeldige repertoirevolgorde';
  end if;

  update public.songs as song
  set portal_order = ordered.position - 1
  from unnest(coalesce(p_song_ids, array[]::uuid[])) with ordinality as ordered(song_id, position)
  where song.id = ordered.song_id;
end;
$$;

create or replace function public.save_rehearsal_song_order(p_rehearsal_id uuid, p_song_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  supplied_count integer := coalesce(cardinality(p_song_ids), 0);
  distinct_count integer;
  existing_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Alleen beheerders mogen repetitienummers wijzigen';
  end if;

  if not exists (select 1 from public.rehearsals where id = p_rehearsal_id) then
    raise exception 'Repetitie niet gevonden';
  end if;

  select count(distinct song_id) into distinct_count
  from unnest(coalesce(p_song_ids, array[]::uuid[])) as song_id;
  select count(*) into existing_count
  from public.songs where id = any(coalesce(p_song_ids, array[]::uuid[]));

  if supplied_count <> distinct_count or supplied_count <> existing_count then
    raise exception 'Ongeldige repetitievolgorde';
  end if;

  delete from public.rehearsal_songs
  where rehearsal_id = p_rehearsal_id
    and not (song_id = any(coalesce(p_song_ids, array[]::uuid[])));

  insert into public.rehearsal_songs (rehearsal_id, song_id, position, priority, status)
  select p_rehearsal_id, ordered.song_id, ordered.position - 1, 3, 'new'
  from unnest(coalesce(p_song_ids, array[]::uuid[])) with ordinality as ordered(song_id, position)
  on conflict (rehearsal_id, song_id) do update
  set position = excluded.position;
end;
$$;

revoke all on function public.save_song_order(uuid[]) from public, anon;
revoke all on function public.save_rehearsal_song_order(uuid, uuid[]) from public, anon;
grant execute on function public.save_song_order(uuid[]) to authenticated;
grant execute on function public.save_rehearsal_song_order(uuid, uuid[]) to authenticated;
