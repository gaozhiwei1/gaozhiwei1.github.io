import {
  hasProAccess,
  stripeSubscriptionRecord,
  subscriptionContainsPrice,
} from "./subscriptions.mjs";

export class PaymentError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.status = status;
  }
}

export class PaymentProvider {
  async createCheckout() {
    throw new Error("Not implemented");
  }
  async createPortal() {
    throw new Error("Not implemented");
  }
}

function idOf(value) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

function invoiceSubscriptionId(invoice) {
  return (
    idOf(invoice.subscription) ??
    idOf(invoice.parent?.subscription_details?.subscription)
  );
}

export class StripePaymentProvider extends PaymentProvider {
  constructor({ stripe, repository, config }) {
    super();
    this.stripe = stripe;
    this.repository = repository;
    this.config = config;
  }

  async createCheckout({ user, interval }) {
    const price = this.config.stripe.prices[interval];
    if (!price?.enabled || !price.priceId)
      throw new PaymentError("price_not_configured", "该订阅周期尚未配置", 503);
    const current = await this.repository.getSubscription(user.id);
    if (hasProAccess(current)) {
      throw new PaymentError(
        "subscription_already_active",
        "当前账号已经是 PRO，请在账户页管理现有订阅",
        409,
      );
    }
    if (current?.provider_subscription_id && current.status === "past_due") {
      throw new PaymentError(
        "subscription_requires_action",
        "现有订阅需要处理付款问题，请在账户页管理订阅",
        409,
      );
    }
    let customerId =
      current?.provider === "stripe" ? current.provider_customer_id : null;
    if (!customerId) {
      const customer = await this.stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `math2llm-customer-${user.id}` },
      );
      customerId = customer.id;
      await this.repository.upsertSubscription({
        user_id: user.id,
        plan: "free",
        status: "free",
        provider: "stripe",
        provider_customer_id: customerId,
      });
    }
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: price.priceId, quantity: 1 }],
        metadata: { supabase_user_id: user.id, plan: "pro", interval },
        subscription_data: {
          metadata: { supabase_user_id: user.id, plan: "pro" },
        },
        success_url: `${this.config.appBaseUrl}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.config.appBaseUrl}/#/pricing?checkout=canceled`,
      },
      {
        idempotencyKey: `math2llm-checkout-${user.id}-${interval}-${Math.floor(Date.now() / 300000)}`,
      },
    );
    return { url: session.url };
  }

  async createPortal({ user }) {
    const current = await this.repository.getSubscription(user.id);
    if (!current?.provider_customer_id)
      throw new PaymentError(
        "customer_missing",
        "当前账号还没有可管理的 Stripe 订阅",
        404,
      );
    const session = await this.stripe.billingPortal.sessions.create({
      customer: current.provider_customer_id,
      return_url: `${this.config.appBaseUrl}/#/account`,
      ...(this.config.stripe.portalConfigurationId
        ? { configuration: this.config.stripe.portalConfigurationId }
        : {}),
    });
    return { url: session.url };
  }

  async syncSubscription(subscription, fallbackUserId = null) {
    const allowedPrices = new Set(
      Object.values(this.config.stripe.prices)
        .map((price) => price.priceId)
        .filter(Boolean),
    );
    if (!subscriptionContainsPrice(subscription, allowedPrices)) {
      throw new PaymentError(
        "unrecognized_price",
        "Webhook 中的订阅不属于已配置的 Math2LLM PRO Price",
        422,
      );
    }
    const customerId = idOf(subscription.customer);
    const userId =
      subscription.metadata?.supabase_user_id ??
      fallbackUserId ??
      (await this.repository.findUserId({
        customerId,
        subscriptionId: subscription.id,
      }));
    if (!userId)
      throw new PaymentError(
        "subscription_user_missing",
        "无法把 Stripe 订阅关联到用户",
        422,
      );
    return this.repository.upsertSubscription(
      stripeSubscriptionRecord(subscription, userId),
    );
  }

  async processEvent(event) {
    const state = await this.repository.beginWebhookEvent(event);
    if (state.duplicate) return { duplicate: true };
    try {
      const object = event.data.object;
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        if (object.mode === "subscription" && object.subscription) {
          const subscription = await this.stripe.subscriptions.retrieve(
            idOf(object.subscription),
          );
          await this.syncSubscription(
            subscription,
            object.client_reference_id ?? object.metadata?.supabase_user_id,
          );
        }
      } else if (
        [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ].includes(event.type)
      ) {
        await this.syncSubscription(object);
      } else if (
        [
          "invoice.paid",
          "invoice.payment_failed",
          "invoice.payment_action_required",
        ].includes(event.type)
      ) {
        const subscriptionId = invoiceSubscriptionId(object);
        if (subscriptionId) {
          const subscription =
            await this.stripe.subscriptions.retrieve(subscriptionId);
          await this.syncSubscription(subscription);
        }
      } else if (
        [
          "checkout.session.expired",
          "checkout.session.async_payment_failed",
        ].includes(event.type)
      ) {
        // An abandoned checkout must not downgrade an existing subscription.
      }
      await this.repository.finishWebhookEvent(event.id);
      return { duplicate: false };
    } catch (error) {
      await this.repository.failWebhookEvent(event.id, error);
      throw error;
    }
  }
}
