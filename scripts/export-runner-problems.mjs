import { writeFile } from "node:fs/promises";
import { serverChallenges } from "../server/challenges.mjs";

const normalized = Object.fromEntries(
  Object.entries(serverChallenges)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, problem]) => [id, {
      functionName: problem.functionName,
      publicTests: problem.visibleTests,
      localTests: problem.hiddenTests,
    }]),
);

const target = new URL("../local-runner/src/math2llm_runner/problems.json", import.meta.url);
await writeFile(target, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`Exported ${Object.keys(normalized).length} runner problems.`);
