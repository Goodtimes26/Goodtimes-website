-- GoodTimes Band-app: betrouwbare pushmelding na een opgeslagen reactie.
-- Niet-destructief en gekoppeld aan de bestaande pushinfrastructuur.

create or replace function public.claim_message_comment_push_context(
  p_comment_id uuid,
  p_event_key uuid,
  p_internal_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  comment_row public.message_comments%rowtype;
  actor_name text;
  device_rows jsonb;
  claimed integer;
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'band_push_internal_secret'
      and decrypted_secret = p_internal_secret
  ) then
    raise exception 'Ongeldige interne pushautorisatie' using errcode = '42501';
  end if;

  select * into comment_row from public.message_comments where id = p_comment_id;
  if not found then return null; end if;

  insert into public.push_notification_events(event_key, actor_id, event_type, entity_id)
  values (p_event_key, comment_row.author_id, 'message_comment_created', comment_row.id)
  on conflict (event_type, entity_id) do nothing;
  get diagnostics claimed = row_count;
  if claimed = 0 then return jsonb_build_object('duplicate', true); end if;

  select display_name into actor_name from public.profiles where id = comment_row.author_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth_key', auth_key
  )), '[]'::jsonb)
  into device_rows
  from public.push_subscriptions
  where user_id <> comment_row.author_id;

  return jsonb_build_object(
    'duplicate', false,
    'actor_id', comment_row.author_id,
    'display_name', coalesce(actor_name, 'Bandlid'),
    'subscriptions', device_rows
  );
end;
$$;

revoke all on function public.claim_message_comment_push_context(uuid,uuid,text) from public;
grant execute on function public.claim_message_comment_push_context(uuid,uuid,text) to anon, authenticated, service_role;

create or replace function public.notify_new_message_comment_push()
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
      'type', 'message_comment_created',
      'entityId', new.id,
      'eventKey', new.id,
      'databaseTrigger', true
    ),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

revoke all on function public.notify_new_message_comment_push() from public;
drop trigger if exists notify_new_message_comment_push on public.message_comments;
create trigger notify_new_message_comment_push
after insert on public.message_comments
for each row execute function public.notify_new_message_comment_push();
