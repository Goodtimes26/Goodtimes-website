-- GoodTimes Band-app: expliciete RLS-toegang uitsluitend voor de server-side pushfunctie.

drop policy if exists "Push service reads messages" on public.band_messages;
create policy "Push service reads messages" on public.band_messages for select to service_role using (true);

drop policy if exists "Push service reads profiles" on public.profiles;
create policy "Push service reads profiles" on public.profiles for select to service_role using (true);

drop policy if exists "Push service reads roles" on public.user_roles;
create policy "Push service reads roles" on public.user_roles for select to service_role using (true);

drop policy if exists "Push service reads events" on public.events;
create policy "Push service reads events" on public.events for select to service_role using (true);

drop policy if exists "Push service reads rehearsals" on public.rehearsals;
create policy "Push service reads rehearsals" on public.rehearsals for select to service_role using (true);

drop policy if exists "Push service reads subscriptions" on public.push_subscriptions;
create policy "Push service reads subscriptions" on public.push_subscriptions for select to service_role using (true);

drop policy if exists "Push service removes stale subscriptions" on public.push_subscriptions;
create policy "Push service removes stale subscriptions" on public.push_subscriptions for delete to service_role using (true);

drop policy if exists "Push service claims events" on public.push_notification_events;
create policy "Push service claims events" on public.push_notification_events for insert to service_role with check (true);
