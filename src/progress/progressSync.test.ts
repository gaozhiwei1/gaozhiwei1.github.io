import { describe, expect, it } from "vitest";
import { emptyProgress } from "../lib/progress";
import { mergeProgress, progressToRows, rowsToProgress } from "./progressSync";

describe("account progress migration", () => {
  it("merges anonymous and remote progress without deleting either side", () => {
    const anonymous = {
      ...emptyProgress,
      completedNodes: ["local"],
      seenNodes: ["local"],
      bookmarkedQuestions: ["q-local"],
      reviewHistory: {},
    };
    const remote = {
      ...emptyProgress,
      masteredNodes: ["remote"],
      completedNodes: ["remote"],
      seenNodes: ["remote"],
      bookmarkedQuestions: ["q-remote"],
      reviewHistory: {},
    };
    const merged = mergeProgress(anonymous, remote);
    expect(merged.completedNodes).toEqual(
      expect.arrayContaining(["local", "remote"]),
    );
    expect(merged.masteredNodes).toEqual(["remote"]);
    expect(merged.bookmarkedQuestions).toEqual(
      expect.arrayContaining(["q-local", "q-remote"]),
    );
  });

  it("keeps the strongest status when rows are generated", () => {
    const state = {
      ...emptyProgress,
      seenNodes: ["a"],
      completedNodes: ["a"],
      masteredNodes: ["a"],
      reviewHistory: {},
    };
    const rows = progressToRows(
      "user",
      state,
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("mastered");
  });

  it("restores account rows, bookmarks and review state", () => {
    const restored = rowsToProgress(
      [
        { content_type: "topic", content_id: "node", status: "mastered" },
        { content_type: "problem", content_id: "code", status: "passed" },
      ],
      [{ content_id: "q1" }],
      [
        {
          content_id: "q1",
          next_review_at: "2026-01-08T00:00:00Z",
          strength: 7,
          correct_streak: 2,
        },
      ],
    );
    expect(restored.masteredNodes).toEqual(["node"]);
    expect(restored.completedChallenges).toEqual(["code"]);
    expect(restored.bookmarkedQuestions).toEqual(["q1"]);
    expect(restored.reviewHistory.q1.intervalDays).toBe(7);
  });
});
