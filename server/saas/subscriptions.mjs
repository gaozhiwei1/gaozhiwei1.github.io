export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"]);

export function normalizeStripeStatus(status) {
  if (status === "active" || status === "trialing") return "active";
  if (["past_due", "unpaid", "incomplete", "paused"].includes(status))
    return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "incomplete_expired") return "expired";
  return "expired";
}

export function hasProAccess(subscription, now = new Date()) {
  if (!subscription || subscription.plan !== "pro") return false;
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) return true;
  if (subscription.status === "canceled" && subscription.current_period_end) {
    return new Date(subscription.current_period_end).getTime() > now.getTime();
  }
  return false;
}

export function applicationPlan(subscription, now = new Date()) {
  return hasProAccess(subscription, now) ? "pro" : "free";
}

function idOf(value) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

export function subscriptionPeriodEnd(subscription) {
  const seconds =
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export function stripeSubscriptionRecord(subscription, userId) {
  return {
    user_id: userId,
    plan: "pro",
    status: normalizeStripeStatus(subscription.status),
    provider: "stripe",
    provider_customer_id: idOf(subscription.customer),
    provider_subscription_id: subscription.id,
    current_period_end: subscriptionPeriodEnd(subscription),
  };
}

export function subscriptionContainsPrice(subscription, allowedPriceIds) {
  const prices =
    subscription.items?.data?.map((item) => idOf(item.price)).filter(Boolean) ??
    [];
  return prices.some((priceId) => allowedPriceIds.has(priceId));
}
