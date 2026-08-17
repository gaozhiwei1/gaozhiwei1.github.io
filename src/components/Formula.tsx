import katex from "katex";

interface FormulaProps {
  children: string;
  block?: boolean;
  label?: string;
}

export function Formula({ children, block = false, label }: FormulaProps) {
  const html = katex.renderToString(children, {
    displayMode: block,
    throwOnError: false,
    strict: "ignore",
  });

  return (
    <span
      className={block ? "formula formula--block" : "formula"}
      aria-label={label ?? children}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
