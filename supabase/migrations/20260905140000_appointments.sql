-- Appointments tied to a project and, optionally, a lead and/or business —
-- lets the calendar tab schedule visits/calls that stay linked to whatever
-- CRM/map record they're about, while still allowing a standalone entry
-- with no link at all.

create table appointments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  title       text not null,
  notes       text,
  location    text,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  status      text not null default 'scheduled',
  created_at  timestamptz not null default now()
);

create index idx_appointments_project_start on appointments (project_id, start_at);
create index idx_appointments_lead on appointments (lead_id);
create index idx_appointments_business on appointments (business_id);

alter table appointments enable row level security;
create policy "own appointments" on appointments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
