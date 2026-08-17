import { productConfig } from "../config/product";

export type AccountPlan = "anonymous" | "free" | "pro" | "team" | "edu";
export type SubscriptionStatus =
  "free" | "active" | "past_due" | "canceled" | "expired";
export type ProductFeature =
  | "knowledge_map"
  | "core_learning"
  | "full_curriculum"
  | "basic_review"
  | "advanced_review"
  | "local_runner"
  | "complete_solutions"
  | "advanced_math"
  | "future_ai_interview";

const proFeatures = new Set<ProductFeature>([
  "knowledge_map",
  "core_learning",
  "full_curriculum",
  "basic_review",
  "advanced_review",
  "local_runner",
  "complete_solutions",
  "advanced_math",
  "future_ai_interview",
]);
const freeFeatures = new Set<ProductFeature>([
  "knowledge_map",
  "core_learning",
  "basic_review",
  "local_runner",
]);

export function effectivePlan(
  plan: AccountPlan,
  status: SubscriptionStatus,
): AccountPlan {
  if (["pro", "team", "edu"].includes(plan) && status === "active") return plan;
  return plan === "anonymous" ? "anonymous" : "free";
}

export function canUseFeature(
  plan: AccountPlan,
  feature: ProductFeature,
): boolean {
  return plan === "pro" || plan === "team" || plan === "edu"
    ? proFeatures.has(feature)
    : freeFeatures.has(feature);
}

export function canAccessTopic(plan: AccountPlan, topicId: string): boolean {
  return (
    canUseFeature(plan, "full_curriculum") ||
    !productConfig.premiumTopicIds.has(topicId)
  );
}

export function canAccessProblem(
  plan: AccountPlan,
  problemId: string,
): boolean {
  return (
    canUseFeature(plan, "full_curriculum") ||
    productConfig.freeProblemIds.has(problemId)
  );
}

export function canAccessQuestion(
  plan: AccountPlan,
  questionIndex: number,
): boolean {
  return (
    canUseFeature(plan, "full_curriculum") ||
    questionIndex < productConfig.freeQuestionLimit
  );
}

export function canViewSolution(plan: AccountPlan): boolean {
  return canUseFeature(plan, "complete_solutions");
}
