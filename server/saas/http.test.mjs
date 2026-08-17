import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import { createSaasHandler } from "./http.mjs";

function config() {
  return {
    appBaseUrl: "https://math2llm.test",
    supabase: {
      url: "https://supabase.test",
      anonKey: "anon",
      serviceRoleKey: "server-only",
    },
    stripe: {
      secretKey: "sk_test_not_real",
      webhookSecret: "whsec_not_real",
      portalConfigurationId: null,
      prices: {
        monthly: {
          enabled: true,
          priceId: "price_test",
          amountCny: 1,
          label: "月付",
        },
        annual: { enabled: false, priceId: null, amountCny: 1, label: "年付" },
      },
    },
    authProviders: { email: true, google: false, github: false },
  };
}

async function request(
  handler,
  { path, method = "GET", body = "", headers = {} },
) {
  const input = Readable.from(body ? [Buffer.from(body)] : []);
  Object.assign(input, { url: path, method, headers });
  let status;
  let responseBody = "";
  const response = {
    writeHead(nextStatus) {
      status = nextStatus;
    },
    end(chunk = "") {
      responseBody += chunk;
    },
  };
  const handled = await handler(input, response);
  return {
    handled,
    status,
    body: responseBody ? JSON.parse(responseBody) : {},
  };
}

test("Stripe webhook rejects an invalid signature before processing", async () => {
  let processed = false;
  const signatureError = Object.assign(new Error("signature mismatch"), {
    type: "StripeSignatureVerificationError",
  });
  const payments = {
    stripe: {
      webhooks: {
        constructEvent() {
          throw signatureError;
        },
      },
    },
    async processEvent() {
      processed = true;
    },
  };
  const handler = createSaasHandler({
    config: config(),
    supabase: {},
    repository: {},
    auth: {},
    payments,
  });
  const result = await request(handler, {
    path: "/api/stripe/webhook",
    method: "POST",
    body: "{}",
    headers: { "stripe-signature": "bad" },
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "invalid_signature");
  assert.equal(processed, false);
});

test("payment success URL is not an authorization endpoint", async () => {
  const handler = createSaasHandler({ config: config() });
  const result = await request(handler, { path: "/api/payment/success" });
  assert.equal(result.handled, false);
  assert.equal(result.status, undefined);
  assert.deepEqual(result.body, {});
});

test("premium content rejects an invalid authenticated session", async () => {
  const handler = createSaasHandler({
    config: config(),
    supabase: {},
    repository: {},
    auth: {
      async authenticate() {
        throw Object.assign(new Error("登录会话无效或已过期"), {
          code: "invalid_token",
          status: 401,
        });
      },
    },
  });
  const result = await request(handler, {
    path: "/api/premium/topic/posttraining.dpo.derivation",
  });
  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, "invalid_token");
});

test("premium content is denied to FREE and returned to active PRO", async () => {
  let subscription = { plan: "free", status: "free" };
  const handler = createSaasHandler({
    config: config(),
    supabase: {},
    repository: {
      async getSubscription(userId) {
        assert.equal(userId, "user-a");
        return subscription;
      },
    },
    auth: {
      async authenticate() {
        return { user: { id: "user-a" } };
      },
    },
  });
  const path = "/api/premium/topic/posttraining.dpo.derivation";
  const denied = await request(handler, { path });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "pro_required");

  subscription = { plan: "pro", status: "active" };
  const allowed = await request(handler, { path });
  assert.equal(allowed.status, 200);
  assert.match(allowed.body.title, /DPO/);
  assert.ok(allowed.body.steps.length > 0);
});

test("premium gold article is server-side and requires active PRO", async () => {
  let subscription = { plan: "free", status: "free" };
  const handler = createSaasHandler({
    config: config(),
    supabase: {},
    repository: {
      async getSubscription() {
        return subscription;
      },
    },
    auth: {
      async authenticate() {
        return { user: { id: "user-a" } };
      },
    },
  });

  const path = "/api/premium/article/posttraining.ppo.clipping";
  const denied = await request(handler, { path });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "pro_required");

  subscription = { plan: "pro", status: "active" };
  const allowed = await request(handler, { path });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.topicId, "posttraining.ppo.clipping");
  assert.match(allowed.body.markdown, /PPO/);
  assert.match(allowed.body.markdown, /四象限/);
  assert.ok(allowed.body.markdown.length > 3500);
});
