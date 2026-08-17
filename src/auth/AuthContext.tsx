import { useEffect, useMemo, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import {
  configuredOAuthProviders,
  getSupabaseClient,
  supabaseConfigured,
} from "../lib/supabase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "./authContext";

function authClientOrThrow() {
  const client = getSupabaseClient();
  if (!client)
    throw new Error(
      "Supabase 尚未配置。请设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。",
    );
  return client;
}

function throwIfError(error: AuthError | null) {
  if (error) throw error;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    supabaseConfigured ? "loading" : "unconfigured",
  );

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setSession(null);
        setStatus("anonymous");
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "anonymous");
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "anonymous");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      configured: supabaseConfigured,
      session,
      user: session?.user ?? null,
      providers: configuredOAuthProviders,
      async signIn(email, password) {
        const { error } = await authClientOrThrow().auth.signInWithPassword({
          email,
          password,
        });
        throwIfError(error);
      },
      async signUp(email, password, displayName) {
        const { data, error } = await authClientOrThrow().auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        throwIfError(error);
        return { confirmationRequired: !data.session };
      },
      async signInWithOAuth(provider) {
        if (!configuredOAuthProviders[provider])
          throw new Error(`${provider} OAuth 尚未配置`);
        const { error } = await authClientOrThrow().auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/#/auth/callback` },
        });
        throwIfError(error);
      },
      async signOut() {
        const { error } = await authClientOrThrow().auth.signOut();
        throwIfError(error);
      },
      async updateDisplayName(displayName) {
        const client = authClientOrThrow();
        if (!session?.user) throw new Error("需要登录后更新资料");
        const { error } = await client
          .from("profiles")
          .update({ display_name: displayName })
          .eq("id", session.user.id);
        if (error) throw error;
        const authUpdate = await client.auth.updateUser({
          data: { display_name: displayName },
        });
        throwIfError(authUpdate.error);
      },
    }),
    [session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
