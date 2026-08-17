import { useState } from "react";
import { ChevronDown, Sigma } from "lucide-react";
import { Formula } from "./Formula";

export interface DerivationBlockStep {
  title: string;
  explanation: React.ReactNode;
  formula?: string;
  important?: boolean;
}

interface DerivationBlockProps {
  title: string;
  summary: string;
  steps: DerivationBlockStep[];
  defaultExpanded?: boolean;
}

export function DerivationBlock({ title, summary, steps, defaultExpanded = false }: DerivationBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visibleSteps = expanded ? steps : steps.filter((step) => step.important);

  return (
    <section className={expanded ? "derivation-block is-expanded" : "derivation-block"}>
      <header>
        <div><Sigma /><span><small>DERIVATION</small><strong>{title}</strong></span></div>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? "收起详细步骤" : "展开完整推导"}<ChevronDown />
        </button>
      </header>
      <p className="derivation-block__summary">{summary}</p>
      <div className="derivation-block__steps">
        {visibleSteps.map((step) => (
          <article key={step.title}>
            <span>{String(steps.indexOf(step) + 1).padStart(2, "0")}</span>
            <div><h4>{step.title}</h4>{step.formula && <Formula block>{step.formula}</Formula>}<div>{step.explanation}</div></div>
          </article>
        ))}
      </div>
      {!expanded && visibleSteps.length < steps.length && <p className="derivation-block__hint">已显示关键步骤，另有 {steps.length - visibleSteps.length} 步用于检查假设与中间变换。</p>}
    </section>
  );
}
