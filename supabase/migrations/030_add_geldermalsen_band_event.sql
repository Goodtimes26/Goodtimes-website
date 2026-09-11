-- GoodTimes Band-app: openbaar optreden in Geldermalsen.
-- Niet-destructief en idempotent: bestaande agenda- en beschikbaarheidsdata blijven intact.

do $$
declare
  event_owner uuid;
begin
  if exists (
    select 1
    from public.events
    where event_date = date '2027-02-26'
      and event_type = 'performance'
      and lower(description) = lower('Schenkerij De Beurs')
      and lower(coalesce(location, '')) = lower('Geldermalsen')
  ) then
    return;
  end if;

  -- Gebruik dezelfde beheerder als het bestaande optreden in Venray.
  select created_by
  into event_owner
  from public.events
  where event_date = date '2026-10-10'
    and event_type = 'performance'
    and (
      lower(coalesce(location, '')) like '%venray%'
      or lower(description) like '%gouwe leeuw%'
    )
  order by created_at
  limit 1;

  if event_owner is null then
    raise exception 'Bestaand Venray-optreden niet gevonden; Geldermalsen is niet toegevoegd.';
  end if;

  insert into public.events (
    event_date,
    start_time,
    end_time,
    location,
    description,
    notes,
    event_type,
    created_by,
    status,
    is_public
  ) values (
    date '2027-02-26',
    time '20:30',
    null,
    'Geldermalsen',
    'Schenkerij De Beurs',
    'Gratis toegang',
    'performance',
    event_owner,
    'confirmed',
    true
  );
end;
$$;
