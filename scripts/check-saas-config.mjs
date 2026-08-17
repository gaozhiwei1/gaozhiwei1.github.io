import "dotenv/config";
import { loadSaasConfig } from "../server/saas/config.mjs";

const config = loadSaasConfig();
const checks = [
  ["VITE_SUPABASE_URL", Boolean(process.env.VITE_SUPABASE_URL)],
  ["VITE_SUPABASE_ANON_KEY", Boolean(process.env.VITE_SUPABASE_ANON_KEY)],
  ["SUPABASE_URL", Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)],
  ["SUPABASE_SERVICE_ROLE_KEY", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
  ["STRIPE_SECRET_KEY", Boolean(process.env.STRIPE_SECRET_KEY)],
  ["STRIPE_WEBHOOK_SECRET", Boolean(process.env.STRIPE_WEBHOOK_SECRET)],
  ["STRIPE_PRO_MONTHLY_PRICE_ID", Boolean(process.env.STRIPE_PRO_MONTHLY_PRICE_ID)],
  ["APP_BASE_URL", Boolean(process.env.APP_BASE_URL)],
];

console.log("Math2LLM SaaS configuration check\n");
for (const [name, ready] of checks) {
  console.log(`${ready ? "✓" : "✗"} ${name}`);
}

const browserAuthReady = Boolean(
  process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY,
);
const serverAuthReady = Boolean(
  config.supabase.url && config.supabase.serviceRoleKey,
);
const stripeReady = Boolean(
  config.stripe.secretKey &&
  Object.values(config.stripe.prices).some((price) => price.enabled),
);
const webhookReady = Boolean(config.stripe.webhookSecret);

console.log("\nCapabilities");
console.log(`${browserAuthReady ? "✓" : "✗"} Email signup/login in browser`);
console.log(`${serverAuthReady ? "✓" : "✗"} Server-side subscription / PRO authorization`);
console.log(`${stripeReady ? "✓" : "✗"} Stripe TEST Checkout`);
console.log(`${webhookReady ? "✓" : "✗"} Verified Stripe webhook`);

if (!browserAuthReady || !serverAuthReady || !stripeReady || !webhookReady) {
  console.log("\nNot production-ready yet. Fill .env from .env.example and follow docs/saas-quickstart.md.");
  process.exitCode = 1;
} else {
  console.log("\nCore SaaS secrets are present. Run the auth/payment test flow before enabling live payments.");
}
