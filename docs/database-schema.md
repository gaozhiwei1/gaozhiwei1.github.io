# Database Schema and RLS

The source of truth is [`supabase/migrations/20260817000100_saas_foundation.sql`](../supabase/migrations/20260817000100_saas_foundation.sql).

## Tables

| Table                   | Purpose                                  | Browser access                 |
| ----------------------- | ---------------------------------------- | ------------------------------ |
| `profiles`              | Display name and avatar                  | own row: select/insert/update  |
| `subscriptions`         | Normalized plan and billing state        | own row: select only           |
| `progress`              | Topic/question/problem state             | own rows: CRUD                 |
| `submissions`           | Coding attempts and Local Runner results | own rows: select/insert        |
| `bookmarks`             | Saved content                            | own rows: select/insert/delete |
| `review_items`          | Scheduling strength and next due time    | own rows: CRUD                 |
| `stripe_webhook_events` | Idempotency state                        | service role only              |

Curriculum content remains in source control. The database stores stable curriculum IDs, not a second copy of the curriculum.

## Isolation

Every private table enables RLS. Policies use `(select auth.uid()) = user_id` or the profile primary key and explicitly target `authenticated`. Indexed user columns keep the RLS predicate selective.

There are deliberately no authenticated insert/update/delete policies or grants on `subscriptions`. Only trusted server code using the service role may change plan state.

Run the two-user pgTAP suite with:

```bash
supabase start
npm run test:db
```

The test asserts that user A sees only A's rows, cannot insert for user B, and cannot update A's own subscription to PRO.

Official references: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [database testing](https://supabase.com/docs/guides/local-development/testing/overview).
