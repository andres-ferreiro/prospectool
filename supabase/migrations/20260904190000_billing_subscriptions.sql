-- Billing state, one row per user. Stripe is the source of truth; this is a
-- local mirror kept in sync by the webhook (app/api/webhooks/stripe/route.ts)
-- so every gating check is one indexed read instead of a Stripe API call.
-- The row is created (status 'incomplete') the moment Checkout starts, so
-- the webhook can resolve customer -> user without depending on metadata.
create table if not exists subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text not null unique,
  stripe_subscription_id text unique,
  plan                   text, -- 'monthly' | 'yearly', null until first event
  -- Mirrors Stripe's subscription.status verbatim, no CHECK constraint (Stripe
  -- adds statuses over time; a rejected insert would 500 the webhook forever).
  -- What counts as "paid" is enforced in lib/billing/limits.ts, not here.
  status                 text not null default 'incomplete',
  current_period_end     timestamptz,
  trial_end              timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now() -- webhook sets this explicitly; no trigger exists anywhere in this schema
);

create index if not exists idx_subscriptions_stripe_customer_id on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

-- Read-only to the owner. No insert/update/delete policy on purpose: every
-- write comes from the webhook via the service-role key, so a user can't
-- grant themselves a plan even with a stolen anon-key session.
create policy "read own subscription" on subscriptions for select using (auth.uid() = user_id);
