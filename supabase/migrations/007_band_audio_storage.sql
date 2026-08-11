-- Beveiligde audiobibliotheek voor het GoodTimes Bandportaal.
-- Bestaande links in band_files blijven ongewijzigd werken.

alter table public.band_files
  add column if not exists song_id uuid references public.songs(id) on delete set null,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes > 0),
  add column if not exists original_name text;

create index if not exists band_files_song_idx on public.band_files(song_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'band-audio',
  'band-audio',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Band members read band audio" on storage.objects;
create policy "Band members read band audio"
on storage.objects for select
to authenticated
using (bucket_id = 'band-audio' and public.is_band_member());

drop policy if exists "Admins upload band audio" on storage.objects;
create policy "Admins upload band audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'band-audio'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins delete band audio" on storage.objects;
create policy "Admins delete band audio"
on storage.objects for delete
to authenticated
using (bucket_id = 'band-audio' and public.is_admin());

comment on column public.band_files.song_id is 'Optionele koppeling naar het centrale repertoire.';
comment on column public.band_files.storage_path is 'Privépad in de Supabase Storage-bucket band-audio.';
