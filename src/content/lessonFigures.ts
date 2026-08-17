export interface LessonFigureSpec {
  id: string;
  nodeId: string;
  src: string;
  alt: string;
  caption: string;
  /** For Gold articles: render after the Nth level-2 section. */
  afterGoldSection?: number;
}

export const lessonFigures: LessonFigureSpec[] = [
  {
    id: "transformer-overview",
    nodeId: "decoder.architecture.modern-block",
    src: "/figures/handbook/transformer-overview.svg",
    alt: "前置归一化 Transformer 层的数据流与两条残差路径",
    caption: "现代 decoder-only Transformer 的单层主路径：RMSNorm、Attention、FFN 与两次残差更新。",
  },
  {
    id: "self-attention",
    nodeId: "transformer.attention.why",
    src: "/figures/handbook/self-attention.svg",
    alt: "Q K V 投影、缩放点积、因果遮罩、softmax 与 value 汇聚的数据流",
    caption: "Self-Attention 完整数据流。先形成 Q/K/V，再计算缩放点积与 causal mask，最后用注意力权重汇聚 V。",
    afterGoldSection: 2,
  },
  {
    id: "mha-mqa-gqa",
    nodeId: "transformer.multihead.gqa",
    src: "/figures/handbook/mha-mqa-gqa.svg",
    alt: "MHA MQA GQA 中 query heads 与 key value heads 的共享关系",
    caption: "MHA、MQA 与 GQA 的 KV 共享方式。Query heads 数量保持不变，而 KV heads 越少，KV Cache 与 decode 读取带宽越小。",
    afterGoldSection: 3,
  },
  {
    id: "kv-cache",
    nodeId: "inference.cache.kv",
    src: "/figures/handbook/kv-cache.svg",
    alt: "KV Cache 在 prefill 与 autoregressive decode 两个阶段中的写入和读取流程",
    caption: "KV Cache 的两阶段视角：Prefill 并行建立整段缓存；Decode 每步只追加当前位置的 K/V，并读取全部历史缓存。",
    afterGoldSection: 3,
  },
  {
    id: "rope",
    nodeId: "transformer.position.rope",
    src: "/figures/handbook/rope.svg",
    alt: "RoPE 在二维平面中按位置旋转 query 和 key，并使点积依赖相对位移",
    caption: "RoPE 的二维几何：Q/K 分别按绝对位置旋转，但进入内积后只保留相对位移 n-m。",
    afterGoldSection: 3,
  },
  {
    id: "pretraining-pipeline",
    nodeId: "pretraining.data.sources",
    src: "/figures/handbook/pretraining-pipeline.svg",
    alt: "从原始语料、清洗去重、tokenization、packing、causal LM 到 cross entropy 和参数更新的预训练闭环",
    caption: "从原始语料到参数更新的 Pretraining 闭环。数据工程与训练循环不是两个孤立模块，而是一条连续的数据流。",
  },
  {
    id: "rlhf-stages",
    nodeId: "posttraining.sft.masking",
    src: "/figures/handbook/rlhf-stages.svg",
    alt: "预训练、SFT、偏好数据、奖励模型和 PPO GRPO 策略更新组成的 RLHF 流程",
    caption: "经典 Post-Training / RLHF 流程：SFT 建立初始策略，偏好数据提供 reward signal，再通过 policy optimization 继续对齐。",
  },
  {
    id: "ppo-grpo",
    nodeId: "posttraining.ppo.clipping",
    src: "/figures/handbook/ppo-grpo.svg",
    alt: "PPO 使用价值模型构造 advantage 与 GRPO 使用组内 reward baseline 的对比",
    caption: "PPO 与 GRPO 的 Advantage 来源对比：PPO 常依赖 Value/Critic，GRPO 用同 prompt 的组内 reward 构造相对 baseline。",
    afterGoldSection: 4,
  },
  {
    id: "moe",
    nodeId: "moe.routing.why-ffn",
    src: "/figures/handbook/moe.svg",
    alt: "MoE router 对多个 experts 进行 Top-2 路由并加权合并输出",
    caption: "Top-k MoE 路由。Router 并不执行所有 experts，而是为每个 token 激活少数专家并加权合并输出。",
  },
  {
    id: "ffn-expansion",
    nodeId: "transformer.ffn.standard",
    src: "/figures/handbook/ffn-expansion.svg",
    alt: "FFN 从 residual width 上投影到更宽的中间特征空间，再经非线性变换下投影回 residual width",
    caption: "FFN 的扩张-非线性变换-收缩路径。中间宽度提供额外特征容量，而层间 residual width 保持不变。",
  },
  {
    id: "reasoning-modes",
    nodeId: "reasoning.behavior.thinking",
    src: "/figures/handbook/reasoning-modes.svg",
    alt: "直接回答模式与增加中间推理计算、验证和选择的 reasoning 模式对比",
    caption: "Direct Answer 与 reasoning-oriented inference 的执行差异：后者增加 test-time compute、候选或验证步骤。",
  },
  {
    id: "rlvr",
    nodeId: "reasoning.training.rlvr",
    src: "/figures/handbook/rlvr.svg",
    alt: "策略模型生成多个 rollout，经可验证器评分后用于强化学习更新的 RLVR 闭环",
    caption: "RLVR 的基本闭环：Policy 生成多次 rollout，可验证器给出可靠 reward，再用这些信号更新策略。",
  },
  {
    id: "reasoning-distill",
    nodeId: "reasoning.training.distillation",
    src: "/figures/handbook/reasoning-distill.svg",
    alt: "大型 reasoning teacher 生成候选推理轨迹，经验证过滤后训练 student model",
    caption: "Reasoning Distillation：Teacher 产生候选回答或推理数据，经过验证与过滤后再用于 Student 训练。",
  },
  {
    id: "lora",
    nodeId: "peft.lora.update",
    src: "/figures/handbook/lora.svg",
    alt: "冻结主权重 W 旁并联低秩 A B 分支，并把低秩更新与主分支相加",
    caption: "LoRA 的低秩旁路：冻结 W，只训练 A/B；部署时可把低秩更新合并回主权重。",
  },
  {
    id: "inference-timeline",
    nodeId: "inference.cache.prefill-decode",
    src: "/figures/handbook/inference-timeline.svg",
    alt: "LLM inference 中一次 prefill 后接逐 token decode，并伴随 KV Cache 持续增长的时间线",
    caption: "Inference 时间线：Prefill 更偏 compute-intensive；Decode 串行生成并反复读取不断增长的 KV Cache，更容易受 memory bandwidth 限制。",
  },
];

export function figuresForNode(nodeId: string): LessonFigureSpec[] {
  return lessonFigures.filter((figure) => figure.nodeId === nodeId);
}

export function inlineFiguresForNode(nodeId: string): LessonFigureSpec[] {
  return figuresForNode(nodeId).filter((figure) => figure.afterGoldSection == null);
}
