-- GoodTimes Band-app: betrouwbare details voor 'Wat is er nieuw?'.
-- Niet-destructief: bestaande gegevens blijven ongewijzigd; alleen toekomstige
-- toevoegingen en wijzigingen worden gelogd.

create table if not exists public.band_activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('message','setlist','rehearsal','performance','file','song')),
  entity_id uuid not null,
  action text not null check (action in ('created','updated')),
  title text not null,
  old_data jsonb,
  new_data jsonb not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists band_activity_log_created_idx on public.band_activity_log(created_at desc);
create index if not exists band_activity_log_entity_idx on public.band_activity_log(entity_type, entity_id, created_at desc);
alter table public.band_activity_log enable row level security;

drop policy if exists "Band members read activity log" on public.band_activity_log;
create policy "Band members read activity log" on public.band_activity_log
for select to authenticated using (public.is_band_member());
grant select on public.band_activity_log to authenticated;

create or replace function public.log_band_activity()
returns trigger language plpgsql security definer set search_path = public as $$
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
  if kind is null or (tg_table_name = 'events' and new.event_type <> 'performance') then return new; end if;
  item_title := coalesce(payload->>'title', payload->>'name', payload->>'description', 'GoodTimes-item');
  actor := coalesce(
    nullif(payload->>'updated_by','')::uuid,
    nullif(payload->>'author_id','')::uuid,
    nullif(payload->>'uploaded_by','')::uuid,
    nullif(payload->>'created_by','')::uuid,
    auth.uid()
  );
  if tg_op = 'UPDATE' and previous = payload then return new; end if;
  insert into public.band_activity_log(entity_type, entity_id, action, title, old_data, new_data, actor_id)
  values (kind, new.id, case when tg_op = 'INSERT' then 'created' else 'updated' end, item_title, previous, payload, actor);
  return new;
end;
$$;

revoke all on function public.log_band_activity() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['band_messages','setlists','rehearsals','events','band_files','songs'] loop
    execute format('drop trigger if exists log_band_activity on public.%I', table_name);
    execute format('create trigger log_band_activity after insert or update on public.%I for each row execute function public.log_band_activity()', table_name);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'band_activity_log') then
    alter publication supabase_realtime add table public.band_activity_log;
  end if;
end $$;
