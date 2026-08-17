import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { groupAdvantages } from "../../lib/calculations";

export function GrpoLab() {
  const [rewards, setRewards] = useState([0.2, 0.6, 0.9, 0.4]);
  const result = useMemo(() => groupAdvantages(rewards), [rewards]);

  const updateReward = (index: number, value: number) => {
    const next = [...rewards];
    next[index] = value;
    setRewards(next);
  };

  return (
    <section className="lab" aria-labelledby="grpo-lab-title">
      <div className="lab__heading">
        <div>
          <span className="eyebrow">交互实验 04</span>
          <h3 id="grpo-lab-title">组内比较如何产生优化方向？</h3>
        </div>
        <Scale aria-hidden="true" />
      </div>

      <div className="grpo-flow" aria-label="GRPO 数据流">
        <span>同一 Prompt</span><i>→</i><span>4 个 Responses</span><i>→</i><span>组内标准化</span><i>→</i><span>Policy Update</span>
      </div>

      <div className="reward-list">
        {rewards.map((reward, index) => {
          const advantage = result.advantages[index];
          return (
            <label className="reward-row" key={index}>
              <span>回答 {String.fromCharCode(65 + index)}</span>
              <input
                type="range" min="0" max="1" step="0.05" value={reward}
                onChange={(event) => updateReward(index, Number(event.target.value))}
              />
              <b>{reward.toFixed(2)}</b>
              <output className={advantage > 0.05 ? "is-positive" : advantage < -0.05 ? "is-negative" : ""}>
                A={advantage.toFixed(2)}
              </output>
            </label>
          );
        })}
      </div>

      <div className="stat-pair">
        <span>组均值 <b>{result.mean.toFixed(3)}</b></span>
        <span>组标准差 <b>{result.std.toFixed(3)}</b></span>
      </div>
      <p className="lab-note">优势为正表示相对同组回答更好；它提供组内 baseline，但不等于完全没有基线信号。</p>
    </section>
  );
}
