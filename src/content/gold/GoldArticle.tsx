import { FlaskConical } from "lucide-react";
import { Formula } from "../../components/Formula";
import { LessonFigure } from "../../components/LessonFigure";
import { figuresForNode } from "../lessonFigures";
import { parseGoldArticle, type GoldBlock } from "./goldMarkdown";

function InlineMarkup({ text }: { text: string }) {
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\\\([\s\S]+?\\\))/g;
  const parts = text.split(tokenPattern).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return <Formula key={`${part}-${index}`}>{part.slice(2, -2)}</Formula>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function splitSectionHeading(text: string): { index?: string; title: string } {
  const match = text.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return { title: text };
  return { index: match[1].padStart(2, "0"), title: match[2] };
}

function RenderBlock({ block }: { block: GoldBlock }) {
  if (block.type === "heading") {
    if (block.level === 2) {
      const heading = splitSectionHeading(block.text);
      return (
        <section className="gold-article__section" id={block.id}>
          {heading.index && <span className="gold-article__section-index">{heading.index}</span>}
          <h2><InlineMarkup text={heading.title} /></h2>
        </section>
      );
    }
    return <h3 className="gold-article__subheading"><InlineMarkup text={block.text.replace(/^\d+\.\s*/, "")} /></h3>;
  }

  if (block.type === "paragraph") {
    return <p><InlineMarkup text={block.text} /></p>;
  }

  if (block.type === "formula") {
    return <Formula block>{block.latex}</Formula>;
  }

  if (block.type === "code") {
    return (
      <div className="gold-code-block">
        {block.language && <span>{block.language}</span>}
        <pre><code>{block.code}</code></pre>
      </div>
    );
  }

  if (block.type === "unordered-list") {
    return <ul>{block.items.map((item) => <li key={item}><InlineMarkup text={item} /></li>)}</ul>;
  }

  if (block.type === "ordered-list") {
    return <ol>{block.items.map((item) => <li key={item}><InlineMarkup text={item} /></li>)}</ol>;
  }

  if (block.type === "quote") {
    return <blockquote><InlineMarkup text={block.text} /></blockquote>;
  }

  if (block.type === "table") {
    return (
      <div className="gold-table-wrap">
        <table>
          <thead><tr>{block.header.map((cell) => <th key={cell}><InlineMarkup text={cell} /></th>)}</tr></thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${row.join("|")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}><InlineMarkup text={cell} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <aside className="gold-interactive-note">
      <FlaskConical />
      <div><span>可交互实验</span><p><InlineMarkup text={block.text} /></p></div>
    </aside>
  );
}

export function GoldArticle({ markdown, nodeId }: { markdown: string; nodeId?: string }) {
  const article = parseGoldArticle(markdown);
  const figures = nodeId ? figuresForNode(nodeId).filter((figure) => figure.afterGoldSection != null) : [];
  let sectionNumber = 0;
  const rendered: React.ReactNode[] = [];

  const appendFiguresAfterSection = (completedSection: number) => {
    figures
      .filter((figure) => figure.afterGoldSection === completedSection)
      .forEach((figure) => {
        rendered.push(<LessonFigure figure={figure} key={`figure-${figure.id}`} />);
      });
  };

  article.blocks.forEach((block, index) => {
    if (block.type === "heading" && block.level === 2) {
      if (sectionNumber > 0) appendFiguresAfterSection(sectionNumber);
      sectionNumber += 1;
    }
    rendered.push(<RenderBlock key={`${block.type}-${index}`} block={block} />);
  });
  if (sectionNumber > 0) appendFiguresAfterSection(sectionNumber);

  return (
    <div className="gold-article" aria-label={`${article.title} 深度教程`}>
      {rendered}
    </div>
  );
}
