import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const target = new URL("../server/saas/question-answers.json", import.meta.url);
const bankAnswerUrl = new URL("../server/saas/interview-bank-answers.json", import.meta.url);
const migrate = process.argv.includes("--migrate");
const freeQuestionLimit = 50;

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});

try {
  const { questions } = await vite.ssrLoadModule("/src/data/questions.ts");
  const expectedCount = Math.max(0, questions.length - freeQuestionLimit);

  if (!migrate) {
    const existing = JSON.parse(await readFile(target, "utf8"));
    if (Object.keys(existing).length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} premium question answers, found ${Object.keys(existing).length}`,
      );
    }
    console.log(`Validated ${expectedCount} protected interview answers.`);
    process.exit(0);
  }

  let existingAnswers = {};
  try {
    existingAnswers = JSON.parse(await readFile(target, "utf8"));
  } catch {
    /* first migration */
  }

  let bankAnswers = {};
  try {
    bankAnswers = JSON.parse(await readFile(bankAnswerUrl, "utf8"));
  } catch {
    /* no external bank answers */
  }

  const protectedAnswers = Object.fromEntries(
    questions.slice(freeQuestionLimit).map((question) => {
      const bank = bankAnswers[question.id] ?? {};
      const previous = existingAnswers[question.id] ?? {};
      return [
        question.id,
        {
          correctChoice: previous.correctChoice ?? question.correctChoice,
          numericAnswer: previous.numericAnswer ?? question.numericAnswer,
          tolerance: previous.tolerance ?? question.tolerance,
          shortAnswer: bank.shortAnswer ?? previous.shortAnswer ?? question.shortAnswer,
          explanation: bank.explanation ?? previous.explanation ?? question.explanation,
          knowledgePoints: bank.knowledgePoints ?? previous.knowledgePoints ?? question.knowledgePoints,
          equations: bank.equations ?? previous.equations ?? question.equations,
          pitfalls: bank.pitfalls ?? previous.pitfalls ?? question.pitfalls,
          derivation: bank.derivation ?? previous.derivation ?? question.derivation,
          followUps: bank.followUps ?? previous.followUps ?? question.followUps,
          sourceTags: bank.sourceTags ?? previous.sourceTags ?? question.sourceTags,
        },
      ];
    }),
  );

  await writeFile(
    target,
    `${JSON.stringify(protectedAnswers, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Protected ${Object.keys(protectedAnswers).length} interview answers (${questions.length} total questions, ${freeQuestionLimit} free).`,
  );
} finally {
  await vite.close();
}
