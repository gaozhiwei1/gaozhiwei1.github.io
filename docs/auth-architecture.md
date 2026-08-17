# Authentication Architecture

Math2LLM uses Supabase Auth for email/password and optional Google/GitHub OAuth. The browser receives only the project URL and anon/publishable key. Supabase persists and refreshes the session; application code subscribes to `onAuthStateChange` rather than inventing a second token store.

## Route flow

```text
anonymous learning route
  -> remember current hash route in sessionStorage
  -> /login or /signup
  -> Supabase Auth
  -> /auth/callback for OAuth/PKCE
  -> restore remembered learning route
```

`sessionStorage` contains only a return route. Supabase owns access/refresh token persistence. OAuth provider tokens are not copied into application storage.

When Supabase variables are absent, authentication pages show a configuration message and anonymous learning remains available.

## Trust boundaries

- The browser may query user-owned learning tables through the Supabase anon key and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` exists only in the Node server.
- Authorization never trusts `user_metadata`; PRO comes from `subscriptions`, which authenticated clients cannot modify.
- The Local Runner pairing token is unrelated to Supabase identity and never represents a website user.

Official references: [Supabase auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [OAuth sign-in and PKCE](https://supabase.com/docs/reference/javascript/auth-signinwithoauth), [securing Supabase data](https://supabase.com/docs/guides/database/secure-data).
