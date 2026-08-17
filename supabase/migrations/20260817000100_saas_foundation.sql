create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team', 'edu')),
  status text not null default 'free' check (status in ('free', 'active', 'past_due', 'canceled', 'expired')),
  provider text check (provider is null or provider in ('stripe', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((plan = 'free' and status = 'free') or plan <> 'free')
);

create unique index subscriptions_provider_customer_unique
  on public.subscriptions(provider, provider_customer_id)
  where provider_customer_id is not null;
create unique index subscriptions_provider_subscription_unique
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index subscriptions_status_period_idx on public.subscriptions(status, current_period_end);

create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('topic', 'question', 'problem', 'activity')),
  content_id text not null check (char_length(content_id) between 1 and 200),
  status text not null check (status in ('seen', 'completed', 'mastered', 'attempted', 'passed')),
  score numeric(6, 3),
  last_opened_at timestamptz,
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);
create index progress_user_updated_idx on public.progress(user_id, updated_at desc);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null check (char_length(problem_id) between 1 and 200),
  code text not null check (octet_length(code) <= 150000),
  execution_provider text not null check (execution_provider in ('local_runner', 'browser', 'cloud_judge')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index submissions_user_created_idx on public.submissions(user_id, created_at desc);
create index submissions_user_problem_idx on public.submissions(user_id, problem_id, created_at desc);

create table public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null check (char_length(content_id) between 1 and 200),
  content_type text not null check (content_type in ('topic', 'question', 'problem')),
  created_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);
create index bookmarks_user_created_idx on public.bookmarks(user_id, created_at desc);

create table public.review_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null check (char_length(content_id) between 1 and 200),
  content_type text not null default 'question' check (content_type in ('topic', 'question')),
  next_review_at timestamptz not null,
  strength numeric(8, 3) not null default 0 check (strength >= 0),
  correct_streak integer not null default 0 check (correct_streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);
create index review_items_due_idx on public.review_items(user_id, next_review_at);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger progress_set_updated_at before update on public.progress
for each row execute function public.set_updated_at();
create trigger review_items_set_updated_at before update on public.review_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'free');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.progress enable row level security;
alter table public.submissions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.review_items enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy subscriptions_select_own on public.subscriptions
for select to authenticated using ((select auth.uid()) = user_id);

create policy progress_select_own on public.progress
for select to authenticated using ((select auth.uid()) = user_id);
create policy progress_insert_own on public.progress
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy progress_update_own on public.progress
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy progress_delete_own on public.progress
for delete to authenticated using ((select auth.uid()) = user_id);

create policy submissions_select_own on public.submissions
for select to authenticated using ((select auth.uid()) = user_id);
create policy submissions_insert_own on public.submissions
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy bookmarks_select_own on public.bookmarks
for select to authenticated using ((select auth.uid()) = user_id);
create policy bookmarks_insert_own on public.bookmarks
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy bookmarks_delete_own on public.bookmarks
for delete to authenticated using ((select auth.uid()) = user_id);

create policy review_items_select_own on public.review_items
for select to authenticated using ((select auth.uid()) = user_id);
create policy review_items_insert_own on public.review_items
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy review_items_update_own on public.review_items
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy review_items_delete_own on public.review_items
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.subscriptions, public.progress, public.submissions,
  public.bookmarks, public.review_items, public.stripe_webhook_events from anon;
revoke all on public.profiles, public.subscriptions, public.progress, public.submissions,
  public.bookmarks, public.review_items, public.stripe_webhook_events from authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
grant select, insert on public.submissions to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert, update, delete on public.review_items to authenticated;

grant all on public.profiles, public.subscriptions, public.progress, public.submissions,
  public.bookmarks, public.review_items, public.stripe_webhook_events to service_role;
