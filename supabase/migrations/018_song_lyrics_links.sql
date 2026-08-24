-- GoodTimes Band-app: optionele externe Songteksten.nl-link per centraal nummer.
-- Niet-destructief en herhaalbaar; er worden geen songteksten opgeslagen.

alter table public.songs
  add column if not exists lyrics_url text;

comment on column public.songs.lyrics_url is
  'Optionele externe Songteksten.nl-link; bevat nooit de songtekst zelf.';

grant select, update on public.songs to authenticated;
