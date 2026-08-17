import { describe, expect, it } from "vitest";
import { compactGoldToc, parseGoldArticle } from "./goldMarkdown";

const sample = [
  "---",
  "title: Example",
  "---",
  "",
  "# Example Article",
  "",
  "## 1. 第一节",
  "",
  String.raw`正文包含 \(x+y\) 与 **重点**。`,
  "",
  String.raw`\[`,
  "x^2+y^2=z^2",
  String.raw`\]`,
  "",
  "- A",
  "- B",
  "",
  "## 2. 第二节",
  "",
  String.raw`| A | B |`,
  "|---|---|",
  String.raw`| 1 | \(x\) |`,
  "",
  "```python",
  'print("ok")',
  "```",
].join("\n");

describe("gold markdown parser", () => {
  it("extracts frontmatter, headings, formulas, table and code", () => {
    const parsed = parseGoldArticle(sample);
    expect(parsed.title).toBe("Example Article");
    expect(parsed.toc).toEqual([
      { id: "gold-section-1", label: "第一节" },
      { id: "gold-section-2", label: "第二节" },
    ]);
    expect(parsed.blocks.some((block) => block.type === "formula")).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "table")).toBe(true);
    expect(parsed.blocks.some((block) => block.type === "code")).toBe(true);
  });

  it("creates a compact rail toc for long articles", () => {
    const toc = Array.from({ length: 20 }, (_, index) => ({
      id: `gold-section-${index + 1}`,
      label: `section-${index + 1}`,
    }));
    const compact = compactGoldToc(toc, 8);
    expect(compact.length).toBeLessThanOrEqual(8);
    expect(compact[0]).toEqual(toc[0]);
    expect(compact.at(-1)).toEqual(toc.at(-1));
  });
});

import { publicGoldArticles } from "./registry";

describe("gold article registry", () => {
  it("parses every public gold article into a substantial long-form lesson", () => {
    expect(Object.keys(publicGoldArticles)).toHaveLength(9);
    for (const [nodeId, markdown] of Object.entries(publicGoldArticles)) {
      const parsed = parseGoldArticle(markdown);
      expect(parsed.toc.length, nodeId).toBeGreaterThanOrEqual(6);
      expect(parsed.blocks.filter((block) => block.type === "formula").length, nodeId).toBeGreaterThanOrEqual(3);
      expect(parsed.blocks.length, nodeId).toBeGreaterThanOrEqual(30);
    }
  });
});
