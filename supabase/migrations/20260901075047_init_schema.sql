-- Lead Finder MVP — initial schema.
-- Projects are a CRM label only (product/service + niche keyword) — no
-- location. Businesses are global, deduped by DENUE id. Searches (ad-hoc,
-- location-based) are cached independently of any project. Leads are the
-- only thing that actually ties a business to a project.

create extension if not exists pgcrypto;

create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  product_service text not null,
  keyword         text not null,
  created_at      timestamptz not null default now()
);

create table if not exists businesses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  phone        text,
  email        text,
  website      text,
  lat          double precision not null,
  lng          double precision not null,
  source       text not null default 'denue',
  source_id    text,
  raw_json     jsonb not null,
  created_at   timestamptz not null default now(),
  unique (source, source_id)
);

create table if not exists denue_searches (
  id           uuid primary key default gen_random_uuid(),
  keyword      text not null,
  center_lat   double precision not null,
  center_lng   double precision not null,
  radius_m     integer not null,
  fetched_at   timestamptz not null default now(),
  result_count integer not null default 0
);

create index if not exists idx_denue_searches_lookup
  on denue_searches (keyword, round(center_lat::numeric, 4), round(center_lng::numeric, 4), radius_m);

create table if not exists search_results (
  search_id    uuid not null references denue_searches(id) on delete cascade,
  business_id  uuid not null references businesses(id) on delete cascade,
  primary key (search_id, business_id)
);

-- Placeholder for Phase 2 (business drawer / leads list).
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  business_id   uuid not null references businesses(id) on delete cascade,
  stage         text not null default 'new',
  contact_name  text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (project_id, business_id)
);

-- No auth yet (single-user prototype) — RLS is enabled per Supabase
-- requirements, but policies are fully permissive for now. Tighten these
-- (scope by auth.uid()) once auth is added.
alter table projects enable row level security;
alter table businesses enable row level security;
alter table denue_searches enable row level security;
alter table search_results enable row level security;
alter table leads enable row level security;

create policy "public access (no auth yet)" on projects for all using (true) with check (true);
create policy "public access (no auth yet)" on businesses for all using (true) with check (true);
create policy "public access (no auth yet)" on denue_searches for all using (true) with check (true);
create policy "public access (no auth yet)" on search_results for all using (true) with check (true);
create policy "public access (no auth yet)" on leads for all using (true) with check (true);
