-- check_ai_rate_limit trusted a caller-supplied p_user_id instead of
-- verifying the caller's own identity. Supabase's security advisor flagged
-- it: as a SECURITY DEFINER function it's exposed at
-- /rest/v1/rpc/check_ai_rate_limit to anyone with a valid session (anon
-- included), and nothing stopped a caller from passing a *different*
-- user's id to spam their counter and lock them out of the AI feature.
--
-- Drop the parameter entirely and read auth.uid() instead — it reflects
-- the actual caller's JWT claims for this request regardless of the
-- function's own SECURITY DEFINER status, so the function can now only
-- ever touch the caller's own row.
drop function if exists check_ai_rate_limit(uuid, int, int);

create or replace function check_ai_rate_limit(
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    raise exception 'No autenticado';
  end if;

  insert into ai_rate_limits (user_id, window_start, request_count)
  values (v_user_id, now(), 1)
  on conflict (user_id) do update set
    window_start = case
      when ai_rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else ai_rate_limits.window_start
    end,
    request_count = case
      when ai_rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else ai_rate_limits.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function check_ai_rate_limit(int, int) from public;
revoke all on function check_ai_rate_limit(int, int) from anon;
grant execute on function check_ai_rate_limit(int, int) to authenticated;
