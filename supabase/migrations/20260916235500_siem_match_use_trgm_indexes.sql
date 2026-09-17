-- siem_matches_for_business ran ~7.4s against an 8s statement_timeout for the
-- `authenticated` role, so /api/siem/match returned 500s under any concurrency
-- (57014, "canceling statement due to statement timeout") and the CPU burn
-- slowed every other query on the instance.
--
-- Cause: `similarity(a, b) > 0.4` is an ordinary function call. GIN trigram
-- indexes are only consulted for the `%` operator, which compares against
-- pg_trgm.similarity_threshold. The old predicate therefore forced a
-- sequential scan of all ~169k rows, computing immutable_unaccent(lower())
-- twice per row — the razon_social/municipio GIN indexes were never used.
--
-- Fix: switch both fuzzy predicates to `%` (with the threshold pinned on the
-- function so behaviour does not depend on session state), and split the
-- three-way OR into separately-indexable branches — one seq-scanning branch
-- in an OR forces a full scan regardless of the other branches' indexes.
--
-- Measured on production data (169,125 rows): 7,382ms -> 226ms, same results,
-- plan now a BitmapAnd over idx_siem_dataset_razon_social_unaccent_trgm and
-- idx_siem_dataset_municipio_unaccent_trgm.

-- The email branch compares lower(e_mail); the existing btree is on the raw
-- column and cannot serve that, so it needs its own functional index.
create index if not exists idx_siem_dataset_email_lower
  on "SIEM-dataset" (lower(e_mail));

create or replace function public.siem_matches_for_business(
  p_name text,
  p_phone text,
  p_email text,
  p_municipio text
)
returns setof "SIEM-dataset"
language sql
stable
set search_path to 'public'
set pg_trgm.similarity_threshold to 0.4
as $function$
  with candidates as (
    (select s.uuid
       from "SIEM-dataset" s
      where p_phone is not null and p_phone <> ''
        and s.telefono = p_phone
      limit 5)
    union
    (select s.uuid
       from "SIEM-dataset" s
      where p_email is not null and p_email <> ''
        and lower(s.e_mail) = lower(p_email)
      limit 5)
    union
    -- Both fuzzy predicates use `%` so the GIN indexes apply; the planner
    -- intersects them with a BitmapAnd before touching the heap.
    (select s.uuid
       from "SIEM-dataset" s
      where p_municipio is not null and p_municipio <> ''
        and p_name is not null and p_name <> ''
        and immutable_unaccent(lower(s.razon_social)) % immutable_unaccent(lower(p_name))
        and immutable_unaccent(lower(s.municipio)) % immutable_unaccent(lower(p_municipio))
      limit 50)
  )
  select s.*
    from "SIEM-dataset" s
    join candidates c on c.uuid = s.uuid
   order by similarity(immutable_unaccent(lower(s.razon_social)), immutable_unaccent(lower(p_name))) desc
   limit 5;
$function$;
