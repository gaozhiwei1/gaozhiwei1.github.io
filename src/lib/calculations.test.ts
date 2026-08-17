import { describe, expect, it } from "vitest";
import {
  bytesToGiB,
  groupAdvantages,
  kvCacheBytes,
  softmax,
  teachingTokenize,
} from "./calculations";
import { challengeKnowledgeNodeOverrides, codeChallengeById, codeChallenges } from "../data/codeChallenges";
import { curriculumTracks, knowledgeNodeById, knowledgeNodes } from "../data/curriculum";
import { questions } from "../data/questions";

describe("learning lab calculations", () => {
  it("computes KV cache memory including K and V", () => {
    const bytes = kvCacheBytes({
      layers: 32,
      batch: 4,
      tokens: 8192,
      kvHeads: 8,
      headDim: 128,
      bytesPerElement: 2,
    });
    expect(bytesToGiB(bytes)).toBe(4);
  });

  it("produces normalized softmax probabilities", () => {
    const probabilities = softmax([1, 2, 3], 0.8);
    expect(probabilities.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(probabilities[2]).toBeGreaterThan(probabilities[1]);
  });

  it("normalizes group-relative advantages", () => {
    const result = groupAdvantages([1, 2, 3]);
    expect(result.mean).toBe(2);
    expect(result.advantages.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0);
  });

  it("labels continuation pieces in the teaching subword demo", () => {
    expect(teachingTokenize("机器学习模型", "subword")).toEqual([
      "机器",
      "##学习",
      "模型",
    ]);
  });
});

describe("Phase 2 curriculum integrity", () => {
  it("keeps the curriculum deep while the first level stays compact", () => {
    expect(curriculumTracks).toHaveLength(12);
    expect(knowledgeNodes).toHaveLength(118);
    expect(questions).toHaveLength(226);
    expect(codeChallenges).toHaveLength(33);
  });

  it("uses unique stable ids and valid prerequisite references", () => {
    expect(new Set(knowledgeNodes.map((node) => node.id)).size).toBe(knowledgeNodes.length);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    expect(new Set(codeChallenges.map((challenge) => challenge.id)).size).toBe(codeChallenges.length);
    for (const node of knowledgeNodes) {
      for (const prerequisite of node.prerequisites) {
        expect(knowledgeNodeById[prerequisite], `${node.id} -> ${prerequisite}`).toBeDefined();
      }
    }
  });

  it("links every question to a detailed knowledge node", () => {
    for (const question of questions) {
      expect(question.nodeId).toBeTruthy();
      expect(knowledgeNodeById[question.nodeId ?? ""]).toBeDefined();
    }
  });

  it("keeps question and coding deep links resolvable", () => {
    for (const question of questions) {
      if (question.codeChallengeId) {
        expect(codeChallengeById[question.codeChallengeId], question.id).toBeDefined();
      }
    }

    const unlinkedChallenges = codeChallenges
      .filter((challenge) => {
        const directNode = knowledgeNodes.find((node) => node.codeChallengeId === challenge.id);
        const overrideNode = knowledgeNodeById[challengeKnowledgeNodeOverrides[challenge.id]];
        return !directNode && !overrideNode;
      })
      .map((challenge) => challenge.id);
    expect(unlinkedChallenges).toEqual([]);
  });
});
