-- Centrale, herhaalbare import van de bestaande GoodTimes Setlist Maker.
-- Niet-destructief voor bestaande nummers. Alleen items van eerder uit dezelfde
-- bron geïmporteerde setlists/repetities worden bij een herimport ververst.

alter table public.songs add column if not exists category text;
alter table public.songs add column if not exists source_system text;
alter table public.songs add column if not exists source_id text;

alter table public.setlists add column if not exists source_system text;
alter table public.setlists add column if not exists source_id text;

alter table public.rehearsals alter column event_id drop not null;
alter table public.rehearsals add column if not exists name text;
alter table public.rehearsals add column if not exists rehearsal_date date;
alter table public.rehearsals add column if not exists source_system text;
alter table public.rehearsals add column if not exists source_id text;

create unique index if not exists songs_source_identity_idx
  on public.songs(source_system, source_id)
  where source_system is not null and source_id is not null;
create unique index if not exists setlists_source_identity_idx
  on public.setlists(source_system, source_id)
  where source_system is not null and source_id is not null;
create unique index if not exists rehearsals_source_identity_idx
  on public.rehearsals(source_system, source_id)
  where source_system is not null and source_id is not null;

create or replace function public.normalized_song_identity(song_title text, song_artist text)
returns text
language sql immutable strict
as $$
  select regexp_replace(lower(trim(song_title)) || '|' || lower(trim(coalesce(song_artist, ''))), '[^a-z0-9]+', '', 'g');
$$;

create index if not exists songs_normalized_identity_idx
  on public.songs(public.normalized_song_identity(title, coalesce(artist, '')));

-- De openbare site krijgt uitsluitend de reeds openbare titel, categorie en volgorde.
-- Interne velden blijven achter RLS en zijn niet onderdeel van deze view.
create or replace view public.public_repertoire
with (security_invoker = false)
as
select id, title, category, source_order
from public.songs
where active = true
order by source_order nulls last, title;

revoke all on public.public_repertoire from public;
grant select on public.public_repertoire to anon, authenticated;

