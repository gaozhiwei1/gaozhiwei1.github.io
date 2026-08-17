import { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import { GoldArticle } from "../content/gold/GoldArticle";
import { apiRequest } from "../lib/api";

interface PremiumArticlePayload {
  topicId: string;
  markdown: string;
}

export function PremiumDeepDive({ topicId }: { topicId: string }) {
  const auth = useAuth();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.session) return;
    let active = true;

    void apiRequest<PremiumArticlePayload>(
      `/api/premium/article/${encodeURIComponent(topicId)}`,
      {},
      auth.session.access_token,
    )
      .then((payload) => {
        if (active) setMarkdown(payload.markdown);
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "高级教程加载失败",
          );
      });

    return () => {
      active = false;
    };
  }, [auth.session, topicId]);

  if (!auth.session)
    return <p className="premium-load-state">登录后可安全加载 PRO 深度教程。</p>;
  if (error) return <p className="premium-load-state is-error">{error}</p>;
  if (!markdown)
    return <p className="premium-load-state">正在安全加载 PRO 深度教程…</p>;

  return <GoldArticle markdown={markdown} nodeId={topicId} />;
}
