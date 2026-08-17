export interface GoldTocItem {
  id: string;
  label: string;
}

export type GoldBlock =
  | { type: "heading"; level: 2 | 3; id?: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "formula"; latex: string }
  | { type: "code"; language: string; code: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "interactive"; text: string };

export interface ParsedGoldArticle {
  title: string;
  blocks: GoldBlock[];
  toc: GoldTocItem[];
}

function stripFrontmatter(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized.startsWith("---\n")) return normalized;
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) return normalized;
  return normalized.slice(end + 5).trimStart();
}

function cleanHeading(text: string): string {
  return text.replace(/^\d+\.\s*/, "").trim();
}

function isTableSeparator(line: string): boolean {
  if (!line.trim().startsWith("|")) return false;
  const cells = line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSpecialStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^#{2,3}\s+/.test(trimmed)) return true;
  if (trimmed === "\\[") return true;
  if (trimmed.startsWith("```")) return true;
  if (/^-\s+/.test(trimmed)) return true;
  if (/^\d+\.\s+/.test(trimmed)) return true;
  if (/^>\s?/.test(trimmed)) return true;
  if (trimmed.startsWith("<!--")) return true;
  if (
    trimmed.startsWith("|") &&
    index + 1 < lines.length &&
    isTableSeparator(lines[index + 1] ?? "")
  )
    return true;
  return false;
}

export function parseGoldArticle(markdown: string): ParsedGoldArticle {
  const source = stripFrontmatter(markdown);
  const lines = source.split("\n");
  const blocks: GoldBlock[] = [];
  const toc: GoldTocItem[] = [];
  let title = "Gold Standard 深度教程";
  let sectionIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      const level = heading[1] === "##" ? 2 : 3;
      const text = heading[2].trim();
      if (level === 2) {
        sectionIndex += 1;
        const id = `gold-section-${sectionIndex}`;
        blocks.push({ type: "heading", level, id, text });
        toc.push({ id, label: cleanHeading(text) });
      } else {
        blocks.push({ type: "heading", level, text });
      }
      i += 1;
      continue;
    }

    if (trimmed === "\\[") {
      const formulaLines: string[] = [];
      i += 1;
      while (i < lines.length && (lines[i] ?? "").trim() !== "\\]") {
        formulaLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "formula", latex: formulaLines.join("\n").trim() });
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    if (trimmed.startsWith("<!--")) {
      const commentLines: string[] = [trimmed.replace(/^<!--\s?/, "")];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").includes("-->")) {
        commentLines.push((lines[i] ?? "").trim());
        i += 1;
      }
      if (i < lines.length) {
        commentLines.push((lines[i] ?? "").replace(/-->.*$/, "").trim());
        i += 1;
      }
      const text = commentLines
        .join(" ")
        .replace(/^INTERACTIVE:\s*/i, "")
        .trim();
      if (text) blocks.push({ type: "interactive", text });
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1] ?? "")
    ) {
      const header = parseTableRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        rows.push(parseTableRow(lines[i] ?? ""));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^-\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test((lines[i] ?? "").trim())) {
        quoteLines.push((lines[i] ?? "").trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length && !isSpecialStart(lines, i)) {
      paragraphLines.push((lines[i] ?? "").trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return { title, blocks, toc };
}

export function compactGoldToc(toc: GoldTocItem[], maxItems = 8): GoldTocItem[] {
  if (toc.length <= maxItems) return toc;
  const indexes = new Set<number>([0, toc.length - 1, toc.length - 2]);
  const remaining = Math.max(1, maxItems - indexes.size);
  for (let step = 1; step <= remaining; step += 1) {
    const index = Math.round((step * (toc.length - 1)) / (remaining + 1));
    indexes.add(index);
  }
  return [...indexes]
    .sort((a, b) => a - b)
    .slice(0, maxItems)
    .map((index) => toc[index])
    .filter((item): item is GoldTocItem => Boolean(item));
}
