# Supabase and Stripe TEST MODE Setup

## 1. Create or start Supabase

For local development, install the Supabase CLI and a Docker-compatible runtime, then run:

```bash
supabase start
supabase db reset
npm run test:db
```

For hosted development, create a Supabase project and apply the migration:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Copy the project URL and anon key into the browser variables. Put the service-role key only in the server variables.

## 2. Configure Auth

Set the Site URL to the deployment origin. Add local and production callback URLs that include `/#/auth/callback`. Enable email/password. Enable Google and GitHub only after their client credentials and Supabase callback URLs are configured; then set the matching `VITE_ENABLE_*` flag.

For production email confirmation, configure a real SMTP provider. Supabase's development mail service is not a production sender.

## 3. Configure Stripe TEST MODE

1. In the Stripe test dashboard, create one recurring Math2LLM PRO product.
2. Create the monthly and/or annual recurring Prices.
3. Put their `price_...` IDs in the server environment.
4. Configure the hosted Customer Portal and optionally set its configuration ID.
5. Never put `sk_test_...` or `whsec_...` values in a `VITE_` variable.

## 4. Forward Webhooks locally

Start the application and Stripe CLI:

```bash
npm run dev
stripe listen --forward-to http://127.0.0.1:4173/api/stripe/webhook
```

Copy the CLI's `whsec_...` value to `STRIPE_WEBHOOK_SECRET`, restart the server, then use Stripe's documented test payment methods in hosted Checkout.

Handled lifecycle events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Webhook signatures use the untouched raw request body. Event IDs are recorded before processing and marked `processed` only after the subscription write succeeds; failed events remain retryable.

Official references: [Stripe subscription Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions), [Webhook signature verification](https://docs.stripe.com/webhooks/signature), [Customer Portal sessions](https://docs.stripe.com/api/customer_portal/sessions/create).
