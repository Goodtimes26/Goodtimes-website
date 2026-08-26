-- Geef de pushfunctie de berichtcontext atomair mee met de reactieclaim.
-- Hiermee is geen afzonderlijke, door RLS beïnvloedbare lookup meer nodig.

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
  message_title text;
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
  select title into message_title from public.band_messages where id = comment_row.message_id;
  if message_title is null then return null; end if;

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
    'message_id', comment_row.message_id,
    'message_title', message_title,
    'subscriptions', device_rows
  );
end;
$$;

revoke all on function public.claim_message_comment_push_context(uuid,uuid,text) from public;
grant execute on function public.claim_message_comment_push_context(uuid,uuid,text) to anon, authenticated, service_role;
