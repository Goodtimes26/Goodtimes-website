-- GoodTimes Band-app uitbreiding
-- Voer dit bestand na 001_band_portal.sql en 002_privacy_analytics.sql uit.
-- Alle interne tabellen zijn standaard uitsluitend toegankelijk voor ingelogde bandleden.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists instrument text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;

alter table public.events add column if not exists address text;
alter table public.events add column if not exists city text;
alter table public.events add column if not exists contact_name text;
alter table public.events add column if not exists status text not null default 'confirmed';
alter table public.events add column if not exists is_public boolean not null default false;
alter table public.events add column if not exists request_id uuid references public.requests(id) on delete set null;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  artist text,
  vocalist text,
  musical_key text,
  bpm integer check (bpm is null or bpm between 30 and 300),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 3600),
  youtube_url text,
  status text not null default 'active' check (status in ('new', 'attention', 'almost', 'ready', 'active', 'inactive')),
  score smallint check (score is null or score between 1 and 5),
  notes text,
  active boolean not null default true,
  source_order integer,
  created_by uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.song_notes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  event_id uuid references public.events(id) on delete set null,
  setlist_date date,
  version integer not null default 1 check (version > 0),
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  position integer not null check (position >= 0),
  block_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (setlist_id, position)
);

create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  general_notes text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rehearsal_songs (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  priority smallint not null default 3 check (priority between 1 and 5),
  status text not null default 'new' check (status in ('new', 'attention', 'almost', 'ready')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rehearsal_id, song_id)
);

create table if not exists public.band_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 3000),
  important boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.band_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.band_files (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  category text,
  external_url text,
  storage_path text,
  description text,
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  check (external_url is not null or storage_path is not null)
);

create index if not exists songs_title_idx on public.songs(title);
create index if not exists setlists_date_idx on public.setlists(setlist_date);
create index if not exists setlist_items_order_idx on public.setlist_items(setlist_id, position);
create index if not exists rehearsals_event_idx on public.rehearsals(event_id);
create index if not exists messages_created_idx on public.band_messages(created_at desc);

drop trigger if exists songs_updated_at on public.songs;
create trigger songs_updated_at before update on public.songs for each row execute function public.set_updated_at();
drop trigger if exists song_notes_updated_at on public.song_notes;
create trigger song_notes_updated_at before update on public.song_notes for each row execute function public.set_updated_at();
drop trigger if exists setlists_updated_at on public.setlists;
create trigger setlists_updated_at before update on public.setlists for each row execute function public.set_updated_at();
drop trigger if exists setlist_items_updated_at on public.setlist_items;
create trigger setlist_items_updated_at before update on public.setlist_items for each row execute function public.set_updated_at();
drop trigger if exists rehearsals_updated_at on public.rehearsals;
create trigger rehearsals_updated_at before update on public.rehearsals for each row execute function public.set_updated_at();
drop trigger if exists rehearsal_songs_updated_at on public.rehearsal_songs;
create trigger rehearsal_songs_updated_at before update on public.rehearsal_songs for each row execute function public.set_updated_at();
drop trigger if exists band_messages_updated_at on public.band_messages;
create trigger band_messages_updated_at before update on public.band_messages for each row execute function public.set_updated_at();

alter table public.songs enable row level security;
alter table public.song_notes enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.rehearsals enable row level security;
alter table public.rehearsal_songs enable row level security;
alter table public.band_messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.band_files enable row level security;

-- Alleen actieve, ingelogde bandaccounts mogen interne gegevens lezen.
create or replace function public.is_band_member(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = check_user);
$$;
revoke all on function public.is_band_member(uuid) from public;
grant execute on function public.is_band_member(uuid) to authenticated;

-- Teamstatus zonder privé-opmerkingen. Geen invoer betekent beschikbaar.
create or replace function public.team_availability(target_date date)
returns table (user_id uuid, display_name text, status public.availability_status)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, coalesce(a.status, 'available'::public.availability_status)
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  left join public.availability a on a.user_id = p.id and a.date = target_date
  where public.is_band_member(auth.uid())
  order by p.display_name;
$$;
revoke all on function public.team_availability(date) from public;
grant execute on function public.team_availability(date) to authenticated;

