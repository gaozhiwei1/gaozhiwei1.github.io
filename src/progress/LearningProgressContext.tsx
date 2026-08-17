import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/authContext";
import type { ExecutionResult } from "../execution/ExecutionProvider";
import { emptyProgress, loadProgress, saveProgress } from "../lib/progress";
import { getSupabaseClient } from "../lib/supabase";
import type { ProgressState } from "../types";
import {
  mergeProgress,
  progressToBookmarks,
  progressToReviews,
  progressToRows,
  rowsToProgress,
  type LocalSubmission,
} from "./progressSync";
import {
  LearningProgressContext,
  type SyncStatus,
} from "./learningProgressContext";

const ACCOUNT_CACHE_PREFIX = "math2llm-account-progress-v1:";
const SUBMISSION_QUEUE_KEY = "math2llm-local-submissions-v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function loadAccountCache(userId: string) {
  return readJson<ProgressState>(
    `${ACCOUNT_CACHE_PREFIX}${userId}`,
    emptyProgress,
  );
}

function saveAccountCache(userId: string, state: ProgressState) {
  localStorage.setItem(
    `${ACCOUNT_CACHE_PREFIX}${userId}`,
    JSON.stringify(state),
  );
}

async function loadRemote(userId: string) {
  const client = getSupabaseClient();
  if (!client) return emptyProgress;
  const [progressResult, bookmarkResult, reviewResult] = await Promise.all([
    client
      .from("progress")
      .select("content_type,content_id,status")
      .eq("user_id", userId),
    client.from("bookmarks").select("content_id").eq("user_id", userId),
    client
      .from("review_items")
      .select("content_id,next_review_at,strength,correct_streak")
      .eq("user_id", userId),
  ]);
  const error =
    progressResult.error ?? bookmarkResult.error ?? reviewResult.error;
  if (error) throw error;
  return rowsToProgress(
    progressResult.data ?? [],
    bookmarkResult.data ?? [],
    reviewResult.data ?? [],
  );
}

async function uploadQueuedSubmissions(userId: string) {
  const client = getSupabaseClient();
  if (!client) return;
  const queue = readJson<LocalSubmission[]>(SUBMISSION_QUEUE_KEY, []);
  // A local submission may contain private code. Bind it to the first account
  // that imports it instead of copying it into every account using this browser.
  const pending = queue.filter((item) => item.syncedUserIds.length === 0);
  if (!pending.length) return;
  const { error } = await client.from("submissions").upsert(
    pending.map((item) => ({
      id: item.id,
      user_id: userId,
      problem_id: item.problemId,
      code: item.code,
      execution_provider: item.executionProvider,
      result: item.result,
      created_at: item.createdAt,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
  localStorage.setItem(
    SUBMISSION_QUEUE_KEY,
    JSON.stringify(
      queue.map((item) =>
        pending.includes(item)
          ? { ...item, syncedUserIds: [...item.syncedUserIds, userId] }
          : item,
      ),
    ),
  );
}

async function syncRemote(userId: string, state: ProgressState) {
  const client = getSupabaseClient();
  if (!client) return;
  const rows = progressToRows(userId, state);
  const bookmarks = progressToBookmarks(userId, state);
  const reviews = progressToReviews(userId, state);
  const currentBookmarks = await client
    .from("bookmarks")
    .select("content_id")
    .eq("user_id", userId);
  if (currentBookmarks.error) throw currentBookmarks.error;
  const removed = (currentBookmarks.data ?? [])
    .map((item) => item.content_id)
    .filter((id) => !state.bookmarkedQuestions.includes(id));
  const operations = [
    rows.length
      ? client
          .from("progress")
          .upsert(rows, { onConflict: "user_id,content_type,content_id" })
      : Promise.resolve({ error: null }),
    bookmarks.length
      ? client
          .from("bookmarks")
          .upsert(bookmarks, { onConflict: "user_id,content_type,content_id" })
      : Promise.resolve({ error: null }),
    reviews.length
      ? client
          .from("review_items")
          .upsert(reviews, { onConflict: "user_id,content_type,content_id" })
      : Promise.resolve({ error: null }),
    removed.length
      ? client
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("content_type", "question")
          .in("content_id", removed)
      : Promise.resolve({ error: null }),
  ];
  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
  await uploadQueuedSubmissions(userId);
}

export function LearningProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [progress, setProgress] = useState<ProgressState>(loadProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const hydratedFor = useRef<string | null>(null);
  const syncTimer = useRef<number | null>(null);

  const hydrate = useCallback(async () => {
    if (!userId) {
      hydratedFor.current = null;
      setProgress(loadProgress());
      setSyncStatus("local");
      setSyncError(null);
      return;
    }
    setSyncStatus("loading");
    setSyncError(null);
    try {
      const merged = mergeProgress(
        loadProgress(),
        loadAccountCache(userId),
        await loadRemote(userId),
      );
      setProgress(merged);
      saveAccountCache(userId, merged);
      await syncRemote(userId, merged);
      hydratedFor.current = userId;
      setSyncStatus("synced");
    } catch (error) {
      const cached = mergeProgress(loadProgress(), loadAccountCache(userId));
      setProgress(cached);
      hydratedFor.current = userId;
      setSyncError(error instanceof Error ? error.message : "同步失败");
      setSyncStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void hydrate());
  }, [hydrate]);

  useEffect(() => {
    if (!userId) {
      saveProgress(progress);
      return;
    }
    saveAccountCache(userId, progress);
    if (hydratedFor.current !== userId) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    setSyncStatus("syncing");
    syncTimer.current = window.setTimeout(() => {
      void syncRemote(userId, progress)
        .then(() => {
          setSyncError(null);
          setSyncStatus("synced");
        })
        .catch((error: unknown) => {
          setSyncError(error instanceof Error ? error.message : "同步失败");
          setSyncStatus("error");
        });
    }, 650);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [progress, userId]);

  const recordSubmission = useCallback(
    async (problemId: string, code: string, result: ExecutionResult) => {
      const queue = readJson<LocalSubmission[]>(SUBMISSION_QUEUE_KEY, []);
      const submission: LocalSubmission = {
        id: crypto.randomUUID(),
        problemId,
        code,
        executionProvider: "local_runner",
        result,
        createdAt: new Date().toISOString(),
        syncedUserIds: [],
      };
      localStorage.setItem(
        SUBMISSION_QUEUE_KEY,
        JSON.stringify([submission, ...queue].slice(0, 100)),
      );
      if (userId) await uploadQueuedSubmissions(userId);
    },
    [userId],
  );

  return (
    <LearningProgressContext.Provider
      value={{
        progress,
        setProgress,
        syncStatus,
        syncError,
        recordSubmission,
        refreshProgress: hydrate,
      }}
    >
      {children}
    </LearningProgressContext.Provider>
  );
}
