-- Interne YouTube-linkbeheerfunctie voor de centrale songs-tabel.
-- Geen schema- of datawijzigingen; alleen beheerders mogen songgegevens muteren.

drop policy if exists "Band members create songs" on public.songs;
drop policy if exists "Band members update songs" on public.songs;
drop policy if exists "Admins create songs" on public.songs;
drop policy if exists "Admins update songs" on public.songs;

create policy "Admins create songs"
on public.songs for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

create policy "Admins update songs"
on public.songs for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.update_song_youtube(p_song_id uuid, p_youtube_url text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_url text := nullif(trim(p_youtube_url), '');
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Alleen beheerders mogen YouTube-links wijzigen';
  end if;

  if not exists (select 1 from public.songs where id = p_song_id) then
    raise exception 'Nummer niet gevonden';
  end if;

  if clean_url is not null and lower(clean_url) !~ '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)(:[0-9]+)?(/|$)' then
    raise exception 'Gebruik een geldige youtube.com- of youtu.be-link met http of https';
  end if;

  update public.songs
  set youtube_url = clean_url
  where id = p_song_id;

  return clean_url;
end;
$$;

revoke all on function public.update_song_youtube(uuid, text) from public;
grant execute on function public.update_song_youtube(uuid, text) to authenticated;

