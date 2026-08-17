import { useMemo, useState } from "react";
import { Database, Gauge } from "lucide-react";
import { bytesToGiB, kvCacheBytes } from "../../lib/calculations";

const inputDefinitions = [
  { key: "layers", label: "层数 L", min: 8, max: 80, step: 8 },
  { key: "batch", label: "批量 B", min: 1, max: 16, step: 1 },
  { key: "tokens", label: "上下文 T", min: 1024, max: 32768, step: 1024 },
  { key: "kvHeads", label: "KV heads", min: 1, max: 32, step: 1 },
  { key: "headDim", label: "头维 dₕ", min: 64, max: 256, step: 32 },
] as const;

export function KvCacheLab() {
  const [config, setConfig] = useState({
    layers: 32, batch: 4, tokens: 8192, kvHeads: 8, headDim: 128, bytesPerElement: 2,
  });
  const memory = useMemo(() => bytesToGiB(kvCacheBytes(config)), [config]);
  const mhaMemory = useMemo(
    () => bytesToGiB(kvCacheBytes({ ...config, kvHeads: 32 })), [config],
  );
  const ratio = config.kvHeads / 32;

  return (
    <section className="lab" aria-labelledby="kv-lab-title">
      <div className="lab__heading">
        <div>
          <span className="eyebrow">交互实验 03</span>
          <h3 id="kv-lab-title">每多一个 token，缓存增长在哪里？</h3>
        </div>
        <Database aria-hidden="true" />
      </div>

      <div className="kv-layout">
        <div className="slider-stack">
          {inputDefinitions.map((input) => (
            <label className="range-field range-field--compact" key={input.key}>
              <span>{input.label}<strong>{config[input.key].toLocaleString()}</strong></span>
              <input
                type="range" min={input.min} max={input.max} step={input.step}
                value={config[input.key]}
                onChange={(event) => setConfig({ ...config, [input.key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <div className="segmented segmented--small" aria-label="缓存精度">
            {[1, 2, 4].map((bytes) => (
              <button
                className={config.bytesPerElement === bytes ? "is-active" : ""}
                onClick={() => setConfig({ ...config, bytesPerElement: bytes })}
                key={bytes} type="button"
              >{bytes === 1 ? "INT8" : bytes === 2 ? "BF16" : "FP32"}</button>
            ))}
          </div>
        </div>

        <div className="memory-result">
          <Gauge size={20} />
          <span>当前 KV Cache</span>
          <strong>{memory < 1 ? memory.toFixed(2) : memory.toFixed(1)} GiB</strong>
          <div className="memory-bars" aria-label="GQA 与 MHA 缓存对比">
            <div><span>当前 {config.kvHeads} KV heads</span><i style={{ width: `${Math.max(ratio * 100, 4)}%` }} /></div>
            <div><span>MHA · 32 KV heads</span><i className="is-reference" style={{ width: "100%" }} /></div>
          </div>
          <p>相同配置的 MHA：<b>{mhaMemory.toFixed(1)} GiB</b></p>
        </div>
      </div>

      <code className="formula-code">2 × L × B × T × n<sub>kv</sub> × d<sub>h</sub> × bytes</code>
    </section>
  );
}
