-- Fixes the "canceling statement due to statement timeout" errors coming
-- from siem_matches_for_business/siem_search_by_code: the trigram indexes
-- added earlier were built on the raw columns (razon_social, name), but
-- every query wraps those columns in unaccent(lower(...)) before calling
-- similarity() on them. Postgres can only use a GIN trigram index when the
-- indexed expression matches the query expression exactly, so none of
-- those indexes were ever actually used — every match was a full
-- sequential scan over "SIEM-dataset" with similarity() computed per row,
-- which is fine on a small table and a timeout on this one.

-- unaccent() ships STABLE, not IMMUTABLE, so it can't be used directly in
-- an index expression. Wrapping it fixes that — fully schema-qualified
-- (both the function and the dictionary argument) since the search_path
-- active during CREATE INDEX's inlining isn't guaranteed to include public.
create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select public.unaccent('public.unaccent'::regdictionary, $1);
$$;

-- Replaces idx_siem_dataset_razon_social_trgm and idx_businesses_name_trgm
-- from the previous migration — those indexed the raw columns, which no
-- query here actually filters/orders by.
drop index if exists idx_siem_dataset_razon_social_trgm;
drop index if exists idx_businesses_name_trgm;

create index if not exists idx_siem_dataset_razon_social_unaccent_trgm
  on "SIEM-dataset" using gin (immutable_unaccent(lower(razon_social)) gin_trgm_ops);
create index if not exists idx_siem_dataset_municipio_unaccent_trgm
  on "SIEM-dataset" using gin (immutable_unaccent(lower(municipio)) gin_trgm_ops);
create index if not exists idx_siem_dataset_estado_unaccent_trgm
  on "SIEM-dataset" using gin (immutable_unaccent(lower(estado)) gin_trgm_ops);

create index if not exists idx_businesses_name_unaccent_trgm
  on businesses using gin (immutable_unaccent(lower(name)) gin_trgm_ops);
create index if not exists idx_businesses_address_unaccent_trgm
  on businesses using gin (immutable_unaccent(lower(address)) gin_trgm_ops);

-- Same bodies as before, with every unaccent(...) call swapped for
-- immutable_unaccent(...) so the query expressions match the indexes above
-- verbatim and the planner can use them.
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
      and similarity(immutable_unaccent(lower(s.municipio)), immutable_unaccent(lower(p_municipio))) > 0.4
      and similarity(immutable_unaccent(lower(s.razon_social)), immutable_unaccent(lower(p_name))) > 0.4
    )
  order by similarity(immutable_unaccent(lower(s.razon_social)), immutable_unaccent(lower(p_name))) desc
  limit 5;
$$;

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
    and similarity(immutable_unaccent(lower(s.estado)), immutable_unaccent(lower(p_estado))) > 0.4
    and similarity(immutable_unaccent(lower(s.municipio)), immutable_unaccent(lower(p_municipio))) > 0.4
    and (b.phone is null or b.email is null)
    and (
      (s.telefono is not null and b.phone = s.telefono)
      or (s.e_mail is not null and lower(b.email) = lower(s.e_mail))
      or (
        -- DENUE's raw_json has no standalone "Municipio" key — only
        -- "Ubicacion", a composite "Localidad, Municipio, Estado" string.
        similarity(
          immutable_unaccent(lower(trim(split_part(coalesce(b.raw_json->>'Ubicacion', ''), ',', 2)))),
          immutable_unaccent(lower(s.municipio))
        ) > 0.4
        and (
          similarity(immutable_unaccent(lower(b.name)), immutable_unaccent(lower(s.razon_social))) > 0.35
          or similarity(immutable_unaccent(lower(b.address)), immutable_unaccent(lower(concat_ws(' ', s.domicilio, s.colonia)))) > 0.5
        )
      )
    );

  return query
  select s.*
  from "SIEM-dataset" s
  where
    s.scian = any(p_codes)
    and similarity(immutable_unaccent(lower(s.estado)), immutable_unaccent(lower(p_estado))) > 0.4
    and similarity(immutable_unaccent(lower(s.municipio)), immutable_unaccent(lower(p_municipio))) > 0.4
    and not exists (
      select 1
      from businesses b
      where
        (s.telefono is not null and b.phone = s.telefono)
        or (s.e_mail is not null and lower(b.email) = lower(s.e_mail))
        or (
          similarity(
            immutable_unaccent(lower(trim(split_part(coalesce(b.raw_json->>'Ubicacion', ''), ',', 2)))),
            immutable_unaccent(lower(s.municipio))
          ) > 0.4
          and (
            similarity(immutable_unaccent(lower(b.name)), immutable_unaccent(lower(s.razon_social))) > 0.35
            or similarity(immutable_unaccent(lower(b.address)), immutable_unaccent(lower(concat_ws(' ', s.domicilio, s.colonia)))) > 0.5
          )
        )
    );
end;
$$;
