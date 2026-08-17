import { useMemo, useState } from "react";
import { Braces, Info } from "lucide-react";
import { teachingTokenize } from "../../lib/calculations";

type TokenMode = "character" | "word" | "subword";

const modes: { id: TokenMode; label: string; detail: string }[] = [
  { id: "character", label: "字符", detail: "每个汉字单独处理" },
  { id: "word", label: "词级", detail: "教学词典最长匹配" },
  { id: "subword", label: "子词", detail: "常见片段与续接片段" },
];

export function TokenizerLab() {
  const [text, setText] = useState("我正在学习大模型推理");
  const [mode, setMode] = useState<TokenMode>("subword");
  const tokens = useMemo(() => teachingTokenize(text, mode), [text, mode]);

  return (
    <section className="lab" aria-labelledby="tokenizer-lab-title">
      <div className="lab__heading">
        <div>
          <span className="eyebrow">交互实验 01</span>
          <h3 id="tokenizer-lab-title">同一句话，为什么长度会不同？</h3>
        </div>
        <Braces aria-hidden="true" />
      </div>

      <label className="field-label" htmlFor="tokenizer-input">输入文本</label>
      <input
        id="tokenizer-input"
        className="text-input"
        value={text}
        maxLength={36}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="segmented" aria-label="分词模式">
        {modes.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "is-active" : ""}
            type="button"
            onClick={() => setMode(item.id)}
            title={item.detail}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="token-output" aria-live="polite">
        {tokens.map((token, index) => (
          <span className="token-chip" key={`${token}-${index}`}>
            <b>{token}</b>
            <small>{1000 + index * 137 + token.length * 17}</small>
          </span>
        ))}
        {tokens.length === 0 && <span className="empty-inline">请输入文字</span>}
      </div>

      <div className="lab__result-row">
        <div><strong>{tokens.length}</strong><span>token 数</span></div>
        <div><strong>{Math.max(tokens.length - 1, 0)}</strong><span>近似 decode 步数</span></div>
        <div><strong>{tokens.length * 2}</strong><span>每层 K/V 向量</span></div>
      </div>

      <p className="lab-note"><Info size={15} />这是用于解释粒度差异的教学分词器，不复现任何生产模型的真实词表。</p>
    </section>
  );
}
