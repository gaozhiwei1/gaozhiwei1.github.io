# Subscription Architecture

## Application states

The entitlement model supports `anonymous`, `free`, `pro`, `team`, and `edu`; only the first three are currently issued. It does not reduce billing to an `isPaid` flag.

Stripe state is normalized before reaching React:

| Stripe status                                | Math2LLM status | PRO access                            |
| -------------------------------------------- | --------------- | ------------------------------------- |
| `active`, `trialing`                         | `active`        | yes                                   |
| `past_due`, `unpaid`, `incomplete`, `paused` | `past_due`      | no                                    |
| `canceled`                                   | `canceled`      | only until a stored future period end |
| `incomplete_expired`                         | `expired`       | no                                    |

All frontend decisions pass through `EntitlementContext` and the pure functions under `src/entitlements/`. Pricing feature text and FREE limits live in `src/config/product.ts`.

## Payment providers

The browser depends on the `PaymentProvider` interface. Stripe is the V1 implementation. A future Alipay or WeChat provider can implement Checkout/management without changing curriculum authorization.

## Protected content

Premium code solutions live in `server/saas/solutions.json`, not in the Vite bundle. Selected advanced derivations live under `server/saas/premium-content.mjs`. Both endpoints authenticate the Supabase access token and re-check the server-side subscription before returning content.

Reaching `/#/payment/success` never grants access. That page polls normalized server state while waiting for a verified Webhook.
