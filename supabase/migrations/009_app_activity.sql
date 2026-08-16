-- Minimal presence information for the private GoodTimes Band app.
-- Members can only touch their own row through the security-definer function.
-- Only administrators can read the activity overview.

create table if not exists public.app_activity (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_active_at timestamptz not null default now(),
  last_login_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.app_activity enable row level security;

drop policy if exists "Admins read app activity" on public.app_activity;
create policy "Admins read app activity"
on public.app_activity for select to authenticated
using (public.is_admin());

revoke all on public.app_activity from anon, authenticated;
grant select on public.app_activity to authenticated;

create or replace function public.touch_app_activity()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  reliable_last_login timestamptz;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  select last_sign_in_at
  into reliable_last_login
  from auth.users
  where id = actor;

  insert into public.app_activity (user_id, last_active_at, last_login_at, updated_at)
  values (actor, now(), reliable_last_login, now())
  on conflict (user_id) do update
  set last_active_at = now(),
      last_login_at = excluded.last_login_at,
      updated_at = now();
end;
$$;

revoke all on function public.touch_app_activity() from public, anon;
grant execute on function public.touch_app_activity() to authenticated;
