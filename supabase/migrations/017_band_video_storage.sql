-- Voeg video toe aan de bestaande beveiligde mediabucket.
-- Niet-destructief: bucket, bestanden, paden, databasegegevens en RLS blijven behouden.

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav',
      'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'
    ]
where id = 'band-audio';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'band-audio') then
    raise exception 'De bestaande bucket band-audio ontbreekt; voer eerst migratie 007 uit.';
  end if;
end;
$$;
