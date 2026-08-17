import "dotenv/config";

const DEFAULT_MONTHLY_CNY = 12900;
const DEFAULT_ANNUAL_CNY = 99900;

function booleanEnv(value, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true";
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadSaasConfig(env = process.env) {
  const appBaseUrl = (env.APP_BASE_URL ?? "http://127.0.0.1:4173").replace(
    /\/$/,
    "",
  );
  const prices = {
    monthly: {
      enabled: Boolean(env.STRIPE_PRO_MONTHLY_PRICE_ID),
      priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
      amountCny: positiveInteger(
        env.PRO_MONTHLY_PRICE_CNY,
        DEFAULT_MONTHLY_CNY,
      ),
      label: "月付",
    },
    annual: {
      enabled: Boolean(env.STRIPE_PRO_ANNUAL_PRICE_ID),
      priceId: env.STRIPE_PRO_ANNUAL_PRICE_ID ?? null,
      amountCny: positiveInteger(env.PRO_ANNUAL_PRICE_CNY, DEFAULT_ANNUAL_CNY),
      label: "年付",
    },
  };

  return {
    appBaseUrl,
    supabase: {
      url: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? null,
      anonKey: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? null,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY ?? null,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? null,
      portalConfigurationId: env.STRIPE_PORTAL_CONFIGURATION_ID ?? null,
      prices,
    },
    authProviders: {
      email: true,
      google: booleanEnv(env.VITE_ENABLE_GOOGLE_AUTH),
      github: booleanEnv(env.VITE_ENABLE_GITHUB_AUTH),
    },
  };
}

export function publicCommerceConfig(config) {
  return {
    currency: "CNY",
    stripeConfigured: Boolean(
      config.stripe.secretKey &&
      Object.values(config.stripe.prices).some((price) => price.enabled),
    ),
    authConfigured: Boolean(config.supabase.url && config.supabase.anonKey),
    authProviders: config.authProviders,
    plans: {
      free: { id: "free", name: "FREE", amountCny: 0 },
      pro: {
        id: "pro",
        name: "PRO",
        prices: Object.fromEntries(
          Object.entries(config.stripe.prices).map(([interval, price]) => [
            interval,
            {
              enabled: price.enabled,
              amountCny: price.amountCny,
              label: price.label,
            },
          ]),
        ),
      },
    },
  };
}

export function requireServerConfiguration(config, capability) {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw Object.assign(new Error("服务端尚未配置 Supabase"), {
      code: "supabase_not_configured",
      status: 503,
    });
  }
  if (capability === "stripe" && !config.stripe.secretKey) {
    throw Object.assign(new Error("服务端尚未配置 Stripe TEST MODE"), {
      code: "stripe_not_configured",
      status: 503,
    });
  }
  if (capability === "webhook" && !config.stripe.webhookSecret) {
    throw Object.assign(new Error("服务端尚未配置 Stripe Webhook Secret"), {
      code: "webhook_not_configured",
      status: 503,
    });
  }
}
