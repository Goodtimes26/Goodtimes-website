-- GoodTimes Band-app: verstuur de bestaande pushmelding betrouwbaar na een opgeslagen bericht.
-- Niet-destructief: berichten en abonnementen blijven ongewijzigd.

create extension if not exists pg_net with schema extensions;

create unique index if not exists push_notification_events_entity_unique
  on public.push_notification_events(event_type, entity_id);

create or replace function public.notify_new_band_message_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://tjdrexjmwadnqrakixmo.supabase.co/functions/v1/send-band-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'message_created',
      'entityId', new.id,
      'eventKey', new.id,
      'databaseTrigger', true
    ),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

revoke all on function public.notify_new_band_message_push() from public;

drop trigger if exists notify_new_band_message_push on public.band_messages;
create trigger notify_new_band_message_push
after insert on public.band_messages
for each row execute function public.notify_new_band_message_push();
