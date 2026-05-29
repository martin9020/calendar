-- Run this once in Supabase SQL Editor for project hqmgnouwuastlsenalre.
-- It keeps the public holiday site working through public.public_availability
-- while locking full reservation details and all edits to the two calendar users.

alter table public.reservations enable row level security;

drop policy if exists "Authenticated users can read reservations" on public.reservations;
drop policy if exists "Authenticated users can create reservations" on public.reservations;
drop policy if exists "Authenticated users can update reservations" on public.reservations;
drop policy if exists "Authenticated users can delete reservations" on public.reservations;
drop policy if exists "Calendar users can read reservations" on public.reservations;
drop policy if exists "Calendar users can create reservations" on public.reservations;
drop policy if exists "Calendar users can update reservations" on public.reservations;
drop policy if exists "Calendar users can delete reservations" on public.reservations;
drop policy if exists "Anyone can read reservations" on public.reservations;
drop policy if exists "Anyone can create reservations" on public.reservations;
drop policy if exists "Anyone can update reservations" on public.reservations;
drop policy if exists "Anyone can delete reservations" on public.reservations;

grant usage on schema public to anon, authenticated;
revoke all on table public.reservations from anon;
grant select, insert, update, delete on table public.reservations to authenticated;

create or replace function public.is_calendar_user()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'martinizvorov@gmail.com',
    'martinizvorov+toma@gmail.com'
  );
$$;

create policy "Calendar users can read reservations"
  on public.reservations
  for select
  to authenticated
  using (public.is_calendar_user());

create policy "Calendar users can create reservations"
  on public.reservations
  for insert
  to authenticated
  with check (public.is_calendar_user());

create policy "Calendar users can update reservations"
  on public.reservations
  for update
  to authenticated
  using (public.is_calendar_user())
  with check (public.is_calendar_user());

create policy "Calendar users can delete reservations"
  on public.reservations
  for delete
  to authenticated
  using (public.is_calendar_user());

drop view if exists public.public_availability;

create view public.public_availability as
select date, status
from public.reservations;

grant select on public.public_availability to anon, authenticated;
