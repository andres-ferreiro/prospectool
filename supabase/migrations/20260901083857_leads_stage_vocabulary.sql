-- Fix the pipeline stage vocabulary for the CRM (Phase 2), and add a
-- lightweight "saved places" wishlist that is intentionally separate from
-- the CRM pipeline (leads) — saving a business is not the same as having
-- visited/contacted it.
-- `leads` has zero rows so far, so this is a plain default/constraint change,
-- no data backfill needed.

alter table leads alter column stage set default 'contacted';

alter table leads add constraint leads_stage_check
  check (stage in ('contacted', 'interested', 'negotiating', 'won', 'lost'));

create table if not exists saved_businesses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  business_id  uuid not null references businesses(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (project_id, business_id)
);

alter table saved_businesses enable row level security;
create policy "public access (no auth yet)" on saved_businesses for all using (true) with check (true);
