-- Adds real per-user ownership now that Supabase Auth is wired up. Projects
-- become user-owned; leads and saved_businesses get a denormalized user_id
-- (cheaper/simpler RLS than joining through projects on every row check).
-- The shared DENUE cache (businesses/denue_searches/search_results) stays
-- global across all users, but is no longer readable/writable anonymously.

-- Pre-auth dev/test projects have no owner and no real user to assign them
-- to — drop them (and everything that cascades from them) rather than carry
-- orphaned data through the auth cutover.
delete from projects;

alter table projects add column user_id uuid references auth.users(id) on delete cascade;
alter table projects alter column user_id set not null;
alter table projects alter column user_id set default auth.uid();
create index idx_projects_user_id on projects (user_id);

alter table leads add column user_id uuid references auth.users(id) on delete cascade;
alter table leads alter column user_id set not null;
create index idx_leads_user_id on leads (user_id);

alter table saved_businesses add column user_id uuid references auth.users(id) on delete cascade;
alter table saved_businesses alter column user_id set not null;
create index idx_saved_businesses_user_id on saved_businesses (user_id);

-- Drop every old permissive "no auth yet" policy.
drop policy "public access (no auth yet)" on projects;
drop policy "public access (no auth yet)" on businesses;
drop policy "public access (no auth yet)" on denue_searches;
drop policy "public access (no auth yet)" on search_results;
drop policy "public access (no auth yet)" on leads;
drop policy "public access (no auth yet)" on saved_businesses;
drop policy "public access (no auth yet)" on lead_activities;
drop policy "public access (no auth yet)" on lead_contacts;

-- Owner-scoped policies.
create policy "own projects" on projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own leads" on leads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own saved businesses" on saved_businesses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lead activities" on lead_activities for all
  using (lead_id in (select id from leads where user_id = auth.uid()))
  with check (lead_id in (select id from leads where user_id = auth.uid()));

create policy "own lead contacts" on lead_contacts for all
  using (lead_id in (select id from leads where user_id = auth.uid()))
  with check (lead_id in (select id from leads where user_id = auth.uid()));

-- Shared cache tables: still shared across every signed-in user, but no
-- longer accessible anonymously.
create policy "authenticated access" on businesses for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated access" on denue_searches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated access" on search_results for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
