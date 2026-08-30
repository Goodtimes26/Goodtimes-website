-- GoodTimes Band-app: een ontbrekende beschikbaarheidsregistratie is neutraal.
-- Niet-destructief: bestaande beschikbaarheidsgegevens blijven ongewijzigd.

drop function if exists public.team_availability(date);

create function public.team_availability(target_date date)
returns table (user_id uuid, display_name text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    coalesce(a.status::text, 'unset')
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  left join public.availability a on a.user_id = p.id and a.date = target_date
  where public.is_band_member(auth.uid())
  order by p.display_name;
$$;

revoke all on function public.team_availability(date) from public;
grant execute on function public.team_availability(date) to authenticated;
