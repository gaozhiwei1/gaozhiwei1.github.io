import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, LoaderCircle } from "lucide-react";
import { useEntitlements } from "../entitlements/entitlementContext";

export function PaymentStatusPage({
  outcome,
  navigate,
}: {
  outcome: "success" | "error";
  navigate: (path: string) => void;
}) {
  const entitlements = useEntitlements();
  const unlocked = entitlements.canUseFeature("full_curriculum");
  const [attempts, setAttempts] = useState(0);
  useEffect(() => {
    if (outcome !== "success" || unlocked || attempts >= 15) return;
    const timer = window.setTimeout(() => {
      void entitlements.refresh();
      setAttempts((value) => value + 1);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [attempts, entitlements, outcome, unlocked]);
  return (
    <div className="page payment-status-page">
      <section
        className={
          outcome === "error"
            ? "is-error"
            : unlocked
              ? "is-success"
              : "is-pending"
        }
      >
        {outcome === "error" ? (
          <CircleX />
        ) : unlocked ? (
          <CheckCircle2 />
        ) : (
          <LoaderCircle className="spin" />
        )}
        <h1>
          {outcome === "error"
            ? "支付未完成"
            : unlocked
              ? "PRO 已解锁"
              : "正在确认订阅"}
        </h1>
        <p>
          {outcome === "error"
            ? "没有修改你的订阅状态，可以返回定价页重试。"
            : unlocked
              ? "签名 Webhook 已更新账号权限，刷新页面后仍会保持。"
              : "Stripe 返回成功不等于授权成功，系统正在等待服务端 Webhook 确认。"}
        </p>
        {attempts >= 15 && !unlocked && (
          <p className="status-detail">
            确认时间较长。可在 Account 页面刷新订阅状态，或检查 Stripe Webhook
            日志。
          </p>
        )}
        <div>
          <button onClick={() => navigate(unlocked ? "/map" : "/pricing")}>
            {unlocked ? "进入完整课程" : "返回定价"}
          </button>
          <button
            className="secondary-action"
            onClick={() => navigate("/account")}
          >
            查看账号
          </button>
        </div>
      </section>
    </div>
  );
}
