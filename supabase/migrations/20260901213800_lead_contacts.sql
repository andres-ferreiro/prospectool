-- A lead can have more than one point of contact (e.g. a receptionist and
-- an owner). Move contact info off `leads` into its own one-to-many table
-- and backfill anything already captured by the single-contact columns.

create table lead_contacts (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  name       text,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

alter table lead_contacts enable row level security;
create policy "public access (no auth yet)" on lead_contacts for all using (true) with check (true);

insert into lead_contacts (lead_id, name, phone, email, created_at)
select id, contact_name, contact_phone, contact_email, created_at
from leads
where contact_name is not null or contact_phone is not null or contact_email is not null;

alter table leads drop column contact_name;
alter table leads drop column contact_phone;
alter table leads drop column contact_email;
