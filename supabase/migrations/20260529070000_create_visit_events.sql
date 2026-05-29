create table if not exists public.visit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site text not null,
  path text,
  referrer text,
  user_agent text,
  ip_hash text not null,
  country text,
  timezone text,
  notified boolean not null default false
);

alter table public.visit_events enable row level security;

revoke all on table public.visit_events from anon, authenticated;

create index if not exists visit_events_site_ip_created_idx
  on public.visit_events (site, ip_hash, created_at desc);

create index if not exists visit_events_created_idx
  on public.visit_events (created_at desc);
