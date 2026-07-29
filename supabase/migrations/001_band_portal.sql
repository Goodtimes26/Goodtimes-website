-- GoodTimes bandportaal
-- Voer dit bestand uit in de Supabase SQL Editor nadat Authentication is geconfigureerd.

create extension if not exists pgcrypto;

do $$ begin
  create type public.band_role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.availability_status as enum ('available', 'unavailable', 'maybe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('new', 'pending', 'available', 'unavailable', 'option', 'confirmed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.response_status as enum ('yes', 'no', 'tentative');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.band_event_type as enum ('rehearsal', 'performance', 'meeting', 'photoshoot', 'other');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.band_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status public.availability_status not null,
  private_note text check (char_length(private_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  event_name text not null check (char_length(event_name) between 1 and 160),
  location text,
  city text,
  performance_type text,
  start_time time,
  end_time time,
  contact_name text,
  contact_phone text,
  contact_email text,
  offered_fee text,
  response_deadline date,
  notes text,
  status public.request_status not null default 'new',
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.response_status not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  description text not null check (char_length(description) between 1 and 240),
  notes text,
  event_type public.band_event_type not null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists availability_date_idx on public.availability(date);
create index if not exists requests_event_date_idx on public.requests(event_date);
create index if not exists request_responses_request_idx on public.request_responses(request_id);
create index if not exists events_event_date_idx on public.events(event_date);

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists user_roles_updated_at on public.user_roles;
create trigger user_roles_updated_at before update on public.user_roles
for each row execute function public.set_updated_at();
drop trigger if exists availability_updated_at on public.availability;
create trigger availability_updated_at before update on public.availability
for each row execute function public.set_updated_at();
drop trigger if exists requests_updated_at on public.requests;
create trigger requests_updated_at before update on public.requests
for each row execute function public.set_updated_at();
drop trigger if exists request_responses_updated_at on public.request_responses;
create trigger request_responses_updated_at before update on public.request_responses
for each row execute function public.set_updated_at();
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.refresh_request_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request uuid;
  member_count integer;
  yes_count integer;
  no_count integer;
  tentative_count integer;
  current_status public.request_status;
begin
  if tg_op = 'DELETE' then
    target_request := old.request_id;
  else
    target_request := new.request_id;
  end if;
  select status into current_status from public.requests where id = target_request;
  if current_status in ('confirmed', 'cancelled', 'option') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select count(*) into member_count from public.profiles;
  select
    count(*) filter (where status = 'yes'),
    count(*) filter (where status = 'no'),
    count(*) filter (where status = 'tentative')
  into yes_count, no_count, tentative_count
  from public.request_responses
  where request_id = target_request;

  update public.requests
  set status = case
    when no_count > 0 then 'unavailable'::public.request_status
    when member_count > 0 and yes_count = member_count then 'available'::public.request_status
    else 'pending'::public.request_status
  end
  where id = target_request;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists request_response_status_refresh on public.request_responses;
create trigger request_response_status_refresh
after insert or update or delete on public.request_responses
for each row execute function public.refresh_request_availability();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.availability enable row level security;
alter table public.requests enable row level security;
alter table public.request_responses enable row level security;
alter table public.events enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated
using (true);

drop policy if exists "Users update own profile or admins update all" on public.profiles;
create policy "Users update own profile or admins update all"
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Users read own role and admins read all roles" on public.user_roles;
create policy "Users read own role and admins read all roles"
on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Admins manage roles"
on public.user_roles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own availability and admins read all" on public.availability;
create policy "Users read own availability and admins read all"
on public.availability for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own availability" on public.availability;
create policy "Users insert own availability"
on public.availability for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own availability" on public.availability;
create policy "Users update own availability"
on public.availability for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own availability" on public.availability;
create policy "Users delete own availability"
on public.availability for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated users read requests" on public.requests;
create policy "Authenticated users read requests"
on public.requests for select to authenticated
using (true);

drop policy if exists "Admins create requests" on public.requests;
create policy "Admins create requests"
on public.requests for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Admins update requests" on public.requests;
create policy "Admins update requests"
on public.requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete requests" on public.requests;
create policy "Admins delete requests"
on public.requests for delete to authenticated
using (public.is_admin());

drop policy if exists "Users read own responses and admins read all" on public.request_responses;
create policy "Users read own responses and admins read all"
on public.request_responses for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own response" on public.request_responses;
create policy "Users insert own response"
on public.request_responses for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own response" on public.request_responses;
create policy "Users update own response"
on public.request_responses for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own response" on public.request_responses;
create policy "Users delete own response"
on public.request_responses for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Authenticated users read events" on public.events;
create policy "Authenticated users read events"
on public.events for select to authenticated
using (true);

drop policy if exists "Admins create events" on public.events;
create policy "Admins create events"
on public.events for insert to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Admins update events" on public.events;
create policy "Admins update events"
on public.events for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete events" on public.events;
create policy "Admins delete events"
on public.events for delete to authenticated
using (public.is_admin());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.availability to authenticated;
grant select, insert, update, delete on public.requests to authenticated;
grant select, insert, update, delete on public.request_responses to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

-- Nadat Eddie via Authentication > Users is aangemaakt:
-- update public.user_roles
-- set role = 'admin'
-- where user_id = (select id from public.profiles where lower(display_name) = 'eddie');
