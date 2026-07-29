-- Privacyvriendelijke website-analyse voor GoodTimes.
-- Er worden uitsluitend pagina, willekeurige sessiecode en tijdstip bewaard.

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 200 and path like '/%'),
  visit_id uuid not null,
  viewed_at timestamptz not null default now()
);

create index if not exists page_views_viewed_at_idx on public.page_views(viewed_at desc);
create index if not exists page_views_path_idx on public.page_views(path);

alter table public.page_views enable row level security;

drop policy if exists "Visitors can record page views" on public.page_views;
create policy "Visitors can record page views"
on public.page_views for insert to anon, authenticated
with check (char_length(path) between 1 and 200 and path like '/%');

drop policy if exists "Admins can read page views" on public.page_views;
create policy "Admins can read page views"
on public.page_views for select to authenticated
using (public.is_admin());

grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;
grant usage, select on sequence public.page_views_id_seq to anon, authenticated;
