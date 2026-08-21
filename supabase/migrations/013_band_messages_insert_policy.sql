-- Herstel uitsluitend het plaatsen van Bandberichten voor bestaande bandleden.
-- Niet-destructief: tabellen, bestaande berichten en overige policies blijven intact.

alter table public.band_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.band_messages to authenticated;
grant execute on function public.is_band_member(uuid) to authenticated;

drop policy if exists "Band members create messages" on public.band_messages;
create policy "Band members create messages"
on public.band_messages
for insert
to authenticated
with check (
  public.is_band_member(auth.uid())
  and author_id = auth.uid()
);
