-- Maak na iedere succesvolle audio-metadata-insert precies één Bandbericht.
-- Bestaande audio wordt bewust niet terugwerkend verwerkt om historische spam te voorkomen.

alter table public.band_messages
  add column if not exists source_file_id uuid references public.band_files(id) on delete set null;

create unique index if not exists band_messages_source_file_unique
  on public.band_messages(source_file_id)
  where source_file_id is not null;

create or replace function public.audio_uploader_first_name(profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when identity like '%cindy%' or identity like '%lensvelt%' then 'Cindy'
    when identity like '%joost%' or identity like '%vermeulen%' or identity like '%j.c.m.%' then 'Joost'
    when identity like '%luuk%' or identity like '%luu-key%' or identity like '%verzantvoort%' then 'Luuk'
    when identity like '%eric%' or identity like '%langenkamp%' then 'Eric'
    when identity like '%esther%' then 'Esther'
    when identity like '%eddie%' or identity like '%e.voorthuijsen%' then 'Eddie'
    else 'Een bandlid'
  end
  from (
    select lower(concat_ws(' ', display_name, email)) as identity
    from public.profiles
    where id = profile_id
  ) profile_identity;
$$;

revoke all on function public.audio_uploader_first_name(uuid) from public, anon, authenticated;

create or replace function public.create_audio_upload_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uploader_name text;
begin
  if new.storage_path is null or lower(coalesce(new.category, '')) <> 'audio' then
    return new;
  end if;

  uploader_name := coalesce(public.audio_uploader_first_name(new.uploaded_by), 'Een bandlid');

  insert into public.band_messages (author_id, title, body, important, source_file_id)
  values (
    new.uploaded_by,
    'Audio bestand toegevoegd',
    uploader_name || E' heeft een nieuw audiobestand toegevoegd:\n\n' || new.title,
    false,
    new.id
  )
  on conflict (source_file_id) where source_file_id is not null do nothing;

  return new;
end;
$$;

revoke all on function public.create_audio_upload_message() from public, anon, authenticated;

drop trigger if exists band_files_audio_message on public.band_files;
create trigger band_files_audio_message
after insert on public.band_files
for each row execute function public.create_audio_upload_message();
