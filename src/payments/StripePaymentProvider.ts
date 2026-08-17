import { apiRequest } from "../lib/api";
import type {
  BillingInterval,
  CommerceConfig,
  PaymentProvider,
} from "./PaymentProvider";

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe";

  loadConfig() {
    return apiRequest<CommerceConfig>("/api/commerce/config");
  }

  async createCheckout(interval: BillingInterval, accessToken: string) {
    const result = await apiRequest<{ url: string }>(
      "/api/billing/checkout",
      {
        method: "POST",
        body: JSON.stringify({ interval }),
      },
      accessToken,
    );
    return result.url;
  }

  async createPortal(accessToken: string) {
    const result = await apiRequest<{ url: string }>(
      "/api/billing/portal",
      { method: "POST", body: "{}" },
      accessToken,
    );
    return result.url;
  }
}

export const paymentProvider = new StripePaymentProvider();
