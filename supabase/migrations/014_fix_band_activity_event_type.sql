-- Herstel fout 42703 in de generieke activity-logtrigger.
-- NEW heeft per brontabel een ander recordtype; lees tabelspecifieke velden
-- daarom uitsluitend uit de reeds opgebouwde JSON-payload.

create or replace function public.log_band_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb := to_jsonb(new);
  previous jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  kind text;
  item_title text;
  actor uuid;
begin
  kind := case tg_table_name
    when 'band_messages' then 'message'
    when 'setlists' then 'setlist'
    when 'rehearsals' then 'rehearsal'
    when 'events' then 'performance'
    when 'band_files' then 'file'
    when 'songs' then 'song'
  end;

  if kind is null then
    return new;
  end if;

  if tg_table_name = 'events' and payload->>'event_type' is distinct from 'performance' then
    return new;
  end if;

  item_title := coalesce(payload->>'title', payload->>'name', payload->>'description', 'GoodTimes-item');
  actor := coalesce(
    nullif(payload->>'updated_by', '')::uuid,
    nullif(payload->>'author_id', '')::uuid,
    nullif(payload->>'uploaded_by', '')::uuid,
    nullif(payload->>'created_by', '')::uuid,
    auth.uid()
  );

  if tg_op = 'UPDATE' and previous = payload then
    return new;
  end if;

  insert into public.band_activity_log(entity_type, entity_id, action, title, old_data, new_data, actor_id)
  values (kind, new.id, case when tg_op = 'INSERT' then 'created' else 'updated' end, item_title, previous, payload, actor);

  return new;
end;
$$;

revoke all on function public.log_band_activity() from public, anon, authenticated;
