-- GoodTimes Band-app: gedeelde leesbevestigingen, met uitsluitend eigen schrijfrechten.
-- Niet-destructief: bestaande berichten en leesstatussen blijven behouden.

drop policy if exists "Members manage own read status" on public.message_reads;
drop policy if exists "Band members read message receipts" on public.message_reads;
drop policy if exists "Members add own read status" on public.message_reads;
drop policy if exists "Members update own read status" on public.message_reads;
drop policy if exists "Members remove own read status" on public.message_reads;

create policy "Band members read message receipts"
on public.message_reads
for select
to authenticated
using (public.is_band_member());

create policy "Members add own read status"
on public.message_reads
for insert
to authenticated
with check (public.is_band_member() and user_id = auth.uid());

create policy "Members update own read status"
on public.message_reads
for update
to authenticated
using (public.is_band_member() and user_id = auth.uid())
with check (public.is_band_member() and user_id = auth.uid());

create policy "Members remove own read status"
on public.message_reads
for delete
to authenticated
using (public.is_band_member() and user_id = auth.uid());

grant select, insert, update, delete on public.message_reads to authenticated;
