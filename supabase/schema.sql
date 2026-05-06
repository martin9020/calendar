create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  phone text,
  notes text,
  status text not null default 'Потвърдена',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reservations enable row level security;

drop policy if exists "Authenticated users can read reservations" on public.reservations;
drop policy if exists "Authenticated users can create reservations" on public.reservations;
drop policy if exists "Authenticated users can update reservations" on public.reservations;
drop policy if exists "Authenticated users can delete reservations" on public.reservations;

create policy "Authenticated users can read reservations"
  on public.reservations
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create reservations"
  on public.reservations
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update reservations"
  on public.reservations
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete reservations"
  on public.reservations
  for delete
  to authenticated
  using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_reservations_updated_at on public.reservations;

create trigger set_reservations_updated_at
  before update on public.reservations
  for each row
  execute function public.set_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.reservations;
exception
  when duplicate_object then null;
end;
$$;
