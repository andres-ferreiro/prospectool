-- The previous migration (siem_match_use_trgm_indexes) made
-- siem_matches_for_business index-friendly, but only for callers that bypass
-- RLS. Measured as `postgres` it took ~90ms; as `authenticated` — the role
-- every real app request uses — it still did a Seq Scan of all 169,125 rows
-- in ~8,000ms and hit the 8s statement_timeout (/api/siem/match 500s).
--
-- Cause: "SIEM-dataset" has RLS, and Postgres won't evaluate a
-- non-LEAKPROOF operator ahead of a policy's security-barrier qual. pg_trgm's
-- `%` and similarity() aren't leakproof, so under RLS they can only run as a
-- post-scan filter — never as a GIN index condition. The indexes were never
-- used for real users.
--
-- Fix: run as the owner (SECURITY DEFINER), which bypasses RLS so the
-- trigram predicates can drive the BitmapAnd again.
--
-- Why this grants no new access: the table's only policy is
-- `using (auth.role() = 'authenticated')` — any signed-in user can already
-- read every row. This keeps exactly that boundary, twice over:
--   * EXECUTE is revoked from PUBLIC and anon, granted to authenticated only.
--     (Without the revoke, anon — which currently gets zero rows through RLS
--     — would read the whole dataset through a definer function.)
--   * The body re-checks auth.role() = 'authenticated' itself, evaluated once
--     as an InitPlan, so a future grant mistake still returns nothing.
-- search_path is pinned with pg_temp last, the documented guard against
-- temp-schema object hijacking in SECURITY DEFINER functions.
--
-- The Supabase advisor will list this under "authenticated can execute
-- SECURITY DEFINER function" — intentional, per the reasoning above.

create or replace function public.siem_matches_for_business(
  p_name text,
  p_phone text,
  p_email text,
  p_municipio text
)
returns setof "SIEM-dataset"
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
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
    -- `%` lets the planner use the GIN indexes (BitmapAnd of both); the
    -- similarity() comparisons re-assert the 0.4 cutoff on the candidates.
    (select s.uuid
       from "SIEM-dataset" s
      where p_municipio is not null and p_municipio <> ''
        and p_name is not null and p_name <> ''
        and immutable_unaccent(lower(s.razon_social)) % immutable_unaccent(lower(p_name))
        and immutable_unaccent(lower(s.municipio)) % immutable_unaccent(lower(p_municipio))
        and similarity(immutable_unaccent(lower(s.razon_social)), immutable_unaccent(lower(p_name))) >= 0.4
        and similarity(immutable_unaccent(lower(s.municipio)), immutable_unaccent(lower(p_municipio))) >= 0.4
      limit 50)
  )
  select s.*
    from "SIEM-dataset" s
    join candidates c on c.uuid = s.uuid
   -- Same boundary as the table's RLS policy, which this function bypasses.
   where (select auth.role()) = 'authenticated'
   order by similarity(immutable_unaccent(lower(s.razon_social)), immutable_unaccent(lower(p_name))) desc
   limit 5;
$function$;

revoke execute on function public.siem_matches_for_business(text, text, text, text) from public, anon;
grant execute on function public.siem_matches_for_business(text, text, text, text) to authenticated;
