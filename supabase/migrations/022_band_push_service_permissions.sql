-- GoodTimes Band-app: minimale serverrechten voor de beveiligde pushfunctie.
-- Geen rechten voor anon/authenticated en geen wijziging van bestaande gegevens.

grant select on public.band_messages to service_role;
grant select on public.profiles to service_role;
grant select on public.user_roles to service_role;
grant select on public.events to service_role;
grant select on public.rehearsals to service_role;
grant select, delete on public.push_subscriptions to service_role;
grant select, insert on public.push_notification_events to service_role;
