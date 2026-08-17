import { useEffect, useState } from "react";
import { GitFork, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { consumeAuthReturn, rememberAuthReturn } from "../auth/authNavigation";

interface AuthPageProps {
  mode: "login" | "signup";
  navigate: (path: string) => void;
}

export function AuthPage({ mode, navigate }: AuthPageProps) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === "authenticated") navigate(consumeAuthReturn());
  }, [auth.status, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const result = await auth.signUp(email, password, displayName.trim());
        if (result.confirmationRequired)
          setMessage("注册成功。请先在邮箱中确认账号，然后返回登录。");
      } else {
        await auth.signIn(email, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "认证失败");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    rememberAuthReturn();
    setBusy(true);
    setError(null);
    try {
      await auth.signInWithOAuth(provider);
    } catch (oauthError) {
      setError(
        oauthError instanceof Error ? oauthError.message : "OAuth 登录失败",
      );
      setBusy(false);
    }
  };

  return (
    <div className="page auth-page">
      <section className="auth-panel">
        <header>
          <span className="eyebrow">MATH2LLM ACCOUNT</span>
          <h1>{mode === "signup" ? "创建账号" : "登录"}</h1>
          <p>
            {mode === "signup"
              ? "保存学习进度，并在不同设备继续。"
              : "继续你的 LLM 算法训练路径。"}
          </p>
        </header>
        {!auth.configured && (
          <div className="setup-warning">
            <ShieldCheck />
            <span>
              <b>本地尚未配置 Supabase</b>
              <small>匿名学习仍可使用。配置 `.env` 后即可启用真实账号。</small>
            </span>
          </div>
        )}
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              <span>显示名称</span>
              <input
                required
                minLength={1}
                maxLength={80}
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
          )}
          <label>
            <span>邮箱</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span>密码</span>
            <input
              required
              type="password"
              minLength={8}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-message is-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-message is-success">{message}</p>}
          <button className="auth-submit" disabled={busy || !auth.configured}>
            {busy && <LoaderCircle className="spin" />}
            {mode === "signup" ? "注册" : "登录"}
          </button>
        </form>
        <div className="auth-divider">
          <span>或</span>
        </div>
        <div className="oauth-actions">
          <button
            disabled={busy || !auth.providers.google}
            onClick={() => oauth("google")}
          >
            <Mail />
            使用 Google 登录{!auth.providers.google && <small>未配置</small>}
          </button>
          <button
            disabled={busy || !auth.providers.github}
            onClick={() => oauth("github")}
          >
            <GitFork />
            使用 GitHub 登录{!auth.providers.github && <small>未配置</small>}
          </button>
        </div>
        <footer>
          {mode === "signup" ? "已有账号？" : "还没有账号？"}
          <button
            onClick={() => navigate(mode === "signup" ? "/login" : "/signup")}
          >
            {mode === "signup" ? "登录" : "注册"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function OAuthCallbackPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const auth = useAuth();
  useEffect(() => {
    if (auth.status === "authenticated") navigate(consumeAuthReturn());
  }, [auth.status, navigate]);
  return (
    <div className="page auth-page">
      <section className="auth-panel auth-callback">
        <LoaderCircle className="spin" />
        <h1>正在完成登录</h1>
        <p>正在验证 OAuth 回调并恢复之前的学习位置。</p>
        {auth.status === "anonymous" && (
          <button onClick={() => navigate("/login")}>返回登录</button>
        )}
      </section>
    </div>
  );
}
