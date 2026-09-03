-- Adds a human "who did you actually talk to" contact record on top of the
-- lead (separate from the business's own DENUE phone/email), and an
-- append-only stage-change log so the CRM can show a timeline per lead.

alter table leads add column contact_phone text;
alter table leads add column contact_email text;

create table lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  from_stage text,           -- null for the lead's creation event
  to_stage   text not null,
  created_at timestamptz not null default now()
);

alter table lead_activities enable row level security;
create policy "public access (no auth yet)" on lead_activities for all using (true) with check (true);
