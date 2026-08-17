import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  LogOut,
  Save,
  TerminalSquare,
  UserRound,
} from "lucide-react";
import { useAuth } from "../auth/authContext";
import { useEntitlements } from "../entitlements/entitlementContext";
import { getSupabaseClient } from "../lib/supabase";
import { paymentProvider } from "../payments/StripePaymentProvider";
import { useLearningProgress } from "../progress/learningProgressContext";
import { useLocalRunner } from "../execution/useLocalRunner";

export function AccountPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const premium = entitlements.canUseFeature("full_curriculum");
  const canManageSubscription = entitlements.provider === "stripe";
  const learning = useLearningProgress();
  const runner = useLocalRunner();
  const [displayName, setDisplayName] = useState(() =>
    String(
      auth.user?.user_metadata.display_name ??
        auth.user?.user_metadata.full_name ??
        "",
    ),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user) return;
    const client = getSupabaseClient();
    void client
      ?.from("profiles")
      .select("display_name")
      .eq("id", auth.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [auth.user]);

  const stats = useMemo(
    () => ({
      completed: learning.progress.completedNodes.length,
      mastered: learning.progress.masteredNodes.length,
      code: learning.progress.completedChallenges.length,
    }),
    [learning.progress],
  );

  if (!auth.user)
    return (
      <div className="page account-page">
        <section className="account-login-required">
          <UserRound />
          <h1>登录后查看账号</h1>
          <p>匿名学习进度会在登录后安全合并，不会被删除。</p>
          <button onClick={() => navigate("/login")}>登录</button>
        </section>
      </div>
    );

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await auth.updateDisplayName(displayName.trim());
      setMessage("资料已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };
  const manage = async () => {
    if (!auth.session) return;
    setBusy(true);
    setError(null);
    try {
      window.location.assign(
        await paymentProvider.createPortal(auth.session.access_token),
      );
    } catch (portalError) {
      setError(
        portalError instanceof Error ? portalError.message : "订阅管理暂不可用",
      );
      setBusy(false);
    }
  };

  return (
    <div className="page account-page">
      <header className="commercial-header">
        <span className="eyebrow">ACCOUNT</span>
        <h1>账号与学习状态</h1>
        <p>只保留与学习、订阅和本地执行直接相关的信息。</p>
      </header>
      <div className="account-sections">
        <section>
          <header>
            <UserRound />
            <div>
              <span>PROFILE</span>
              <h2>个人资料</h2>
            </div>
          </header>
          <dl>
            <div>
              <dt>邮箱</dt>
              <dd>{auth.user.email}</dd>
            </div>
          </dl>
          <label>
            <span>显示名称</span>
            <input
              maxLength={80}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <button onClick={saveProfile} disabled={busy || !displayName.trim()}>
            <Save />
            保存资料
          </button>
        </section>
        <section>
          <header>
            <CreditCard />
            <div>
              <span>SUBSCRIPTION</span>
              <h2>订阅</h2>
            </div>
          </header>
          <dl>
            <div>
              <dt>当前方案</dt>
              <dd>
                <b className={premium ? "plan-pro" : ""}>
                  {entitlements.plan.toUpperCase()}
                </b>
              </dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{entitlements.status}</dd>
            </div>
            <div>
              <dt>续费/到期日期</dt>
              <dd>
                {entitlements.currentPeriodEnd
                  ? new Date(entitlements.currentPeriodEnd).toLocaleDateString(
                      "zh-CN",
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
          {premium || canManageSubscription ? (
            <button onClick={manage} disabled={busy}>
              管理订阅
            </button>
          ) : (
            <button onClick={() => navigate("/pricing")}>查看 PRO</button>
          )}
        </section>
        <section>
          <header>
            <UserRound />
            <div>
              <span>LEARNING</span>
              <h2>学习</h2>
            </div>
          </header>
          <div className="account-stats">
            <span>
              <b>{stats.completed}</b>已完成知识点
            </span>
            <span>
              <b>{stats.mastered}</b>已掌握
            </span>
            <span>
              <b>{stats.code}</b>代码题通过
            </span>
          </div>
          <p className={`sync-state is-${learning.syncStatus}`}>
            {learning.syncStatus === "synced"
              ? "账号进度已同步"
              : learning.syncStatus === "local"
                ? "当前为匿名本地进度"
                : learning.syncStatus === "error"
                  ? `同步失败：${learning.syncError}`
                  : "正在同步进度"}
          </p>
        </section>
        <section>
          <header>
            <TerminalSquare />
            <div>
              <span>LOCAL ENVIRONMENT</span>
              <h2>本地环境</h2>
            </div>
          </header>
          <dl>
            <div>
              <dt>Local Runner</dt>
              <dd>
                {runner.status === "connected"
                  ? "已连接"
                  : runner.status === "detecting"
                    ? "正在检测"
                    : "未连接"}
              </dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>
                {runner.environment?.gpuModel ?? runner.environment?.cpu ?? "—"}
              </dd>
            </div>
          </dl>
          <p>
            Runner
            配对会话与网站账号相互独立，本地执行不会因订阅状态获得用户身份权限。
          </p>
        </section>
      </div>
      {(message || error) && (
        <p className={`form-message ${error ? "is-error" : "is-success"}`}>
          {error ?? message}
        </p>
      )}
      <button className="logout-button" onClick={() => void auth.signOut()}>
        <LogOut />
        退出登录
      </button>
    </div>
  );
}