-- Alle bandleden mogen de reacties op aanvragen zien; wijzigen blijft beperkt
-- tot de eigen reactie (of een beheerder) door de bestaande mutation policies.
drop policy if exists "Users read own responses and admins read all" on public.request_responses;
drop policy if exists "Band members read responses" on public.request_responses;
create policy "Band members read responses"
on public.request_responses for select
to authenticated
using (public.is_band_member());

-- Publieke agenda bevat uitsluitend expliciet openbaar gemarkeerde, bevestigde optredens.
create or replace view public.public_events as
select id, event_date, start_time, end_time, location, city, description
from public.events
where is_public = true and event_type = 'performance' and status = 'confirmed';
grant select on public.public_events to anon, authenticated;

-- Generieke leesregels: anonieme bezoekers krijgen geen toegang.
do $$
declare table_name text;
begin
  foreach table_name in array array['songs','song_notes','setlists','setlist_items','rehearsals','rehearsal_songs','band_messages','message_reads','band_files']
  loop
    execute format('drop policy if exists "Band members read %1$s" on public.%1$I', table_name);
    execute format('create policy "Band members read %1$s" on public.%1$I for select to authenticated using (public.is_band_member())', table_name);
  end loop;
end $$;

drop policy if exists "Band members create songs" on public.songs;
create policy "Band members create songs" on public.songs for insert to authenticated with check (public.is_band_member() and created_by = auth.uid());
drop policy if exists "Band members update songs" on public.songs;
create policy "Band members update songs" on public.songs for update to authenticated using (public.is_band_member()) with check (public.is_band_member());
drop policy if exists "Admins delete songs" on public.songs;
create policy "Admins delete songs" on public.songs for delete to authenticated using (public.is_admin());

drop policy if exists "Members manage own song notes" on public.song_notes;
create policy "Members manage own song notes" on public.song_notes for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());

drop policy if exists "Band members create setlists" on public.setlists;
create policy "Band members create setlists" on public.setlists for insert to authenticated with check (public.is_band_member() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "Band members update setlists" on public.setlists;
create policy "Band members update setlists" on public.setlists for update to authenticated using (public.is_band_member()) with check (public.is_band_member() and updated_by = auth.uid());
drop policy if exists "Admins delete setlists" on public.setlists;
create policy "Admins delete setlists" on public.setlists for delete to authenticated using (public.is_admin());

drop policy if exists "Band members manage setlist items" on public.setlist_items;
create policy "Band members manage setlist items" on public.setlist_items for all to authenticated using (public.is_band_member()) with check (public.is_band_member());

drop policy if exists "Band members create rehearsals" on public.rehearsals;
create policy "Band members create rehearsals" on public.rehearsals for insert to authenticated with check (public.is_band_member() and created_by = auth.uid());
drop policy if exists "Band members update rehearsals" on public.rehearsals;
create policy "Band members update rehearsals" on public.rehearsals for update to authenticated using (public.is_band_member()) with check (public.is_band_member());
drop policy if exists "Admins delete rehearsals" on public.rehearsals;
create policy "Admins delete rehearsals" on public.rehearsals for delete to authenticated using (public.is_admin());
drop policy if exists "Band members manage rehearsal songs" on public.rehearsal_songs;
create policy "Band members manage rehearsal songs" on public.rehearsal_songs for all to authenticated using (public.is_band_member()) with check (public.is_band_member());

drop policy if exists "Band members create messages" on public.band_messages;
create policy "Band members create messages" on public.band_messages for insert to authenticated with check (public.is_band_member() and author_id = auth.uid());
drop policy if exists "Authors update messages" on public.band_messages;
create policy "Authors update messages" on public.band_messages for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "Authors delete messages" on public.band_messages;
create policy "Authors delete messages" on public.band_messages for delete to authenticated using (author_id = auth.uid() or public.is_admin());
drop policy if exists "Members manage own read status" on public.message_reads;
create policy "Members manage own read status" on public.message_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins manage files" on public.band_files;
create policy "Admins manage files" on public.band_files for all to authenticated using (public.is_admin()) with check (public.is_admin() and uploaded_by = auth.uid());

grant select, insert, update, delete on public.songs, public.song_notes, public.setlists, public.setlist_items, public.rehearsals, public.rehearsal_songs, public.band_messages, public.message_reads, public.band_files to authenticated;
