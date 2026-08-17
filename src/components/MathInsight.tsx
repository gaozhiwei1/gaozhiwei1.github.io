import { Sigma } from "lucide-react";
import { Formula } from "./Formula";

interface MathInsightProps {
  title: string;
  children: React.ReactNode;
  formula?: string;
}

export function MathInsight({ title, children, formula }: MathInsightProps) {
  return (
    <aside className="math-insight" aria-label={`数学洞察：${title}`}>
      <div className="math-insight__label"><Sigma /><span>MATH INSIGHT</span></div>
      <h3>{title}</h3>
      <div className="math-insight__copy">{children}</div>
      {formula && <Formula block>{formula}</Formula>}
    </aside>
  );
}