create or replace function public.import_setlist_maker(source_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  payload jsonb := coalesce(source_payload->'state', source_payload);
  source_song jsonb;
  source_list jsonb;
  source_song_id text;
  target_song_id uuid;
  target_list_id uuid;
  song_position integer;
  songs_inserted integer := 0;
  songs_updated integer := 0;
  duplicates_prevented integer := 0;
  setlists_imported integer := 0;
  rehearsals_imported integer := 0;
  items_imported integer := 0;
  parsed_date date;
begin
  if actor is null or not public.is_admin(actor) then
    raise exception 'Alleen een beheerder kan repertoire importeren.';
  end if;
  if jsonb_typeof(payload->'songs') <> 'array' then
    raise exception 'Ongeldig Setlist Maker-bestand: songs ontbreekt.';
  end if;

  create temporary table import_song_map (
    source_id text primary key,
    song_id uuid not null
  ) on commit drop;

  for source_song, song_position in
    select value, ordinality::integer - 1
    from jsonb_array_elements(payload->'songs') with ordinality
  loop
    source_song_id := nullif(trim(source_song->>'id'), '');
    if source_song_id is null or nullif(trim(source_song->>'title'), '') is null then
      continue;
    end if;

    select id into target_song_id
    from public.songs
    where source_system = 'goodtimes-setlist-maker' and source_id = source_song_id
    limit 1;

    if target_song_id is null then
      select id into target_song_id
      from public.songs
      where public.normalized_song_identity(title, coalesce(artist, '')) =
            public.normalized_song_identity(source_song->>'title', coalesce(source_song->>'artist', ''))
      order by created_at
      limit 1;
      if target_song_id is not null then
        duplicates_prevented := duplicates_prevented + 1;
      end if;
    end if;

    if target_song_id is null then
      insert into public.songs (
        title, artist, vocalist, musical_key, bpm, duration_seconds, youtube_url,
        status, score, notes, active, source_order, category, source_system, source_id, created_by
      ) values (
        trim(source_song->>'title'), nullif(trim(source_song->>'artist'), ''),
        nullif((select string_agg(value, ', ') from jsonb_array_elements_text(coalesce(source_song->'singers', '[]'::jsonb))), ''),
        nullif(trim(source_song->>'key'), ''), nullif(source_song->>'bpm', '')::integer,
        nullif(source_song->>'seconds', '')::integer, nullif(trim(source_song->>'youtube'), ''),
        case coalesce(source_song->>'rehearsalStatus', '2') when '1' then 'ready' when '2' then 'active' when '3' then 'almost' when '4' then 'attention' else 'new' end,
        greatest(1, least(5, coalesce(nullif(source_song->>'rehearsalStatus', '')::integer, 2))),
        nullif(trim(concat_ws(E'\n', nullif(source_song->>'notes', ''), nullif(source_song->>'rehearsalNotes', ''))), ''),
        coalesce((source_song->>'active')::boolean, true), song_position,
        nullif(trim(source_song->>'category'), ''), 'goodtimes-setlist-maker', source_song_id, actor
      ) returning id into target_song_id;
      songs_inserted := songs_inserted + 1;
    else
      update public.songs set
        title = trim(source_song->>'title'),
        artist = coalesce(nullif(trim(source_song->>'artist'), ''), artist),
        vocalist = coalesce(nullif((select string_agg(value, ', ') from jsonb_array_elements_text(coalesce(source_song->'singers', '[]'::jsonb))), ''), vocalist),
        musical_key = coalesce(nullif(trim(source_song->>'key'), ''), musical_key),
        bpm = coalesce(nullif(source_song->>'bpm', '')::integer, bpm),
        duration_seconds = coalesce(nullif(source_song->>'seconds', '')::integer, duration_seconds),
        youtube_url = coalesce(nullif(trim(source_song->>'youtube'), ''), youtube_url),
        status = case coalesce(source_song->>'rehearsalStatus', '2') when '1' then 'ready' when '2' then 'active' when '3' then 'almost' when '4' then 'attention' else 'new' end,
        score = greatest(1, least(5, coalesce(nullif(source_song->>'rehearsalStatus', '')::integer, score, 2))),
        notes = coalesce(nullif(trim(concat_ws(E'\n', nullif(source_song->>'notes', ''), nullif(source_song->>'rehearsalNotes', ''))), ''), notes),
        active = coalesce((source_song->>'active')::boolean, active),
        source_order = song_position,
        category = coalesce(nullif(trim(source_song->>'category'), ''), category),
        source_system = 'goodtimes-setlist-maker', source_id = source_song_id
      where id = target_song_id;
      songs_updated := songs_updated + 1;
    end if;
    insert into import_song_map values (source_song_id, target_song_id)
    on conflict (source_id) do update set song_id = excluded.song_id;
  end loop;

  for source_list in select value from jsonb_array_elements(coalesce(payload->'setlists', '[]'::jsonb))
  loop
    source_song_id := source_list->>'id';
    parsed_date := case
      when source_list->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then (source_list->>'date')::date
      when source_list->>'date' ~ '^\d{1,2}-\d{1,2}-\d{4}$' then to_date(source_list->>'date', 'DD-MM-YYYY')
      when source_list->>'date' ~ '^\d{1,2} juli \d{4}$' then to_date(replace(source_list->>'date', 'juli', '07'), 'DD MM YYYY')
      else null end;
    select id into target_list_id from public.setlists where source_system = 'goodtimes-setlist-maker' and source_id = source_song_id;
    if target_list_id is null then
      insert into public.setlists(name, setlist_date, source_system, source_id, created_by, updated_by)
      values (trim(source_list->>'name'), parsed_date, 'goodtimes-setlist-maker', source_song_id, actor, actor)
      returning id into target_list_id;
    else
      update public.setlists set name = trim(source_list->>'name'), setlist_date = parsed_date,
        archived = false, version = version + 1, updated_by = actor
      where id = target_list_id;
      delete from public.setlist_items where setlist_id = target_list_id;
    end if;
    song_position := 0;
    for source_song_id in select value from jsonb_array_elements_text(coalesce(source_list->'songIds', '[]'::jsonb))
    loop
      select song_id into target_song_id from import_song_map where source_id = source_song_id;
      if target_song_id is not null then
        insert into public.setlist_items(setlist_id, song_id, position) values (target_list_id, target_song_id, song_position);
        song_position := song_position + 1; items_imported := items_imported + 1;
      end if;
    end loop;
    setlists_imported := setlists_imported + 1;
  end loop;

  for source_list in select value from jsonb_array_elements(coalesce(payload->'rehearsalLists', '[]'::jsonb))
  loop
    source_song_id := source_list->>'id';
    parsed_date := case when source_list->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then (source_list->>'date')::date else null end;
    select id into target_list_id from public.rehearsals where source_system = 'goodtimes-setlist-maker' and source_id = source_song_id;
    if target_list_id is null then
      insert into public.rehearsals(name, rehearsal_date, source_system, source_id, created_by)
      values (trim(source_list->>'name'), parsed_date, 'goodtimes-setlist-maker', source_song_id, actor)
      returning id into target_list_id;
    else
      update public.rehearsals set name = trim(source_list->>'name'), rehearsal_date = parsed_date where id = target_list_id;
      delete from public.rehearsal_songs where rehearsal_id = target_list_id;
    end if;
    for source_song_id in select value from jsonb_array_elements_text(coalesce(source_list->'songIds', '[]'::jsonb))
    loop
      select song_id into target_song_id from import_song_map where source_id = source_song_id;
      if target_song_id is not null then
        insert into public.rehearsal_songs(rehearsal_id, song_id, priority, status)
        select target_list_id, target_song_id,
          greatest(1, least(5, coalesce(s.score, 3))),
          case when source_list->'recordedSongIds' ? source_song_id then 'ready' else
            case s.status when 'ready' then 'ready' when 'almost' then 'almost' when 'attention' then 'attention' else 'new' end end
        from public.songs s where s.id = target_song_id;
      end if;
    end loop;
    rehearsals_imported := rehearsals_imported + 1;
  end loop;

  return jsonb_build_object(
    'songs_inserted', songs_inserted, 'songs_updated', songs_updated,
    'duplicates_prevented', duplicates_prevented, 'setlists_imported', setlists_imported,
    'rehearsals_imported', rehearsals_imported, 'setlist_items_imported', items_imported
  );
end;
$$;

revoke all on function public.import_setlist_maker(jsonb) from public;
grant execute on function public.import_setlist_maker(jsonb) to authenticated;

