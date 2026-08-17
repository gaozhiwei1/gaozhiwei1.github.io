import { readdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const migrate = process.argv.includes("--migrate");
const sourceRoot = new URL("../src/data/", import.meta.url);
const groupRoot = new URL("../src/data/challengeGroups/", import.meta.url);
const solutionUrl = new URL("../server/saas/solutions.json", import.meta.url);
const files = [
  new URL("codeChallenges.ts", sourceRoot),
  ...(await readdir(groupRoot))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => new URL(name, groupRoot)),
];

let solutions = {};
try {
  solutions = JSON.parse(await readFile(solutionUrl, "utf8"));
} catch {
  /* first migration */
}
const allIds = new Set();

function propertyName(node) {
  return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : null;
}

function literal(node) {
  if (!node) return null;
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : null;
}

for (const file of files) {
  const sourceText = await readFile(file, "utf8");
  const source = ts.createSourceFile(
    file.pathname,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const removals = [];

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map(
        node.properties
          .filter(ts.isPropertyAssignment)
          .map((property) => [propertyName(property), property]),
      );
      const id = literal(properties.get("id")?.initializer);
      if (id) allIds.add(id);
      const reference = properties.get("referenceCode");
      const referenceCode = reference ? literal(reference.initializer) : null;
      if (id && referenceCode !== null) {
        solutions[id] = referenceCode;
        let end = reference.end;
        while (/\s/.test(sourceText[end] ?? "")) end += 1;
        if (sourceText[end] === ",") end += 1;
        removals.push([reference.getFullStart(), end]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  if (migrate && removals.length) {
    let next = sourceText;
    for (const [start, end] of removals.sort(
      (left, right) => right[0] - left[0],
    ))
      next = next.slice(0, start) + next.slice(end);
    await writeFile(file, next, "utf8");
  }
}

const missing = [...allIds].filter((id) => !solutions[id]);
if (missing.length)
  throw new Error(`Missing protected solutions: ${missing.join(", ")}`);
await writeFile(
  solutionUrl,
  `${JSON.stringify(Object.fromEntries(Object.entries(solutions).sort()), null, 2)}\n`,
  "utf8",
);
console.log(
  `${migrate ? "Migrated and protected" : "Validated"} ${Object.keys(solutions).length} code solutions.`,
);
