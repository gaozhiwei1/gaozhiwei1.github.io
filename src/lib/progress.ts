import type { ProgressState } from "../types";

const STORAGE_KEY = "llm-interview-lab-progress-v1";

export const emptyProgress: ProgressState = {
  completedQuestions: [],
  masteredQuestions: [],
  bookmarkedQuestions: [],
  visitedTopics: [],
  completedChallenges: [],
  seenNodes: [],
  completedNodes: [],
  masteredNodes: [],
  reviewHistory: {},
};

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress;
    const stored = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...emptyProgress,
      ...stored,
      reviewHistory: stored.reviewHistory ?? {},
    };
  } catch {
    return emptyProgress;
  }
}

export function saveProgress(progress: ProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function toggleItem(items: string[], id: string): string[] {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}
