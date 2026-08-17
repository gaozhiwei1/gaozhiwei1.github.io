import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StripePaymentProvider } from "./payments.mjs";
import { hasProAccess, normalizeStripeStatus } from "./subscriptions.mjs";

function subscription(overrides = {}) {
  return {
    id: "sub_test",
    status: "active",
    customer: "cus_test",
    metadata: { supabase_user_id: "user-a" },
    items: {
      data: [
        { price: { id: "price_monthly" }, current_period_end: 1_800_000_000 },
      ],
    },
    ...overrides,
  };
}

function fixture() {
  const records = [];
  const events = new Map();
  const repository = {
    async getSubscription(userId) {
      return records.find((item) => item.user_id === userId) ?? null;
    },
    async findUserId() {
      return "user-a";
    },
    async upsertSubscription(record) {
      records.push(record);
      return record;
    },
    async beginWebhookEvent(event) {
      if (events.get(event.id) === "processed") return { duplicate: true };
      events.set(event.id, "processing");
      return { duplicate: false };
    },
    async finishWebhookEvent(id) {
      events.set(id, "processed");
    },
    async failWebhookEvent(id) {
      events.set(id, "failed");
    },
  };
  let checkoutPayload;
  const stripe = {
    customers: {
      async create() {
        return { id: "cus_test" };
      },
    },
    checkout: {
      sessions: {
        async create(payload) {
          checkoutPayload = payload;
          return { url: "https://checkout.stripe.test/session" };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create() {
          return { url: "https://billing.stripe.test/session" };
        },
      },
    },
    subscriptions: {
      async retrieve() {
        return subscription();
      },
    },
  };
  const config = {
    appBaseUrl: "https://math2llm.test",
    stripe: {
      portalConfigurationId: null,
      prices: {
        monthly: { enabled: true, priceId: "price_monthly" },
        annual: { enabled: true, priceId: "price_annual" },
      },
    },
  };
  return {
    provider: new StripePaymentProvider({ stripe, repository, config }),
    stripe,
    repository,
    records,
    events,
    checkoutPayload: () => checkoutPayload,
  };
}

describe("Stripe subscription provider", () => {
  it("normalizes provider state without granting past_due access", () => {
    assert.equal(normalizeStripeStatus("trialing"), "active");
    assert.equal(normalizeStripeStatus("unpaid"), "past_due");
    assert.equal(hasProAccess({ plan: "pro", status: "past_due" }), false);
  });

  it("creates Checkout only with the configured server-side Price", async () => {
    const test = fixture();
    const result = await test.provider.createCheckout({
      user: { id: "user-a", email: "a@example.test" },
      interval: "monthly",
    });
    assert.equal(result.url, "https://checkout.stripe.test/session");
    assert.equal(test.checkoutPayload().line_items[0].price, "price_monthly");
    assert.equal(
      test.checkoutPayload().subscription_data.metadata.supabase_user_id,
      "user-a",
    );
  });

  it("does not create a second Checkout for an active PRO subscription", async () => {
    const test = fixture();
    await test.repository.upsertSubscription({
      user_id: "user-a",
      plan: "pro",
      status: "active",
    });
    await assert.rejects(
      () =>
        test.provider.createCheckout({
          user: { id: "user-a", email: "a@example.test" },
          interval: "monthly",
        }),
      /已经是 PRO/,
    );
    assert.equal(test.checkoutPayload(), undefined);
  });

  it("directs a past-due subscriber to billing management", async () => {
    const test = fixture();
    await test.repository.upsertSubscription({
      user_id: "user-a",
      plan: "pro",
      status: "past_due",
      provider_subscription_id: "sub_test",
    });
    await assert.rejects(
      () =>
        test.provider.createCheckout({
          user: { id: "user-a", email: "a@example.test" },
          interval: "monthly",
        }),
      /处理付款问题/,
    );
    assert.equal(test.checkoutPayload(), undefined);
  });

  it("activates PRO once and ignores duplicate webhook delivery", async () => {
    const test = fixture();
    const event = {
      id: "evt_paid",
      type: "customer.subscription.updated",
      data: { object: subscription() },
    };
    assert.deepEqual(await test.provider.processEvent(event), {
      duplicate: false,
    });
    assert.equal(test.records.at(-1).status, "active");
    const writes = test.records.length;
    assert.deepEqual(await test.provider.processEvent(event), {
      duplicate: true,
    });
    assert.equal(test.records.length, writes);
  });

  it("updates past_due and canceled states from Stripe lifecycle events", async () => {
    const test = fixture();
    test.stripe.subscriptions.retrieve = async () =>
      subscription({ status: "past_due" });
    await test.provider.processEvent({
      id: "evt_failed",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_test" } },
    });
    assert.equal(test.records.at(-1).status, "past_due");
    await test.provider.processEvent({
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: subscription({ status: "canceled", current_period_end: 1 }),
      },
    });
    assert.equal(test.records.at(-1).status, "canceled");
  });

  it("reads the subscription from current Invoice parent data", async () => {
    const test = fixture();
    test.stripe.subscriptions.retrieve = async (subscriptionId) => {
      assert.equal(subscriptionId, "sub_test");
      return subscription({ status: "past_due" });
    };
    await test.provider.processEvent({
      id: "evt_dahlia_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_test" },
          },
        },
      },
    });
    assert.equal(test.records.at(-1).status, "past_due");
  });

  it("refuses to grant access for an unconfigured Stripe Price", async () => {
    const test = fixture();
    await assert.rejects(
      () =>
        test.provider.processEvent({
          id: "evt_unknown_price",
          type: "customer.subscription.created",
          data: {
            object: subscription({
              items: { data: [{ price: { id: "price_attacker" } }] },
            }),
          },
        }),
      /does not belong|不属于/,
    );
    assert.equal(test.events.get("evt_unknown_price"), "failed");
    assert.equal(test.records.length, 0);
  });
});
