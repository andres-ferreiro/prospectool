-- Per-user fixed-window counter for the AI suggestion endpoint
-- (app/api/ai/suggest-keywords) — each call is a real Gemini API call, and
-- being logged in is the only gate on it otherwise, so a signed-in user
-- could hammer it for free with no limit. One row per user; the window
-- resets itself the first time it's found expired, rather than a cron job
-- pruning old rows.
create table if not exists ai_rate_limits (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  window_start  timestamptz not null default now(),
  request_count int not null default 0
);

alter table ai_rate_limits enable row level security;

-- No policies at all, on purpose — this table is only ever touched through
-- check_ai_rate_limit below (security definer), never directly by a client.
-- A user with a stolen anon-key session still can't read or reset their own
-- counter.

-- Atomically increments the caller's counter and reports whether they're
-- still within the limit — one statement, so two concurrent requests from
-- the same user can't both read the same "count so far" and both pass.
-- security definer: the table has no RLS policies, so this must run with
-- elevated privileges to touch it regardless of the caller's own role.
create or replace function check_ai_rate_limit(
  p_user_id uuid,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into ai_rate_limits (user_id, window_start, request_count)
  values (p_user_id, now(), 1)
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

revoke all on function check_ai_rate_limit(uuid, int, int) from public;
grant execute on function check_ai_rate_limit(uuid, int, int) to authenticated;
