# Production Deployment Checklist

## Application

- [ ] Run `npm test`, `npm run test:runner`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Deploy the Node production server with TLS behind a trusted reverse proxy.
- [ ] Set `APP_BASE_URL` to the exact public HTTPS origin.
- [ ] Do not expose the legacy `/api/run` endpoint publicly; Local Runner is the supported execution path.

## Supabase

- [ ] Apply migrations to staging first and run the pgTAP RLS suite.
- [ ] Test two real accounts for cross-user reads and writes.
- [ ] Configure production Site URL, redirect allowlist, SMTP, Google and GitHub providers.
- [ ] Keep the service-role key only in the server secret store.

## Stripe

- [ ] Complete the entire flow in TEST MODE, including failure, cancellation and duplicate delivery.
- [ ] Register the HTTPS Webhook endpoint and its signing secret.
- [ ] Configure Customer Portal cancellation and payment-method behavior.
- [ ] Confirm only configured Price IDs grant PRO.
- [ ] Review tax, invoices, refund policy and local legal requirements before enabling live mode.
- [ ] Switch to live keys only as an explicit release step; never automatically.

## Operations

- [ ] Add structured error monitoring without logging access tokens, source code, Stripe signatures or complete event payloads.
- [ ] Alert on failed Webhook events and subscription/database divergence.
- [ ] Back up Supabase and rehearse restore.
- [ ] Define retention/deletion policy for coding submissions and account data.
