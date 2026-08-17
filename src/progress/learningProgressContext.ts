import { createContext, useContext } from "react";
import type { ExecutionResult } from "../execution/ExecutionProvider";
import type { ProgressState } from "../types";

export type SyncStatus = "local" | "loading" | "syncing" | "synced" | "error";

export interface LearningProgressContextValue {
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  syncStatus: SyncStatus;
  syncError: string | null;
  recordSubmission(
    problemId: string,
    code: string,
    result: ExecutionResult,
  ): Promise<void>;
  refreshProgress(): Promise<void>;
}

export const LearningProgressContext =
  createContext<LearningProgressContextValue | null>(null);

export function useLearningProgress() {
  const value = useContext(LearningProgressContext);
  if (!value)
    throw new Error(
      "useLearningProgress must be used inside LearningProgressProvider",
    );
  return value;
}
