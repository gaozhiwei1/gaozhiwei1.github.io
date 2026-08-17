export class RepositoryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "RepositoryError";
    this.cause = cause;
  }
}

function assertData(result, operation) {
  if (result.error)
    throw new RepositoryError(
      `${operation}: ${result.error.message}`,
      result.error,
    );
  return result.data;
}

export function createSubscriptionRepository(supabase) {
  return {
    async getSubscription(userId) {
      const data = assertData(
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        "读取订阅失败",
      );
      return data;
    },
    async findUserId({ customerId, subscriptionId }) {
      let query = supabase.from("subscriptions").select("user_id");
      query = subscriptionId
        ? query.eq("provider_subscription_id", subscriptionId)
        : query.eq("provider_customer_id", customerId);
      const data = assertData(await query.maybeSingle(), "定位订阅用户失败");
      return data?.user_id ?? null;
    },
    async upsertSubscription(record) {
      const data = assertData(
        await supabase
          .from("subscriptions")
          .upsert(record, { onConflict: "user_id" })
          .select("*")
          .single(),
        "保存订阅失败",
      );
      return data;
    },
    async beginWebhookEvent(event) {
      const existing = assertData(
        await supabase
          .from("stripe_webhook_events")
          .select("*")
          .eq("event_id", event.id)
          .maybeSingle(),
        "读取 Webhook 幂等记录失败",
      );
      if (existing?.processing_status === "processed")
        return { duplicate: true };
      if (existing) {
        assertData(
          await supabase
            .from("stripe_webhook_events")
            .update({
              processing_status: "processing",
              attempts: existing.attempts + 1,
              last_error: null,
            })
            .eq("event_id", event.id),
          "更新 Webhook 幂等记录失败",
        );
      } else {
        assertData(
          await supabase
            .from("stripe_webhook_events")
            .insert({ event_id: event.id, event_type: event.type }),
          "创建 Webhook 幂等记录失败",
        );
      }
      return { duplicate: false };
    },
    async finishWebhookEvent(eventId) {
      assertData(
        await supabase
          .from("stripe_webhook_events")
          .update({
            processing_status: "processed",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("event_id", eventId),
        "完成 Webhook 幂等记录失败",
      );
    },
    async failWebhookEvent(eventId, error) {
      assertData(
        await supabase
          .from("stripe_webhook_events")
          .update({
            processing_status: "failed",
            last_error: String(error?.message ?? error).slice(0, 500),
          })
          .eq("event_id", eventId),
        "记录 Webhook 失败状态失败",
      );
    },
  };
}
