import { useMemo, useState } from "react";
import { Eye, Route } from "lucide-react";
import { softmax } from "../../lib/calculations";

const tokens = ["我", "正在", "学习", "模型"];
const rawScores = [
  [2.4, 0.8, 0.2, -0.4],
  [1.2, 2.1, 0.7, 0.1],
  [0.5, 1.3, 2.5, 1.7],
  [0.3, 0.9, 2.2, 2.7],
];

export function AttentionLab() {
  const [temperature, setTemperature] = useState(1);
  const [causal, setCausal] = useState(true);
  const [queryIndex, setQueryIndex] = useState(3);

  const matrix = useMemo(
    () => rawScores.map((row, rowIndex) => {
      const visible = row.map((value, columnIndex) =>
        causal && columnIndex > rowIndex ? Number.NEGATIVE_INFINITY : value,
      );
      return softmax(visible, temperature);
    }),
    [temperature, causal],
  );

  const strongest = matrix[queryIndex].reduce(
    (best, value, index) => (value > best.value ? { index, value } : best),
    { index: 0, value: -1 },
  );

  return (
    <section className="lab" aria-labelledby="attention-lab-title">
      <div className="lab__heading">
        <div>
          <span className="eyebrow">交互实验 02</span>
          <h3 id="attention-lab-title">观察遮罩与温度如何改变读取关系</h3>
        </div>
        <Eye aria-hidden="true" />
      </div>

      <div className="attention-controls">
        <label className="range-field">
          <span>Softmax 温度 <strong>{temperature.toFixed(1)}</strong></span>
          <input
            type="range" min="0.4" max="2" step="0.1" value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
          />
        </label>
        <label className="toggle-field">
          <input type="checkbox" checked={causal} onChange={(event) => setCausal(event.target.checked)} />
          <span aria-hidden="true" />
          使用因果遮罩
        </label>
      </div>

      <div className="attention-layout">
        <div className="attention-matrix" role="grid" aria-label="注意力权重矩阵">
          <div className="matrix-corner">Q＼K</div>
          {tokens.map((token) => <div className="matrix-axis" key={`head-${token}`}>{token}</div>)}
          {matrix.map((row, rowIndex) => (
            <div className="matrix-row" role="row" key={tokens[rowIndex]}>
              <button
                className={queryIndex === rowIndex ? "matrix-axis is-selected" : "matrix-axis"}
                onClick={() => setQueryIndex(rowIndex)} type="button"
              >{tokens[rowIndex]}</button>
              {row.map((weight, columnIndex) => {
                const masked = causal && columnIndex > rowIndex;
                return (
                  <div
                    role="gridcell"
                    className={masked ? "matrix-cell is-masked" : "matrix-cell"}
                    style={masked ? undefined : { "--weight": weight } as React.CSSProperties}
                    key={`${rowIndex}-${columnIndex}`}
                    title={`${tokens[rowIndex]} → ${tokens[columnIndex]}: ${masked ? "masked" : weight.toFixed(3)}`}
                  >{masked ? "×" : weight.toFixed(2)}</div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="attention-reading">
          <Route size={19} />
          <span>查询位置</span>
          <strong>{tokens[queryIndex]}</strong>
          <span className="flow-arrow" aria-hidden="true">→</span>
          <span>最强读取</span>
          <strong>{tokens[strongest.index]} · {(strongest.value * 100).toFixed(0)}%</strong>
        </div>
      </div>

      <div className="flow-strip" aria-label="注意力计算路径">
        <span>QKᵀ / √dₖ</span><i>→</i><span>Mask</span><i>→</i><span>Softmax</span><i>→</i><span>AV</span>
      </div>
    </section>
  );
}
