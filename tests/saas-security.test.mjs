import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("RLS migration protects every private table and leaves subscriptions read-only", async () => {
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20260817000100_saas_foundation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  for (const table of [
    "profiles",
    "subscriptions",
    "progress",
    "submissions",
    "bookmarks",
    "review_items",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
    );
  }
  assert.match(
    sql,
    /subscriptions_select_own[\s\S]*auth\.uid\(\)[\s\S]*user_id/i,
  );
  assert.doesNotMatch(
    sql,
    /create policy subscriptions_(insert|update|delete)/i,
  );
  assert.match(sql, /grant select on public\.subscriptions to authenticated/i);
});

test("premium code solutions are server-only and complete", async () => {
  const solutions = JSON.parse(
    await readFile(
      new URL("../server/saas/solutions.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(Object.keys(solutions).length, 33);
  const clientFiles = [
    "../src/data/codeChallenges.ts",
    "../src/data/challengeGroups/foundations.ts",
    "../src/data/challengeGroups/training.ts",
    "../src/data/challengeGroups/transformer.ts",
  ];
  for (const path of clientFiles)
    assert.doesNotMatch(
      await readFile(new URL(path, import.meta.url), "utf8"),
      /referenceCode/,
    );
});

test("premium interview answers are server-only and complete", async () => {
  const answers = JSON.parse(
    await readFile(
      new URL("../server/saas/question-answers.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(Object.keys(answers).length, 176);
  assert.ok(answers["node-019"].shortAnswer);
  assert.ok(Array.isArray(answers["node-019"].followUps));
});
