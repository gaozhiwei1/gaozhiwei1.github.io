import { createContext, useContext } from "react";
import type {
  AccountPlan,
  ProductFeature,
  SubscriptionStatus,
} from "./entitlements";

export interface SubscriptionSnapshot {
  plan: AccountPlan;
  status: SubscriptionStatus;
  provider: string | null;
  currentPeriodEnd: string | null;
}

export interface EntitlementContextValue extends SubscriptionSnapshot {
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  canAccessTopic(topicId: string): boolean;
  canAccessQuestion(questionIndex: number): boolean;
  canAccessProblem(problemId: string): boolean;
  canUseFeature(feature: ProductFeature): boolean;
  canViewSolution(): boolean;
}

export const defaultEntitlementSnapshot: SubscriptionSnapshot = {
  plan: "anonymous",
  status: "free",
  provider: null,
  currentPeriodEnd: null,
};

export const EntitlementContext = createContext<EntitlementContextValue | null>(
  null,
);

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value)
    throw new Error("useEntitlements must be used inside EntitlementProvider");
  return value;
}
