-- Android/Web Push: separate from existing iOS APNs; no jobs or sends.
create table if not exists public.web_push_config (
  id integer primary key check(id = 1),
  public_key text not null,
  private_key text not null,
  subject text not null,
  sending_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.web_push_config enable row level security;
revoke all on public.web_push_config from anon, authenticated;
grant all on public.web_push_config to service_role;
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.voyager_profiles(id) on delete cascade,
  endpoint_hash text not null unique,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  consent_at timestamptz not null,
  consent_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists web_push_subscriptions_user_enabled on public.web_push_subscriptions(user_id,enabled);
create table if not exists public.web_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_token uuid not null unique default gen_random_uuid(),
  campaign_key text not null,
  spec_hash text not null,
  subscription_id uuid references public.web_push_subscriptions(id) on delete set null,
  user_id uuid references public.voyager_profiles(id) on delete cascade,
  route text not null,
  status text not null check(status in ('sending','provider_accepted','failed','skipped')),
  provider_status integer,
  displayed_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_key,subscription_id)
);
alter table public.web_push_subscriptions enable row level security;
alter table public.web_push_deliveries enable row level security;
revoke all on public.web_push_subscriptions, public.web_push_deliveries from anon, authenticated;
grant all on public.web_push_subscriptions, public.web_push_deliveries to service_role;
