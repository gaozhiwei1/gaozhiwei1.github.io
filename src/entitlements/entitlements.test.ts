import { describe, expect, it } from "vitest";
import {
  canAccessProblem,
  canAccessQuestion,
  canAccessTopic,
  canUseFeature,
  effectivePlan,
} from "./entitlements";
import { questions } from "../data/questions";

describe("central entitlements", () => {
  it("keeps Local Runner available to anonymous and FREE users", () => {
    expect(canUseFeature("anonymous", "local_runner")).toBe(true);
    expect(canUseFeature("free", "local_runner")).toBe(true);
  });

  it("limits premium curriculum, questions and problems without PRO", () => {
    expect(canAccessTopic("free", "posttraining.dpo.derivation")).toBe(false);
    expect(canAccessTopic("pro", "posttraining.dpo.derivation")).toBe(true);
    expect(canAccessQuestion("free", 49)).toBe(true);
    expect(canAccessQuestion("free", 50)).toBe(false);
    expect(canAccessProblem("free", "stable-softmax")).toBe(true);
    expect(canAccessProblem("free", "dpo-loss")).toBe(false);
    expect(canAccessProblem("pro", "dpo-loss")).toBe(true);
  });

  it("does not grant PRO for a non-active subscription", () => {
    expect(effectivePlan("pro", "past_due")).toBe("free");
    expect(effectivePlan("pro", "expired")).toBe("free");
    expect(effectivePlan("pro", "active")).toBe("pro");
  });

  it("does not embed premium answer payloads in the public question bank", () => {
    expect(questions).toHaveLength(226);
    for (const question of questions.slice(50)) {
      expect(question.shortAnswer).toBe("");
      expect(question.explanation).toBe("");
      expect(question.followUps).toEqual([]);
      expect(question.equations ?? []).toEqual([]);
      expect(question.pitfalls ?? []).toEqual([]);
    }
  });
});
