begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.progress (user_id, content_type, content_id, status) values
  ('11111111-1111-4111-8111-111111111111', 'topic', 'topic-a', 'completed'),
  ('22222222-2222-4222-8222-222222222222', 'topic', 'topic-b', 'mastered');
insert into public.bookmarks (user_id, content_type, content_id) values
  ('11111111-1111-4111-8111-111111111111', 'question', 'q-a'),
  ('22222222-2222-4222-8222-222222222222', 'question', 'q-b');
insert into public.review_items (user_id, content_type, content_id, next_review_at) values
  ('11111111-1111-4111-8111-111111111111', 'question', 'q-a', now()),
  ('22222222-2222-4222-8222-222222222222', 'question', 'q-b', now());

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass), 'subscriptions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.progress'::regclass), 'progress has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.submissions'::regclass), 'submissions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.bookmarks'::regclass), 'bookmarks has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.review_items'::regclass), 'review_items has RLS');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is((select count(*)::integer from public.profiles), 1, 'user A reads only own profile');
select is((select count(*)::integer from public.subscriptions), 1, 'user A reads only own subscription');
select is((select count(*)::integer from public.progress), 1, 'user A reads only own progress');
select is((select count(*)::integer from public.bookmarks), 1, 'user A reads only own bookmark');
select is((select count(*)::integer from public.review_items), 1, 'user A reads only own review item');

select lives_ok(
  $$insert into public.progress (user_id, content_type, content_id, status)
    values ('11111111-1111-4111-8111-111111111111', 'question', 'q-own', 'completed')$$,
  'user A can insert own progress'
);
select throws_ok(
  $$insert into public.progress (user_id, content_type, content_id, status)
    values ('22222222-2222-4222-8222-222222222222', 'question', 'q-cross-user', 'completed')$$,
  '42501', null, 'user A cannot insert progress for user B'
);
select throws_ok(
  $$update public.subscriptions set plan = 'pro', status = 'active'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null, 'authenticated user cannot grant PRO'
);

select * from finish();
rollback;
