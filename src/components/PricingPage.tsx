import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { rememberAuthReturn } from "../auth/authNavigation";
import { productConfig } from "../config/product";
import { useEntitlements } from "../entitlements/entitlementContext";
import type {
  BillingInterval,
  CommerceConfig,
} from "../payments/PaymentProvider";
import { paymentProvider } from "../payments/StripePaymentProvider";

export function PricingPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const premium = entitlements.canUseFeature("full_curriculum");
  const [config, setConfig] = useState<CommerceConfig | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void paymentProvider
      .loadConfig()
      .then(setConfig)
      .catch((requestError: unknown) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "定价配置加载失败",
        ),
      );
  }, []);
  const selectedInterval: BillingInterval =
    config &&
    !config.plans.pro.prices[interval].enabled &&
    config.plans.pro.prices.monthly.enabled
      ? "monthly"
      : interval;
  const selected = config?.plans.pro.prices[selectedInterval];
  const amount = useMemo(
    () => (selected ? `¥${(selected.amountCny / 100).toFixed(0)}` : "待配置"),
    [selected],
  );

  const checkout = async () => {
    if (!auth.session) {
      rememberAuthReturn("/pricing");
      navigate("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = await paymentProvider.createCheckout(
        selectedInterval,
        auth.session.access_token,
      );
      window.location.assign(url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout 创建失败",
      );
      setBusy(false);
    }
  };

  return (
    <div className="page pricing-page">
      <header className="commercial-header">
        <span className="eyebrow">PLANS</span>
        <h1>选择适合你的训练深度</h1>
        <p>先用 FREE 建立学习路径，需要完整推导、题库与代码解答时再升级。</p>
      </header>
      <div className="billing-switch" role="group" aria-label="订阅周期">
        {(["monthly", "annual"] as const).map((value) => (
          <button
            key={value}
            disabled={!config?.plans.pro.prices[value].enabled}
            className={selectedInterval === value ? "is-active" : ""}
            onClick={() => setInterval(value)}
          >
            {value === "monthly" ? "月付" : "年付"}
            {value === "annual" && <small>更适合系统学习</small>}
          </button>
        ))}
      </div>
      <div className="pricing-grid">
        <article className="price-card">
          <span>FREE</span>
          <h2>¥0</h2>
          <p>{productConfig.plans.free.tagline}</p>
          <ul>
            {productConfig.plans.free.features.map((item) => (
              <li key={item}>
                <Check />
                {item}
              </li>
            ))}
          </ul>
          <button disabled>{premium ? "基础方案" : "当前方案"}</button>
        </article>
        <article className="price-card is-pro">
          <div className="price-card__flag">完整体系</div>
          <span>PRO</span>
          <h2>
            {amount}
            <small>/{selectedInterval === "annual" ? "年" : "月"}</small>
          </h2>
          <p>{productConfig.plans.pro.tagline}</p>
          <ul>
            {productConfig.plans.pro.features.map((item) => (
              <li key={item}>
                <Check />
                {item}
              </li>
            ))}
          </ul>
          <button
            disabled={busy || premium || !selected?.enabled}
            onClick={checkout}
          >
            {busy && <LoaderCircle className="spin" />}
            {premium
              ? "当前方案"
              : selected?.enabled
                ? "升级 Pro"
                : "Stripe TEST MODE 待配置"}
          </button>
        </article>
      </div>
      {error && (
        <p className="commerce-error" role="alert">
          {error}
        </p>
      )}
      <div className="payment-trust">
        <ShieldCheck />
        <p>
          <b>由 Stripe 托管支付页面</b>
          <span>
            Math2LLM 不接触或保存银行卡信息。PRO 只会在签名 Webhook 确认后解锁。
          </span>
        </p>
      </div>
    </div>
  );
}
