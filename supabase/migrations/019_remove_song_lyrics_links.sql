-- GoodTimes Band-app: verwijder de teruggedraaide Songtekst-functionaliteit.
-- Bestaande nummers, YouTube-links, setlists en repetities blijven intact.

alter table public.songs
  drop column if exists lyrics_url;
