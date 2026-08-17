export type BillingInterval = "monthly" | "annual";

export interface CommercePrice {
  enabled: boolean;
  amountCny: number;
  label: string;
}

export interface CommerceConfig {
  currency: "CNY";
  stripeConfigured: boolean;
  authConfigured: boolean;
  authProviders: { email: boolean; google: boolean; github: boolean };
  plans: {
    free: { id: "free"; name: string; amountCny: 0 };
    pro: {
      id: "pro";
      name: string;
      prices: Record<BillingInterval, CommercePrice>;
    };
  };
}

export interface PaymentProvider {
  readonly id: string;
  loadConfig(): Promise<CommerceConfig>;
  createCheckout(
    interval: BillingInterval,
    accessToken: string,
  ): Promise<string>;
  createPortal(accessToken: string): Promise<string>;
}

export interface FuturePaymentProvider extends PaymentProvider {
  readonly id: "alipay" | "wechat" | string;
}
