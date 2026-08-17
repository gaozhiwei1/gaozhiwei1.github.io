import { createContext, useContext } from "react";
import type { Provider, Session, User } from "@supabase/supabase-js";
import type { configuredOAuthProviders } from "../lib/supabase";

export type AuthStatus =
  "loading" | "anonymous" | "authenticated" | "unconfigured";

export interface AuthContextValue {
  status: AuthStatus;
  configured: boolean;
  session: Session | null;
  user: User | null;
  providers: typeof configuredOAuthProviders;
  signIn(email: string, password: string): Promise<void>;
  signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ confirmationRequired: boolean }>;
  signInWithOAuth(
    provider: Extract<Provider, "google" | "github">,
  ): Promise<void>;
  signOut(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
