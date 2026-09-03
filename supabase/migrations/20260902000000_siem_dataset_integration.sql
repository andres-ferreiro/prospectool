-- Enable trigram + unaccent for fuzzy matching between DENUE and SIEM records.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- SIEM-sourced businesses have no coordinates (only text address fields), so
-- lat/lng can no longer be guaranteed non-null once "SIEM-dataset" rows start
-- being upserted into businesses.
alter table businesses alter column lat drop not null;
alter table businesses alter column lng drop not null;

-- "SIEM-dataset" was created directly in the dashboard with RLS enabled and
-- no policies, which makes it unreadable via the API — same access model as
-- businesses.
create policy "authenticated access" on "SIEM-dataset"
  for all
  using (auth.role() = 'authenticated');

create index if not exists idx_siem_dataset_razon_social_trgm
  on "SIEM-dataset" using gin (razon_social gin_trgm_ops);
create index if not exists idx_siem_dataset_telefono on "SIEM-dataset" (telefono);
create index if not exists idx_siem_dataset_email on "SIEM-dataset" (e_mail);
create index if not exists idx_siem_dataset_scian on "SIEM-dataset" (scian);

create index if not exists idx_businesses_name_trgm
  on businesses using gin (name gin_trgm_ops);

-- Given a DENUE business, find likely-matching SIEM-dataset rows (exact
-- phone/email, or fuzzy name match scoped to the same municipio) so the
-- business detail view can surface contact info DENUE is missing.
create or replace function siem_matches_for_business(
  p_name text,
  p_phone text,
  p_email text,
  p_municipio text
) returns setof "SIEM-dataset"
language sql
stable
set search_path = public
as $$
  select s.*
  from "SIEM-dataset" s
  where
    (p_phone is not null and s.telefono = p_phone)
    or (p_email is not null and lower(s.e_mail) = lower(p_email))
    or (
      p_municipio is not null
      and similarity(unaccent(lower(s.municipio)), unaccent(lower(p_municipio))) > 0.4
      and similarity(unaccent(lower(s.razon_social)), unaccent(lower(p_name))) > 0.4
    )
  order by similarity(unaccent(lower(s.razon_social)), unaccent(lower(p_name))) desc
  limit 5;
$$;

-- Given SCIAN codes + an Estado/Municipio name, find SIEM-dataset rows in
-- that scope that don't already have a matching business in `businesses`
-- (any source). A SIEM row matching an existing business — exact
-- phone/email, OR same municipio + (name similarity OR street-address
-- similarity, since the same real business often has a different trade
-- name across registries but the same address) — has its phone/email
-- merged into that existing business (filling gaps only, never
-- overwriting real data) instead of being returned as a second, duplicate
-- result.
create or replace function siem_search_by_code(
  p_codes bigint[],
  p_estado text,
  p_municipio text
) returns setof "SIEM-dataset"
language plpgsql
set search_path = public
as $$
begin
  update businesses b
  set
    phone = coalesce(b.phone, case when s.telefono is not null then s.telefono end),
    email = coalesce(b.email, case when s.e_mail is not null then s.e_mail end)
  from "SIEM-dataset" s
  where
    s.scian = any(p_codes)
    and similarity(unaccent(lower(s.estado)), unaccent(lower(p_estado))) > 0.4
    and similarity(unaccent(lower(s.municipio)), unaccent(lower(p_municipio))) > 0.4
    and (b.phone is null or b.email is null)
    and (
      (s.telefono is not null and b.phone = s.telefono)
      or (s.e_mail is not null and lower(b.email) = lower(s.e_mail))
      or (
        -- DENUE's raw_json has no standalone "Municipio" key — only
        -- "Ubicacion", a composite "Localidad, Municipio, Estado" string.
        similarity(
          unaccent(lower(trim(split_part(coalesce(b.raw_json->>'Ubicacion', ''), ',', 2)))),
          unaccent(lower(s.municipio))
        ) > 0.4
        and (
          similarity(unaccent(lower(b.name)), unaccent(lower(s.razon_social))) > 0.35
          or similarity(unaccent(lower(b.address)), unaccent(lower(concat_ws(' ', s.domicilio, s.colonia)))) > 0.5
        )
      )
    );

  return query
  select s.*
  from "SIEM-dataset" s
  where
    s.scian = any(p_codes)
    and similarity(unaccent(lower(s.estado)), unaccent(lower(p_estado))) > 0.4
    and similarity(unaccent(lower(s.municipio)), unaccent(lower(p_municipio))) > 0.4
    and not exists (
      select 1
      from businesses b
      where
        (s.telefono is not null and b.phone = s.telefono)
        or (s.e_mail is not null and lower(b.email) = lower(s.e_mail))
        or (
          similarity(
            unaccent(lower(trim(split_part(coalesce(b.raw_json->>'Ubicacion', ''), ',', 2)))),
            unaccent(lower(s.municipio))
          ) > 0.4
          and (
            similarity(unaccent(lower(b.name)), unaccent(lower(s.razon_social))) > 0.35
            or similarity(unaccent(lower(b.address)), unaccent(lower(concat_ws(' ', s.domicilio, s.colonia)))) > 0.5
          )
        )
    );
end;
$$;
