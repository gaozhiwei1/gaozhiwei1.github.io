import type { ExecutionResult } from "../execution/ExecutionProvider";
import { emptyProgress } from "../lib/progress";
import type { ProgressState } from "../types";

export interface ProgressRow {
  user_id: string;
  content_type: "topic" | "question" | "problem" | "activity";
  content_id: string;
  status: "seen" | "completed" | "mastered" | "attempted" | "passed";
  score: number | null;
  last_opened_at: string | null;
  mastered_at: string | null;
}

export interface BookmarkRow {
  user_id: string;
  content_type: "question";
  content_id: string;
}

export interface ReviewRow {
  user_id: string;
  content_type: "question";
  content_id: string;
  next_review_at: string;
  strength: number;
  correct_streak: number;
}

export interface LocalSubmission {
  id: string;
  problemId: string;
  code: string;
  executionProvider: "local_runner";
  result: ExecutionResult;
  createdAt: string;
  syncedUserIds: string[];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function strongestReview(
  left: ProgressState["reviewHistory"][string] | undefined,
  right: ProgressState["reviewHistory"][string] | undefined,
) {
  if (!left) return right;
  if (!right) return left;
  const latest =
    new Date(left.lastReviewedAt) >= new Date(right.lastReviewedAt)
      ? left
      : right;
  return {
    lastReviewedAt: latest.lastReviewedAt,
    intervalDays: Math.max(left.intervalDays, right.intervalDays),
    correctStreak: Math.max(left.correctStreak, right.correctStreak),
  };
}

export function mergeProgress(...states: ProgressState[]): ProgressState {
  const merged: ProgressState = { ...emptyProgress, reviewHistory: {} };
  for (const state of states) {
    merged.completedQuestions = unique([
      ...merged.completedQuestions,
      ...state.completedQuestions,
    ]);
    merged.masteredQuestions = unique([
      ...merged.masteredQuestions,
      ...state.masteredQuestions,
    ]);
    merged.bookmarkedQuestions = unique([
      ...merged.bookmarkedQuestions,
      ...state.bookmarkedQuestions,
    ]);
    merged.visitedTopics = unique([
      ...merged.visitedTopics,
      ...state.visitedTopics,
    ]);
    merged.completedChallenges = unique([
      ...merged.completedChallenges,
      ...state.completedChallenges,
    ]);
    merged.seenNodes = unique([...merged.seenNodes, ...state.seenNodes]);
    merged.completedNodes = unique([
      ...merged.completedNodes,
      ...state.completedNodes,
    ]);
    merged.masteredNodes = unique([
      ...merged.masteredNodes,
      ...state.masteredNodes,
    ]);
    for (const [id, review] of Object.entries(state.reviewHistory)) {
      const strongest = strongestReview(merged.reviewHistory[id], review);
      if (strongest) merged.reviewHistory[id] = strongest;
    }
  }
  merged.completedQuestions = unique([
    ...merged.completedQuestions,
    ...merged.masteredQuestions,
  ]);
  merged.completedNodes = unique([
    ...merged.completedNodes,
    ...merged.masteredNodes,
  ]);
  merged.seenNodes = unique([...merged.seenNodes, ...merged.completedNodes]);
  return merged;
}

export function progressToRows(
  userId: string,
  state: ProgressState,
  now = new Date(),
): ProgressRow[] {
  const rows = new Map<string, ProgressRow>();
  const put = (
    contentType: ProgressRow["content_type"],
    contentId: string,
    status: ProgressRow["status"],
  ) => {
    const key = `${contentType}:${contentId}`;
    const rank = {
      seen: 0,
      attempted: 0,
      completed: 1,
      passed: 1,
      mastered: 2,
    };
    const existing = rows.get(key);
    if (existing && rank[existing.status] > rank[status]) return;
    rows.set(key, {
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      status,
      score: null,
      last_opened_at: now.toISOString(),
      mastered_at: status === "mastered" ? now.toISOString() : null,
    });
  };
  state.seenNodes.forEach((id) => put("topic", id, "seen"));
  state.completedNodes.forEach((id) => put("topic", id, "completed"));
  state.masteredNodes.forEach((id) => put("topic", id, "mastered"));
  state.completedQuestions.forEach((id) => put("question", id, "completed"));
  state.masteredQuestions.forEach((id) => put("question", id, "mastered"));
  state.completedChallenges.forEach((id) => put("problem", id, "passed"));
  state.visitedTopics.forEach((id) =>
    put("activity", `visited-topic:${id}`, "seen"),
  );
  return [...rows.values()];
}

export function rowsToProgress(
  rows: Array<Pick<ProgressRow, "content_type" | "content_id" | "status">>,
  bookmarks: Array<Pick<BookmarkRow, "content_id">>,
  reviews: Array<
    Pick<
      ReviewRow,
      "content_id" | "next_review_at" | "strength" | "correct_streak"
    >
  >,
): ProgressState {
  const state: ProgressState = { ...emptyProgress, reviewHistory: {} };
  for (const row of rows) {
    if (row.content_type === "topic") {
      state.seenNodes.push(row.content_id);
      if (row.status === "completed" || row.status === "mastered")
        state.completedNodes.push(row.content_id);
      if (row.status === "mastered") state.masteredNodes.push(row.content_id);
    } else if (row.content_type === "question") {
      if (row.status === "completed" || row.status === "mastered")
        state.completedQuestions.push(row.content_id);
      if (row.status === "mastered")
        state.masteredQuestions.push(row.content_id);
    } else if (row.content_type === "problem" && row.status === "passed") {
      state.completedChallenges.push(row.content_id);
    } else if (
      row.content_type === "activity" &&
      row.content_id.startsWith("visited-topic:")
    ) {
      state.visitedTopics.push(row.content_id.slice("visited-topic:".length));
    }
  }
  state.bookmarkedQuestions = bookmarks.map((item) => item.content_id);
  for (const review of reviews) {
    const next = new Date(review.next_review_at);
    const intervalDays = Math.max(1, Math.round(review.strength));
    state.reviewHistory[review.content_id] = {
      lastReviewedAt: new Date(
        next.getTime() - intervalDays * 86_400_000,
      ).toISOString(),
      intervalDays,
      correctStreak: review.correct_streak,
    };
  }
  return mergeProgress(state);
}

export function progressToBookmarks(
  userId: string,
  state: ProgressState,
): BookmarkRow[] {
  return state.bookmarkedQuestions.map((contentId) => ({
    user_id: userId,
    content_type: "question",
    content_id: contentId,
  }));
}

export function progressToReviews(
  userId: string,
  state: ProgressState,
): ReviewRow[] {
  return Object.entries(state.reviewHistory).map(([contentId, review]) => ({
    user_id: userId,
    content_type: "question",
    content_id: contentId,
    next_review_at: new Date(
      new Date(review.lastReviewedAt).getTime() +
        review.intervalDays * 86_400_000,
    ).toISOString(),
    strength: review.intervalDays,
    correct_streak: review.correctStreak,
  }));
}
