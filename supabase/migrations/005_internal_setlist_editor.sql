-- Interne setlist-editor voor het GoodTimes Bandportaal.
-- Niet-destructief voor songs, repetities en bestaande setlists.
-- Alleen beheerders mogen setlists en hun items wijzigen; alle bandleden houden leesrecht.

drop policy if exists "Band members create setlists" on public.setlists;
drop policy if exists "Band members update setlists" on public.setlists;
drop policy if exists "Admins create setlists" on public.setlists;
drop policy if exists "Admins update setlists" on public.setlists;

create policy "Admins create setlists"
on public.setlists for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid() and updated_by = auth.uid());

create policy "Admins update setlists"
on public.setlists for update
to authenticated
using (public.is_admin())
with check (public.is_admin() and updated_by = auth.uid());

drop policy if exists "Band members manage setlist items" on public.setlist_items;
drop policy if exists "Admins manage setlist items" on public.setlist_items;

create policy "Admins manage setlist items"
on public.setlist_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.save_setlist(
  p_setlist_id uuid,
  p_name text,
  p_setlist_date date,
  p_event_id uuid,
  p_song_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item_count integer := coalesce(cardinality(p_song_ids), 0);
  distinct_count integer;
  existing_song_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Alleen beheerders mogen setlists wijzigen';
  end if;

  if p_name is null or char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 160 then
    raise exception 'Ongeldige setlistnaam';
  end if;

  if not exists (select 1 from public.setlists where id = p_setlist_id) then
    raise exception 'Setlist niet gevonden';
  end if;

  select count(distinct song_id) into distinct_count
  from unnest(coalesce(p_song_ids, array[]::uuid[])) as song_id;

  if item_count <> distinct_count then
    raise exception 'Een nummer mag niet dubbel in dezelfde setlist staan';
  end if;

  select count(*) into existing_song_count
  from public.songs
  where id = any(coalesce(p_song_ids, array[]::uuid[]));

  if existing_song_count <> item_count then
    raise exception 'Een of meer nummers bestaan niet in het centrale repertoire';
  end if;

  update public.setlists
  set name = trim(p_name),
      setlist_date = p_setlist_date,
      event_id = p_event_id,
      updated_by = auth.uid(),
      version = version + 1
  where id = p_setlist_id;

  delete from public.setlist_items where setlist_id = p_setlist_id;

  insert into public.setlist_items (setlist_id, song_id, position)
  select p_setlist_id, song_id, ordinal - 1
  from unnest(coalesce(p_song_ids, array[]::uuid[])) with ordinality as selected(song_id, ordinal)
  order by ordinal;

  return jsonb_build_object('setlist_id', p_setlist_id, 'items_saved', item_count);
end;
$$;

revoke all on function public.save_setlist(uuid, text, date, uuid, uuid[]) from public;
grant execute on function public.save_setlist(uuid, text, date, uuid, uuid[]) to authenticated;

