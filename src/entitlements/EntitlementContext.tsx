import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/authContext";
import { apiRequest } from "../lib/api";
import {
  canAccessProblem,
  canAccessQuestion,
  canAccessTopic,
  canUseFeature,
  canViewSolution,
} from "./entitlements";
import {
  defaultEntitlementSnapshot,
  EntitlementContext,
  type EntitlementContextValue,
  type SubscriptionSnapshot,
} from "./entitlementContext";

export function EntitlementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot>(
    defaultEntitlementSnapshot,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.session) {
      setSnapshot({
        ...defaultEntitlementSnapshot,
        plan: auth.status === "authenticated" ? "free" : "anonymous",
      });
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const next = await apiRequest<SubscriptionSnapshot>(
        "/api/subscription",
        {},
        auth.session.access_token,
      );
      setSnapshot(next);
      setError(null);
    } catch (requestError) {
      setSnapshot({ ...defaultEntitlementSnapshot, plan: "free" });
      setError(
        requestError instanceof Error
          ? requestError.message
          : "订阅状态读取失败",
      );
    } finally {
      setLoading(false);
    }
  }, [auth.session, auth.status]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  useEffect(() => {
    const onFocus = () => {
      if (auth.session) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [auth.session, refresh]);

  const value = useMemo<EntitlementContextValue>(
    () => ({
      ...snapshot,
      loading,
      error,
      refresh,
      canAccessTopic: (topicId) => canAccessTopic(snapshot.plan, topicId),
      canAccessQuestion: (index) => canAccessQuestion(snapshot.plan, index),
      canAccessProblem: (problemId) =>
        canAccessProblem(snapshot.plan, problemId),
      canUseFeature: (feature) => canUseFeature(snapshot.plan, feature),
      canViewSolution: () => canViewSolution(snapshot.plan),
    }),
    [error, loading, refresh, snapshot],
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}
