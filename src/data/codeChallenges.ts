import type { CodeChallenge } from "../types";
import { additionalCodeChallenges } from "./additionalCodeChallenges";

const coreCodeChallenges: CodeChallenge[] = [
  {
    id: "stable-softmax",
    title: "手写数值稳定 Softmax",
    topicId: "transformer",
    difficulty: "基础",
    summary: "实现温度缩放与减最大值技巧，理解 attention 分数如何变成概率。",
    motivation: "直接计算 exp(logit) 会在大正数处溢出；错误的温度位置又会改变概率语义。",
    functionSignature: "stable_softmax(logits, temperature=1.0) -> list[float]",
    description: [
      "先用 temperature 缩放 logits，再减去缩放后最大值。",
      "返回与输入等长的概率列表，概率和应接近 1。",
      "不得调用 NumPy、PyTorch 或 scipy；使用 Python 标准库即可。",
    ],
    parameters: [
      { name: "logits", meaning: "未归一化预测分数", shape: "[V]" },
      { name: "temperature", meaning: "正温度；小于 1 时分布更尖", shape: "scalar" },
    ],
    examples: [
      { input: "logits=[1.0, 2.0, 3.0], temperature=1.0", output: "[0.090031, 0.244728, 0.665241]", explanation: "最大 logit 得到最高概率，结果和为 1。" },
      { input: "logits=[1000.0, 1001.0], temperature=1.0", output: "[0.268941, 0.731059]", explanation: "减最大值后不会计算 exp(1001)。" },
    ],
    constraints: ["1 ≤ len(logits) ≤ 10,000", "temperature > 0", "误差容忍 1e-6"],
    starterCode: `import math

def stable_softmax(logits, temperature=1.0):
    """返回与 logits 等长的概率列表。"""
    # 1. 温度缩放
    # 2. 减去最大值以避免 exp 溢出
    # 3. 归一化
    pass
`,
    knowledgeLink: "Transformer 基础 · Scaled Dot-Product Attention",
  },
  {
    id: "kv-cache-gib",
    title: "计算 KV Cache 理论显存",
    topicId: "inference",
    difficulty: "基础",
    summary: "把层数、批量、上下文、KV 头数、头维和数据类型换算成 GiB。",
    motivation: "面试里最常见的错误不是乘法，而是漏掉层数、K/V 两份缓存或混淆 GB 与 GiB。",
    functionSignature: "kv_cache_gib(layers, batch, tokens, kv_heads, head_dim, bytes_per_element) -> float",
    description: [
      "根据 2 × L × B × T × n_kv × d_h × bytes 计算理论字节数。",
      "使用 1024³ 将 bytes 换算为 GiB。",
      "不要加入 allocator、页表或临时 buffer；题目只计算缓存张量本身。",
    ],
    parameters: [
      { name: "layers", meaning: "Transformer 层数 L" },
      { name: "batch", meaning: "批量大小 B" },
      { name: "tokens", meaning: "每个请求缓存长度 T" },
      { name: "kv_heads", meaning: "每层 KV head 数 n_kv" },
      { name: "head_dim", meaning: "单头维度 d_h" },
      { name: "bytes_per_element", meaning: "每元素字节数 s" },
    ],
    examples: [
      { input: "32, 4, 8192, 8, 128, 2", output: "4.0", explanation: "BF16 GQA 配置的理论缓存为 4 GiB。" },
      { input: "32, 4, 8192, 32, 128, 2", output: "16.0", explanation: "KV heads 从 8 增到 32，缓存扩大 4 倍。" },
    ],
    constraints: ["所有维度均为正整数", "bytes_per_element ∈ {1, 2, 4}", "误差容忍 1e-9"],
    starterCode: `def kv_cache_gib(
    layers,
    batch,
    tokens,
    kv_heads,
    head_dim,
    bytes_per_element,
):
    """返回 KV Cache 的理论大小，单位 GiB。"""
    pass
`,
    knowledgeLink: "推理优化 · KV Cache 显存公式",
  },
  {
    id: "grpo-advantages",
    title: "实现 GRPO 组相对优势",
    topicId: "post-training",
    difficulty: "进阶",
    summary: "对同一 prompt 的多个 reward 做组内中心化和标准化。",
    motivation: "GRPO 不训练独立 value model，但仍需要组内 baseline；std 接近 0 时还必须保证数值稳定。",
    functionSignature: "group_advantages(rewards, epsilon=1e-6) -> list[float]",
    description: [
      "使用总体方差：variance = Σ(rᵢ-mean)² / G。",
      "返回 (rᵢ-mean)/(std+epsilon)。",
      "当所有 reward 相同时，结果应为全 0，而不是 NaN 或无穷大。",
    ],
    parameters: [
      { name: "rewards", meaning: "同一 prompt 的 G 个回答奖励", shape: "[G]" },
      { name: "epsilon", meaning: "防止标准差为 0 的稳定项", shape: "scalar" },
    ],
    examples: [
      { input: "rewards=[1.0, 2.0, 3.0]", output: "[-1.224743, 0.0, 1.224743]", explanation: "均值为 2，总体标准差约 0.8165。" },
      { input: "rewards=[0.5, 0.5, 0.5]", output: "[0.0, 0.0, 0.0]", explanation: "组内没有相对差异，因此没有策略优化方向。" },
    ],
    constraints: ["1 ≤ G ≤ 1024", "reward 为有限实数", "误差容忍 1e-5"],
    starterCode: `import math

def group_advantages(rewards, epsilon=1e-6):
    """返回 GRPO 的组内标准化优势。"""
    # 注意：这里使用总体方差，分母是 G。
    pass
`,
    knowledgeLink: "后训练 · GRPO 组内基线",
  },
  {
    id: "dpo-loss",
    title: "手写单样本 DPO Loss",
    topicId: "post-training",
    difficulty: "困难",
    summary: "从策略与参考模型的序列 log-prob 构造偏好 margin，并稳定计算 -log σ。",
    motivation: "DPO 的关键不是 chosen 概率本身，而是 chosen/rejected 相对 reference 的改变差。",
    functionSignature: "dpo_loss(policy_chosen, policy_rejected, reference_chosen, reference_rejected, beta=0.1) -> float",
    description: [
      "四个输入都是整条 assistant response 的序列 log-prob。",
      "先计算 policy log-ratio gap，再减 reference log-ratio gap。",
      "令 logit = beta × margin，返回 -log(sigmoid(logit))。",
      "使用稳定形式 softplus(-logit)，避免直接计算 sigmoid 后再取 log。",
    ],
    parameters: [
      { name: "policy_chosen / rejected", meaning: "当前策略对偏好回答与拒绝回答的序列 log-prob" },
      { name: "reference_chosen / rejected", meaning: "冻结参考策略的对应序列 log-prob" },
      { name: "beta", meaning: "偏好 margin 的缩放与参考约束系数" },
    ],
    examples: [
      { input: "-2.0, -3.0, -2.5, -2.5, beta=0.1", output: "0.644397", explanation: "policy 比 reference 更偏好 chosen，loss 小于 log 2。" },
      { input: "-4.0, -2.0, -2.5, -2.5, beta=0.1", output: "0.798139", explanation: "当前策略错误偏好 rejected，loss 增大。" },
    ],
    constraints: ["输入为有限浮点数", "beta > 0", "误差容忍 1e-6"],
    starterCode: `import math

def dpo_loss(
    policy_chosen,
    policy_rejected,
    reference_chosen,
    reference_rejected,
    beta=0.1,
):
    """返回一个 preference pair 的 DPO loss。"""
    # margin = policy_gap - reference_gap
    # loss = softplus(-beta * margin)
    pass
`,
    knowledgeLink: "后训练 · DPO 数学推导",
  },
];

export const codeChallenges: CodeChallenge[] = [...coreCodeChallenges, ...additionalCodeChallenges];

export const codeChallengeById = Object.fromEntries(
  codeChallenges.map((challenge) => [challenge.id, challenge]),
);

// Some knowledge nodes intentionally support more than one coding exercise.
// Keep the secondary route here instead of duplicating curriculum nodes.
export const challengeKnowledgeNodeOverrides: Record<string, string> = {
  "top-k": "inference.generation.topk-topp",
  "kv-cache-update": "inference.cache.kv",
  "lora-linear": "peft.lora.update",
  "infonce-loss": "evaluation.applications.rag-agent",
};
