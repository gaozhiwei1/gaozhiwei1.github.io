export interface KvCacheConfig {
  layers: number;
  batch: number;
  tokens: number;
  kvHeads: number;
  headDim: number;
  bytesPerElement: number;
}

export function kvCacheBytes(config: KvCacheConfig): number {
  const { layers, batch, tokens, kvHeads, headDim, bytesPerElement } = config;
  return 2 * layers * batch * tokens * kvHeads * headDim * bytesPerElement;
}

export function bytesToGiB(bytes: number): number {
  return bytes / 1024 ** 3;
}

export function softmax(values: number[], temperature = 1): number[] {
  const safeTemperature = Math.max(temperature, 0.01);
  const scaled = values.map((value) => value / safeTemperature);
  const max = Math.max(...scaled);
  const exponentials = scaled.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

export function groupAdvantages(rewards: number[]): {
  mean: number;
  std: number;
  advantages: number[];
} {
  if (rewards.length === 0) {
    return { mean: 0, std: 0, advantages: [] };
  }

  const mean = rewards.reduce((sum, value) => sum + value, 0) / rewards.length;
  const variance =
    rewards.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rewards.length;
  const std = Math.sqrt(variance);
  const denominator = Math.max(std, 1e-6);

  return {
    mean,
    std,
    advantages: rewards.map((value) => (value - mean) / denominator),
  };
}

const teachingVocabulary = [
  "大模型",
  "机器学习",
  "人工智能",
  "注意力",
  "训练",
  "推理",
  "模型",
  "学习",
];

export function teachingTokenize(
  input: string,
  mode: "character" | "word" | "subword",
): string[] {
  const normalized = input.trim();
  if (!normalized) return [];

  if (mode === "character") {
    return Array.from(normalized).filter((character) => !/\s/.test(character));
  }

  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    if (/\s/.test(normalized[cursor])) {
      cursor += 1;
      continue;
    }

    const latin = normalized.slice(cursor).match(/^[A-Za-z0-9_-]+/);
    if (latin) {
      const value = latin[0];
      if (mode === "subword" && value.length > 5) {
        tokens.push(value.slice(0, 4), `##${value.slice(4)}`);
      } else {
        tokens.push(value);
      }
      cursor += value.length;
      continue;
    }

    const match = teachingVocabulary.find((word) => normalized.startsWith(word, cursor));
    if (match) {
      if (mode === "subword" && match.length >= 4) {
        tokens.push(match.slice(0, 2), `##${match.slice(2)}`);
      } else {
        tokens.push(match);
      }
      cursor += match.length;
      continue;
    }

    tokens.push(normalized[cursor]);
    cursor += 1;
  }
  return tokens;
}
