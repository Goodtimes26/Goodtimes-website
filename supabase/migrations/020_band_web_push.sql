-- GoodTimes Band-app: Web Push-subscriptions per gebruiker en apparaat.
-- Niet-destructief: bestaande Band-appgegevens blijven ongewijzigd.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "Members read own push subscriptions" on public.push_subscriptions;
drop policy if exists "Members remove own push subscriptions" on public.push_subscriptions;

create policy "Members read own push subscriptions"
on public.push_subscriptions for select to authenticated
using (public.is_band_member() and user_id = auth.uid());

create policy "Members remove own push subscriptions"
on public.push_subscriptions for delete to authenticated
using (public.is_band_member() and user_id = auth.uid());

revoke all on public.push_subscriptions from anon;
grant select, delete on public.push_subscriptions to authenticated;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare subscription_id uuid;
begin
  if not public.is_band_member() then raise exception 'Alleen bandleden kunnen pushmeldingen inschakelen'; end if;
  if coalesce(length(p_endpoint), 0) < 20 or coalesce(length(p_p256dh), 0) < 20 or coalesce(length(p_auth_key), 0) < 8 then
    raise exception 'Ongeldige push-subscription';
  end if;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth_key, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth_key, left(p_user_agent, 500))
  on conflict (endpoint) do update set
    user_id = auth.uid(), p256dh = excluded.p256dh, auth_key = excluded.auth_key,
    user_agent = excluded.user_agent, updated_at = now()
  returning id into subscription_id;
  return subscription_id;
end;
$$;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.register_push_subscription(text,text,text,text) from public;
revoke all on function public.unregister_push_subscription(text) from public;
grant execute on function public.register_push_subscription(text,text,text,text) to authenticated;
grant execute on function public.unregister_push_subscription(text) to authenticated;

create table if not exists public.push_notification_events (
  event_key uuid primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.push_notification_events enable row level security;
revoke all on public.push_notification_events from anon, authenticated;

