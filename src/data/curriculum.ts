import type {
  CurriculumModule,
  CurriculumTrack,
  Difficulty,
  KnowledgeNode,
  MathSymbol,
} from "../types";

interface NodeSeed {
  id: string;
  title: string;
  summary: string;
  why: string;
  intuition: string;
  caveat: string;
  difficulty?: Difficulty;
  prerequisites?: string[];
  keywords?: string[];
  formula?: string;
  symbols?: MathSymbol[];
  tensorShapes?: KnowledgeNode["tensorShapes"];
  codeChallengeId?: string;
  estimatedMinutes?: number;
}

interface ModuleSeed {
  id: string;
  title: string;
  description: string;
  nodes: NodeSeed[];
}

interface TrackSeed {
  id: string;
  legacyTopicId: string;
  index: string;
  title: string;
  description: string;
  why: string;
  modules: ModuleSeed[];
}

const n = (
  id: string,
  title: string,
  summary: string,
  why: string,
  intuition: string,
  caveat: string,
  extra: Partial<NodeSeed> = {},
): NodeSeed => ({ id, title, summary, why, intuition, caveat, ...extra });

const trackSeeds: TrackSeed[] = [
  {
    id: "math",
    legacyTopicId: "math",
    index: "01",
    title: "数学基础",
    description: "只学习能直接解释 Attention、训练目标、优化与风险的数学工具。",
    why: "面试中的公式不是装饰；需要能从假设推到尺度、概率、梯度和系统代价。",
    modules: [
      {
        id: "math.linear-algebra",
        title: "线性代数与张量",
        description: "从矩阵形状一路连接到投影、Attention、LoRA 和并行切分。",
        nodes: [
          n("math.linear.vectors-matrices", "向量与矩阵", "明确行、列、基与批量维度的含义。", "LLM 的 embedding、权重和激活全部以向量/矩阵为基本对象。", "向量可以看作某个坐标系中的状态表示；矩阵则定义了坐标之间的线性重组。真正重要的不只是维度大小，还要知道每个轴代表 token、hidden channel、head 还是 batch。", "维度相同不代表语义相同；做 shape 推导时必须同时写出轴的含义。", { difficulty: "基础", keywords: ["vector", "matrix"], formula: String.raw`x\in\mathbb R^d,\qquad W\in\mathbb R^{m\times d},\qquad y=Wx\in\mathbb R^m`, symbols: [{ symbol: "x", meaning: "d 维输入向量，例如一个 token 的 hidden state" }, { symbol: "W", meaning: "把 d 维输入线性映射到 m 维输出的矩阵" }, { symbol: "y", meaning: "映射后的 m 维输出向量" }], tensorShapes: [{ label: "Token state", shape: "[D]", note: "一个 token 的 hidden state" }, { label: "Linear weight", shape: "[Dout,Din]", note: "线性层输入/输出坐标之间的映射" }, { label: "Batch sequence", shape: "[B,T,D]", note: "批量序列中的 token 表示" }] }),
          n("math.linear.matmul-shapes", "矩阵乘法与 Shape", "用内维相等规则追踪线性层和批量矩阵乘法。", "大量实现错误来自 shape 能广播但语义错位。", "[m,k] 乘 [k,n]，中间的 k 被求和，留下 [m,n]。", "广播可以让代码运行，却可能复制错误的轴。", { difficulty: "基础", prerequisites: ["math.linear.vectors-matrices"], formula: String.raw`C_{ij}=\sum_{r=1}^{k}A_{ir}B_{rj}`, symbols: [{ symbol: "A", meaning: "形状为 [m,k] 的左矩阵" }, { symbol: "B", meaning: "形状为 [k,n] 的右矩阵" }, { symbol: "C", meaning: "形状为 [m,n] 的乘积" }], codeChallengeId: "matrix-multiply" }),
          n("math.linear.inner-product-cosine", "内积、范数与余弦相似度", "区分方向相似性与向量尺度。", "Attention 分数和向量检索都依赖相似性，但尺度会改变点积。", "点积同时受长度和夹角影响；余弦相似度除以范数后主要比较方向。", "余弦高不等于任务相关，也不自动具有概率意义。", { prerequisites: ["math.linear.vectors-matrices"], formula: String.raw`\cos(x,y)=\frac{x^\top y}{\lVert x\rVert_2\lVert y\rVert_2}`, symbols: [{ symbol: "x,y", meaning: "待比较的非零向量" }, { symbol: "||x||₂", meaning: "x 的 L2 范数" }], codeChallengeId: "cosine-similarity" }),
          n("math.linear.linear-projection", "线性投影", "理解 W 如何把 residual stream 映射到查询、键、值或词表空间。", "Q/K/V 和 LM Head 都是不同输出语义的线性映射。", "每个输出通道是输入通道的一个可学习加权组合。", "工程里常说 projection，并不保证矩阵是正交投影。", { prerequisites: ["math.linear.matmul-shapes"], formula: String.raw`Y=XW+b`, symbols: [{ symbol: "X", meaning: "输入激活" }, { symbol: "W", meaning: "可学习权重矩阵" }, { symbol: "b", meaning: "可选偏置" }] }),
          n("math.linear.rank-lowrank-svd", "秩、低秩近似与 SVD 直觉", "把更新限制在低维子空间，并连接 LoRA。", "完整 d×d 更新昂贵，而任务适配的有效更新可能集中在少数方向。", "低秩矩阵可写成两个瘦矩阵的乘积；SVD 给出按奇异值排序的方向。", "LoRA 的低秩假设是归纳偏置，不保证每个任务都成立。", { difficulty: "进阶", prerequisites: ["math.linear.matmul-shapes"], formula: String.raw`\Delta W=BA,\quad \operatorname{rank}(\Delta W)\le r`, symbols: [{ symbol: "ΔW", meaning: "权重增量" }, { symbol: "B,A", meaning: "两个低秩因子" }, { symbol: "r", meaning: "低秩瓶颈维度" }] }),
          n("math.linear.tensors-broadcasting", "张量轴与 Broadcasting", "为 B、T、H、D_h 等轴建立固定语义。", "Attention 的 reshape、transpose 和 mask 都依赖轴顺序。", "先给每个轴命名，再判断广播是复用参数还是错误复制。", "只写元素总数相等不足以证明 reshape 正确。", { prerequisites: ["math.linear.matmul-shapes"], tensorShapes: [{ label: "Residual", shape: "[B,T,D]" }, { label: "Heads", shape: "[B,H,T,Dh]", note: "D=H×Dh" }] }),
        ],
      },
      {
        id: "math.probability",
        title: "概率与信息量",
        description: "从随机变量到语言模型似然、熵、交叉熵和 KL。",
        nodes: [
          n("math.probability.random-expectation", "期望与 Log-Derivative Trick", "从随机变量期望一路推到 score-function identity，为 Policy Gradient 建立数学入口。", "训练损失和 RL 目标通常是参数化分布下的期望，而离散采样路径本身不能像普通连续函数一样直接反传。", "先理解概率加权平均，再利用 ∇p=p∇log p 把分布导数重新写成可采样的 expectation。", "Score-function estimator 适用范围广但方差可能很高，必须与 baseline/advantage 一起理解。", { difficulty: "进阶", formula: String.raw`\nabla_\theta \mathbb E_{p_\theta}[f(X)]=\mathbb E_{p_\theta}[f(X)\nabla_\theta\log p_\theta(X)]`, symbols: [{ symbol: "p_θ", meaning: "由参数 θ 控制的采样分布" }, { symbol: "f(X)", meaning: "样本对应的目标/回报" }], estimatedMinutes: 25 }),
          n("math.probability.variance-covariance", "方差与协方差", "理解尺度增长、相关性和估计噪声。", "sqrt(d_k) 推导与 policy-gradient 方差都依赖这些概念。", "方差度量围绕均值的平方偏离；协方差描述两个量共同变化。", "独立意味着协方差为零，但零协方差通常不推出独立。", { prerequisites: ["math.probability.random-expectation"], formula: String.raw`\operatorname{Var}(X)=\mathbb E[(X-\mathbb E X)^2]`, symbols: [{ symbol: "X", meaning: "随机变量" }, { symbol: "E[X]", meaning: "X 的期望" }] }),
          n("math.probability.categorical", "Categorical 与 Bernoulli", "区分多类别 token 分布和二元事件。", "下一 token 是 categorical；偏好胜负或 verifier 通过可建模为二元结果。", "Bernoulli 只有 0/1，categorical 在 V 个互斥类别中取一个。", "模型输出概率不代表事件之间独立。", { difficulty: "基础", prerequisites: ["math.probability.random-expectation"] }),
          n("math.probability.conditional-bayes", "条件概率与 Bayes", "理解前缀条件、后验更新和生成分解。", "语言模型建模的是给定前缀后的 token 条件分布。", "观察条件会重新分配可能结果的概率质量。", "P(A|B) 与 P(B|A) 不能互换。", { prerequisites: ["math.probability.categorical"], formula: String.raw`P(A\mid B)=\frac{P(B\mid A)P(A)}{P(B)}`, symbols: [{ symbol: "A", meaning: "待推断事件" }, { symbol: "B", meaning: "已观察条件" }] }),
          n("math.probability.likelihood", "Likelihood 与 Log-Likelihood", "把固定数据视为参数的评分函数。", "最大似然训练直接导出 token 级负对数似然。", "乘积取对数后变成求和，既方便优化也更数值稳定。", "Likelihood 不是参数的概率分布，除非另行给出先验并归一化。", { prerequisites: ["math.probability.conditional-bayes"], formula: String.raw`\log p_\theta(x_{1:T})=\sum_{t=1}^{T}\log p_\theta(x_t\mid x_{<t})`, symbols: [{ symbol: "θ", meaning: "模型参数" }, { symbol: "xₜ", meaning: "第 t 个 token" }] }),
          n("math.probability.entropy-crossentropy-kl", "Entropy、Cross-Entropy 与 KL", "从信息量、NLL 和分布差异推导语言模型最核心的训练目标。", "预训练使用交叉熵，PPO/DPO 又用 KL 控制策略漂移。", "交叉熵等于目标分布熵加 forward KL；one-hot target 时退化为正确 token 的负对数概率。", "KL 非对称，也不满足三角不等式，因此不是距离。", { difficulty: "进阶", prerequisites: ["math.probability.likelihood"], formula: String.raw`H(p,q)=H(p)+D_{\mathrm{KL}}(p\Vert q)`, symbols: [{ symbol: "p", meaning: "目标分布" }, { symbol: "q", meaning: "模型分布" }, { symbol: "H(p,q)", meaning: "交叉熵" }, { symbol: "D_KL", meaning: "KL divergence" }], codeChallengeId: "cross-entropy", estimatedMinutes: 25 }),
        ],
      },
      {
        id: "math.optimization",
        title: "优化与约束",
        description: "理解参数如何更新，以及 PPO/DPO 中约束项为何出现。",
        nodes: [
          n("math.optimization.gradient-sgd", "梯度下降与 SGD", "沿局部最陡下降方向更新参数。", "反向传播只给出梯度，优化器决定怎样把梯度变成更新。", "小批量梯度是总体梯度的噪声估计。", "非凸训练不保证到达全局最优，下降方向也依赖参数化。", { difficulty: "基础", formula: String.raw`\theta_{t+1}=\theta_t-\eta g_t`, symbols: [{ symbol: "θₜ", meaning: "第 t 步参数" }, { symbol: "η", meaning: "学习率" }, { symbol: "gₜ", meaning: "当前梯度估计" }] }),
          n("math.optimization.momentum", "Momentum", "对历史梯度做指数平滑以减少震荡。", "大批量训练仍可能在高曲率方向来回摆动。", "速度变量累积方向一致的梯度，并抑制零均值噪声。", "动量会引入滞后，学习率过大时仍会发散。", { prerequisites: ["math.optimization.gradient-sgd"] }),
          n("math.optimization.adamw", "Adam 与 AdamW", "按一阶/二阶矩自适应缩放更新，并把 weight decay 解耦。", "不同参数坐标的梯度尺度差异很大。", "Adam 用均值和平方均值估计信号与尺度；AdamW 单独衰减参数。", "Weight decay 与把 L2 项塞进 Adam 梯度通常不等价。", { difficulty: "进阶", prerequisites: ["math.optimization.momentum"], codeChallengeId: "adamw-step" }),
          n("math.optimization.lr-warmup", "Learning Rate、Warmup 与 Decay", "控制更新尺度随训练阶段变化。", "训练早期矩估计和激活尺度尚未稳定，直接使用峰值学习率容易失稳。", "Warmup 逐步放大步长，decay 在后期降低随机震荡。", "Warmup 不是稳定性的充分条件，仍受初始化、batch 和精度影响。", { prerequisites: ["math.optimization.adamw"], codeChallengeId: "linear-warmup" }),
          n("math.optimization.gradient-clipping", "Gradient Clipping", "限制全局梯度范数而不改变正常小梯度。", "偶发异常 batch 可能产生极大更新并破坏训练。", "当范数超过阈值时统一缩放，保留整体方向。", "Clip 隐藏不了持续的数据或数值错误；阈值过小会长期压低有效学习率。", { prerequisites: ["math.optimization.gradient-sgd"], formula: String.raw`g\leftarrow g\min\left(1,\frac{c}{\lVert g\rVert_2+\epsilon}\right)`, symbols: [{ symbol: "g", meaning: "拼接后的全局梯度" }, { symbol: "c", meaning: "最大允许范数" }], codeChallengeId: "gradient-clipping" }),
          n("math.optimization.lagrangian", "约束优化与 Lagrangian", "把约束通过乘子写入目标。", "PPO 的 KL 控制和 DPO 推导都来自奖励与偏离成本的权衡。", "乘子表示放松一单位约束的边际代价。", "Penalty、硬约束和真正的对偶优化不是同一件事。", { difficulty: "困难", prerequisites: ["math.optimization.gradient-sgd", "math.probability.entropy-crossentropy-kl"], formula: String.raw`\mathcal L(\theta,\lambda)=f(\theta)+\lambda g(\theta)`, symbols: [{ symbol: "f", meaning: "原始目标" }, { symbol: "g", meaning: "约束函数" }, { symbol: "λ", meaning: "Lagrange multiplier" }] }),
        ],
      },
    ],
  },
  {
    id: "tokenization",
    legacyTopicId: "tokenization",
    index: "02",
    title: "Tokenization 与表示",
    description: "从文本切分到 embedding 与 vocabulary logits，追踪 token 粒度的系统影响。",
    why: "Tokenizer 定义模型的输入单位、输出类别和实际序列长度。",
    modules: [
      {
        id: "tokenization.subword",
        title: "切分算法",
        description: "比较字符、词、BPE、WordPiece 与 Unigram 的建模假设。",
        nodes: [
          n("tokenization.granularity", "字符、词与子词粒度", "在开放词表、序列长度和可复用片段之间取舍。", "纯词级无法自然处理未登录词，纯字符又会拉长序列。", "子词用常见片段缩短序列，同时保留拆解新词的能力。", "没有对所有语言都最优的固定粒度。", { difficulty: "基础" }),
          n("tokenization.bpe", "BPE", "迭代合并高频相邻符号对。", "需要从基础字符构造有限词表并覆盖新词。", "每次 merge 把常见邻接模式变成一个新 token。", "训练语料频率会把领域与语言偏差写入词表。", { prerequisites: ["tokenization.granularity"] }),
          n("tokenization.wordpiece-unigram", "WordPiece 与 Unigram LM", "比较增量构词和概率化删减词表。", "不同子词算法会给相同文本不同分解。", "Unigram 从候选词表中选择高概率切分；WordPiece 常以似然改进选择片段。", "实际实现的 normalization、预切分和特殊规则同样重要。", { difficulty: "进阶", prerequisites: ["tokenization.granularity"] }),
          n("tokenization.vocab-fertility", "Vocabulary Size 与 Fertility", "用每个词/字符产生的 token 数衡量切分效率。", "词表过小增加序列长度，过大增加 embedding/LM Head。", "更低 fertility 通常减少 prefill、cache 和 decode 步数，但扩大词表相关计算。", "只比较平均 token 数会掩盖长尾语言和代码符号。", { prerequisites: ["tokenization.bpe"], codeChallengeId: "token-count-cost" }),
          n("tokenization.multilingual", "多语言与数学/代码切分", "检查中文、低资源语言、代码和公式的粒度差异。", "同样字符长度可能消耗完全不同的上下文预算。", "训练数据覆盖决定哪些片段能被压缩成常用 token。", "Tokenizer fertility 是效率指标，不直接等于语言能力。", { prerequisites: ["tokenization.vocab-fertility"] }),
          n("tokenization.special-tokens", "BOS / EOS / PAD 与 Chat Template", "区分边界、停止、补齐和角色标记。", "训练与推理必须对消息边界采用一致编码。", "特殊 token 是协议的一部分，会影响 attention mask 和 loss mask。", "PAD 不应自动等同 EOS；混用会改变停止与监督语义。", { prerequisites: ["tokenization.granularity"] }),
        ],
      },
      {
        id: "tokenization.representation",
        title: "Embedding 与输出空间",
        description: "连接 token ID、hidden state、LM Head 和词表概率。",
        nodes: [
          n("representation.embedding.lookup", "Embedding Lookup", "用 token ID 选择词表矩阵的一行。", "离散 ID 本身没有连续几何结构。", "Embedding 表把每个 token 映射为 d_model 维向量。", "Lookup 不是 one-hot 真正物化，但数学上等价于 one-hot 乘矩阵。", { prerequisites: ["tokenization.special-tokens", "math.linear.linear-projection"], tensorShapes: [{ label: "Token IDs", shape: "[B,T]" }, { label: "Embedding", shape: "[V,D]" }, { label: "Hidden", shape: "[B,T,D]" }] }),
          n("representation.embedding.weight-tying", "LM Head 与 Weight Tying", "把 hidden state 投影到 V 个 vocabulary logits，并可与 embedding 共享权重。", "生成需要为词表中每个 token 给出未归一化分数。", "若共享，输入和输出使用同一 V×D 参数表的转置视角。", "Weight tying 节省参数，但仍要计算大词表 logits。", { difficulty: "进阶", prerequisites: ["representation.embedding.lookup"], formula: String.raw`z_t=h_tE^\top`, symbols: [{ symbol: "hₜ", meaning: "位置 t 的 hidden state，维度 D" }, { symbol: "E", meaning: "词表 embedding，形状 [V,D]" }, { symbol: "zₜ", meaning: "V 维 logits" }], tensorShapes: [{ label: "Hidden", shape: "[B,T,D]" }, { label: "LM logits", shape: "[B,T,V]" }] }),
        ],
      },
    ],
  },
  {
    id: "transformer",
    legacyTopicId: "transformer",
    index: "03",
    title: "Transformer",
    description: "从 Q/K/V、位置和归一化走完一个现代 decoder block 的完整张量路径。",
    why: "Transformer 的核心不只是公式，而是跨 token 通信、逐位置非线性和稳定残差流的协同。",
    modules: [
      {
        id: "transformer.attention",
        title: "Attention 基础",
        description: "建立匹配、读取、遮罩与数值稳定的因果链。",
        nodes: [
          n("transformer.attention.why", "Attention 主线：Q/K/V、Scaling 与 Mask", "从跨 token 信息读取出发，完整串起 Q/K/V、点积缩放、Softmax、Causal Mask 与 Value 聚合。", "固定窗口或单一压缩状态难以同时表达长距离和动态依赖，而语言中的依赖关系又随内容变化。", "Attention 为每个 query 动态计算对所有 key 的匹配，再用归一化权重读取 values。", "Dense attention 的灵活通信能力伴随 T² score 结构；数值尺度、mask 语义和 shape 都必须同时正确。", { prerequisites: ["representation.embedding.lookup", "math.linear.matmul-shapes"], estimatedMinutes: 40 }),
          n("transformer.attention.qkv", "Q / K / V 投影", "把匹配条件、被匹配特征和传递内容解耦。", "同一个 hidden state 在“找什么”和“传什么”中需要不同语义。", "Q/K 决定权重，V 决定权重作用后的内容。", "Attention 也通过 Q/K/V/O 混合通道，不能说它只做 token mixing。", { prerequisites: ["math.linear.linear-projection", "transformer.attention.why"], formula: String.raw`Q=XW_Q,\quad K=XW_K,\quad V=XW_V`, symbols: [{ symbol: "X", meaning: "输入 residual stream" }, { symbol: "W_Q,W_K,W_V", meaning: "独立可学习投影" }], tensorShapes: [{ label: "X", shape: "[B,T,D]" }, { label: "Q/K/V", shape: "[B,T,H,Dh]" }] }),
          n("transformer.attention.scaling", "为什么除以 sqrt(d_k)", "从点积方差随维度增长推导缩放。", "不缩放时，大 d_k 会让 softmax logits 仅因维度变大而过尖。", "在近似独立、零均值、单位方差下，d_k 项之和方差约为 d_k。", "推导依赖统计假设；实际模型仍需初始化和归一化共同控制尺度。", { difficulty: "进阶", prerequisites: ["math.probability.variance-covariance", "transformer.attention.qkv"], formula: String.raw`\operatorname{Var}\!\left(\frac{q^\top k}{\sqrt{d_k}}\right)\approx 1`, symbols: [{ symbol: "q,k", meaning: "单个 query/key 向量" }, { symbol: "d_k", meaning: "query/key 的单头维度" }], codeChallengeId: "scaled-dot-attention" }),
          n("transformer.attention.softmax-stability", "Softmax 与数值稳定", "把任意实数 logits 归一化成概率。", "Attention 需要非负、和为 1 的读取权重。", "减最大值不改变概率，因为分子分母同时乘同一常数。", "稳定 softmax 不会修复语义错误的 mask 或错误轴。", { prerequisites: ["math.probability.categorical", "transformer.attention.scaling"], formula: String.raw`\operatorname{softmax}(z)_i=\frac{e^{z_i-m}}{\sum_j e^{z_j-m}},\ m=\max_j z_j`, symbols: [{ symbol: "z", meaning: "待归一化 logits" }, { symbol: "m", meaning: "最大 logit" }], codeChallengeId: "stable-softmax" }),
          n("transformer.attention.masks", "Causal Mask 与 Padding Mask", "分别阻止看未来和忽略补齐位置。", "训练时虽然并行计算所有位置，也必须保持自回归条件。", "在 softmax 前把不可见位置加上负无穷，使其概率为零。", "布尔语义在不同库中可能相反，必须测试 mask 方向。", { prerequisites: ["transformer.attention.softmax-stability"], codeChallengeId: "causal-mask" }),
          n("transformer.attention.tensor-path", "Attention Tensor Shape", "从 [B,T,D] 追到 [B,H,T,T] 再返回 residual width。", "能手推 shape 才能定位 transpose、mask 和 cache 错误。", "QKᵀ 在最后两个轴产生每个 query 对所有 key 的分数。", "算术复杂度和张量是否物化是两件事。", { prerequisites: ["math.linear.tensors-broadcasting", "transformer.attention.qkv"], tensorShapes: [{ label: "Q", shape: "[B,H,T,Dh]" }, { label: "Kᵀ", shape: "[B,H,Dh,T]" }, { label: "Scores", shape: "[B,H,T,T]" }, { label: "Output", shape: "[B,H,T,Dh]" }] }),
        ],
      },
      {
        id: "transformer.multihead",
        title: "Multi-Head 与共享 KV",
        description: "理解多头不是重复计算，以及 GQA 为什么改变缓存带宽。",
        nodes: [
          n("transformer.multihead.why", "为什么需要多个 Head", "在不同投影子空间学习不同匹配模式。", "单个相似度度量可能把不同关系挤在同一分数结构中。", "每个 head 有独立 Q/K/V 投影，最后联合回 residual stream。", "固定 d_model 时增加 head 会减小 d_h，不保证单调变好。", { prerequisites: ["transformer.attention.tensor-path"] }),
          n("transformer.multihead.reshape", "Split / Transpose / Concat", "掌握 B×T×D 与 B×H×T×Dh 的转换。", "实现中最常见的 bug 是把 head 和 sequence 轴错置。", "Split 只是重解释特征轴，transpose 把 head 移到批量矩阵乘法位置。", "Transpose 后通常需要 contiguous/reshape 语义检查。", { prerequisites: ["transformer.multihead.why"], tensorShapes: [{ label: "Project", shape: "[B,T,H,Dh]" }, { label: "Transpose", shape: "[B,H,T,Dh]" }, { label: "Concat", shape: "[B,T,D]" }], codeChallengeId: "multi-head-shapes" }),
          n("transformer.multihead.output-projection", "Concat 与 W_O", "让各 head 的特征重新交互并回到 d_model。", "直接拼接只把子空间并排放置，没有可学习融合。", "W_O 对 concat 后的通道做线性重组并提供残差兼容输出。", "W_O 不是仅用于改 shape；输入输出都为 D 时仍有表达作用。", { prerequisites: ["transformer.multihead.reshape"] }),
          n("transformer.multihead.gqa", "MHA / MQA / GQA", "保持 query heads 的同时减少 KV heads。", "Decode 需要反复读取长上下文 KV，缓存容量和带宽成为瓶颈。", "MQA 让全部 query heads 共享一组 KV；GQA 在质量与缓存之间分组折中。", "GQA 主要减少 KV 存储和 decode 读取，不代表所有阶段 FLOPs 同比下降。", { difficulty: "进阶", prerequisites: ["transformer.multihead.output-projection"], formula: String.raw`\frac{M_{\mathrm{GQA}}}{M_{\mathrm{MHA}}}=\frac{n_{kv}}{H}`, symbols: [{ symbol: "n_kv", meaning: "KV head 数" }, { symbol: "H", meaning: "query head 数" }], codeChallengeId: "gqa-group-map", estimatedMinutes: 30 }),
        ],
      },
      {
        id: "transformer.position",
        title: "位置信息",
        description: "从排列不敏感到旋转几何与长上下文外推。",
        nodes: [
          n("transformer.position.why", "为什么需要 Position", "让相同 token 集合的不同顺序产生不同表示。", "纯 attention 对输入位置的同步置换具有等变性，无法凭内容知道顺序。", "位置机制把索引或相对位移写入匹配过程。", "位置编码不等于模型一定能利用超长上下文。", { prerequisites: ["transformer.attention.qkv"] }),
          n("transformer.position.absolute-sinusoidal", "绝对位置与 Sinusoidal", "比较可学习位置表和固定多频率正弦基。", "模型需要区分位置，同时可能希望对长度有一定外推结构。", "不同频率为位置提供一组平滑坐标。", "固定公式并不保证训练长度外的 attention 行为可靠。", { prerequisites: ["transformer.position.why"] }),
          n("transformer.position.rope", "RoPE 旋转几何", "在二维坐标对上按位置旋转 Q/K，使点积依赖相对位移。", "Attention 真正消费的是 QK 内积，因此位置应进入匹配分数。", "R_mᵀR_n=R_{n-m}，同一旋转族把绝对角度差化成相对位置。", "RoPE 不改变 shape 或 dense attention 的 T² 算术量。", { difficulty: "困难", prerequisites: ["transformer.position.absolute-sinusoidal", "math.linear.inner-product-cosine"], formula: String.raw`(R_mq)^\top(R_nk)=q^\top R_{n-m}k`, symbols: [{ symbol: "R_m,R_n", meaning: "位置 m/n 对应的分块旋转矩阵" }, { symbol: "q,k", meaning: "未旋转的 query/key" }], codeChallengeId: "rotary-embedding", estimatedMinutes: 35 }),
          n("transformer.position.extrapolation", "Context Extrapolation", "理解频率缩放、位置插值与训练长度分布外问题。", "部署上下文往往长于训练窗口。", "缩放方法调整位置相位变化速度，让更长位置落入较熟悉的频率范围。", "任何缩放都可能牺牲局部分辨率或改变已训练分布。", { difficulty: "困难", prerequisites: ["transformer.position.rope"] }),
        ],
      },
      {
        id: "transformer.norm-ffn",
        title: "Normalization、FFN 与 Residual",
        description: "稳定残差流并提供逐 token 的非线性容量。",
        nodes: [
          n("transformer.norm.layer-rms", "LayerNorm 与 RMSNorm", "区分中心化方差和均方根缩放。", "深层残差网络需要控制激活尺度和半精度数值范围。", "RMSNorm 不减均值，只按均方根缩放每个 token 的 hidden 维。", "RMSNorm 不保证输出均值为零；epsilon 是数值稳定项，不是正则。", { prerequisites: ["math.linear.inner-product-cosine"], formula: String.raw`\operatorname{RMSNorm}(x)=g\odot\frac{x}{\sqrt{d^{-1}\sum_i x_i^2+\epsilon}}`, symbols: [{ symbol: "x", meaning: "单个 token 的 d 维 hidden state" }, { symbol: "g", meaning: "可学习逐通道尺度" }, { symbol: "ε", meaning: "防止除零的稳定项" }], codeChallengeId: "rmsnorm" }),
          n("transformer.norm.pre-post", "Pre-Norm 与 Post-Norm", "比较 normalization 放在子层前后时的残差梯度路径。", "深层堆叠需要保留接近 identity 的主路径。", "Pre-Norm 让 x→x+F(Norm(x)) 的残差支路保持直接恒等传播。", "Pre-Norm 更易优化不意味着在所有配置下质量必然更高。", { difficulty: "进阶", prerequisites: ["transformer.norm.layer-rms"] }),
          n("transformer.ffn.standard", "FFN 为什么升维再降维", "在固定 residual width 下获得更宽的非线性特征基。", "Attention 提供跨 token 通信，但每个位置还需要强非线性变换。", "先投到 d_ff 激活/门控，再回 d_model 以便残差相加。", "Attention 也混合通道；FFN 的严格特征是 position-wise、不跨 token。", { prerequisites: ["math.linear.linear-projection", "transformer.attention.why"], tensorShapes: [{ label: "Residual", shape: "[B,T,D]" }, { label: "Expanded", shape: "[B,T,Dff]" }, { label: "Projected back", shape: "[B,T,D]" }], codeChallengeId: "swiglu" }),
          n("transformer.ffn.swiglu", "GELU、GLU 与 SwiGLU", "用一条门控分支调制另一条内容分支。", "单一激活对所有中间通道采用固定非线性。", "SwiGLU 计算 SiLU(gate)⊙up，再由 down projection 回 residual width。", "两条上投影增加参数，因此常重新调整 d_ff 以匹配预算。", { difficulty: "进阶", prerequisites: ["transformer.ffn.standard"], formula: String.raw`\operatorname{SwiGLU}(x)=(\operatorname{SiLU}(xW_g)\odot xW_u)W_d`, symbols: [{ symbol: "W_g", meaning: "gate projection" }, { symbol: "W_u", meaning: "up projection" }, { symbol: "W_d", meaning: "down projection" }], codeChallengeId: "swiglu" }),
          n("transformer.residual.block", "Residual Stream 与完整 Block", "把 Norm、Attention、FFN 都接回固定 d_model 主干。", "子层内部 shape 可以变化，但层间需要稳定统一接口和信息通路。", "每个子层学习对 residual stream 的增量，而非从零重建状态。", "残差连接的价值不只是防止梯度消失，还影响优化几何和信息路由。", { prerequisites: ["transformer.norm.pre-post", "transformer.ffn.swiglu", "transformer.multihead.output-projection"], codeChallengeId: "transformer-block" }),
        ],
      },
    ],
  },
  {
    id: "decoder",
    legacyTopicId: "decoder",
    index: "04",
    title: "Decoder-only LLM",
    description: "从架构家族到 next-token objective，连接完整 GPT/LLaMA 风格前向路径。",
    why: "现代生成式 LLM 的训练与推理都建立在因果分解和逐 token 生成上。",
    modules: [
      {
        id: "decoder.architecture",
        title: "架构与语言建模",
        description: "区分 encoder、encoder-decoder 和 decoder-only，并写出训练目标。",
        nodes: [
          n("decoder.architecture.families", "Encoder / Decoder / Encoder-Decoder", "比较双向表征、因果生成和条件生成。", "不同任务对可见上下文和输出方式有不同要求。", "Encoder 聚合已知输入；decoder 按因果顺序生成；encoder-decoder 通过 cross-attention 条件化。", "架构名称不能单独决定能力或效率。", { prerequisites: ["transformer.residual.block"] }),
          n("decoder.objective.autoregressive", "Autoregressive Factorization", "把联合序列概率分解为条件概率乘积。", "联合分布直接建模困难，而条件 next-token 可用同一网络反复估计。", "链式法则把 P(x₁:T) 写成每个 token 在历史前缀下的概率。", "这种因果顺序是分解选择，不代表语言中的真实因果关系。", { prerequisites: ["math.probability.conditional-bayes"], formula: String.raw`P(x_{1:T})=\prod_{t=1}^{T}P(x_t\mid x_{<t})`, symbols: [{ symbol: "xₜ", meaning: "序列第 t 个 token" }, { symbol: "x_<t", meaning: "位置 t 之前的前缀" }] }),
          n("decoder.objective.teacher-forcing", "Teacher Forcing 与 Shifted Targets", "训练时用真实前缀并行预测全部下一 token。", "已知训练序列允许一次前向产生多个位置的监督。", "logits[:, :-1] 对齐 labels[:, 1:]，causal mask 阻止未来泄漏。", "推理前缀来自模型自身，训练/推理分布差异会产生 exposure bias。", { prerequisites: ["decoder.objective.autoregressive", "transformer.attention.masks"], codeChallengeId: "shifted-cross-entropy" }),
          n("decoder.objective.logits-loss", "Logits、Cross-Entropy 与 Perplexity", "从 hidden state 到词表分数、概率和 token loss。", "Hidden state 不是概率，必须经 LM Head 和 softmax 定义 categorical 分布。", "正确 token 的负 log-prob 是单 token NLL；平均 NLL 的指数是 perplexity。", "不同 tokenizer 的每-token perplexity 通常不可直接横比。", { prerequisites: ["representation.embedding.weight-tying", "math.probability.entropy-crossentropy-kl"], formula: String.raw`\mathcal L=-\frac1N\sum_{i=1}^{N}\log p_\theta(y_i\mid x_i)`, symbols: [{ symbol: "N", meaning: "有效目标 token 数" }, { symbol: "yᵢ", meaning: "第 i 个真实目标 token" }] }),
          n("decoder.architecture.modern-block", "GPT / LLaMA 风格差异", "识别位置、Norm、FFN、bias 和 tokenizer 等实现选择。", "“decoder-only”只规定主干范式，不规定每个子层细节。", "现代模型常组合 Pre-Norm、RMSNorm、RoPE、SwiGLU 和 GQA。", "不同模型家族不能仅凭营销名称推断训练配方。", { prerequisites: ["transformer.residual.block"] }),
          n("decoder.architecture.full-path", "从 Token IDs 到 LM Head", "串联 embedding、N 个 block、final norm 和 vocabulary logits。", "面试需要把局部模块放回完整前向图。", "Residual width 在层间固定，最后映射到 V 维 logits。", "训练时并行计算 T 个位置，生成时仍按 token 自回归。", { prerequisites: ["decoder.architecture.modern-block", "decoder.objective.logits-loss"], tensorShapes: [{ label: "IDs", shape: "[B,T]" }, { label: "Blocks", shape: "[B,T,D]" }, { label: "Logits", shape: "[B,T,V]" }] }),
        ],
      },
    ],
  },
  {
    id: "pretraining",
    legacyTopicId: "pretraining",
    index: "05",
    title: "Pretraining",
    description: "从数据工程、优化与数值格式理解模型如何在固定预算下被充分训练。",
    why: "参数量只是一个旋钮；数据质量、token 数、优化稳定性和计算预算共同决定结果。",
    modules: [
      {
        id: "pretraining.data",
        title: "数据管线",
        description: "控制数据来源、重复、污染、混合权重与样本边界。",
        nodes: [
          n("pretraining.data.sources", "Web、书籍、代码与科学数据", "不同来源提供不同知识密度和结构。", "训练分布决定模型最常见的模式与能力覆盖。", "数据混合权重改变一个 token 在梯度中出现的频率。", "来源规模不能替代许可、质量和污染审计。", { prerequisites: ["decoder.objective.autoregressive"] }),
          n("pretraining.data.filtering-dedup", "Filtering 与 Deduplication", "减少低质量、重复和近重复样本。", "重复内容会浪费计算并扭曲频率，还可能放大记忆与污染。", "去重需要在精确匹配和语义近似之间选择粒度。", "过强过滤会删掉稀有但有价值的数据。", { prerequisites: ["pretraining.data.sources"] }),
          n("pretraining.data.contamination", "Benchmark Contamination", "识别训练数据与评测题重叠导致的虚高。", "模型可能记住题目或近似解法，而非表现出可泛化能力。", "需要按时间、文本相似度和答案模式做多层审计。", "无法证明没有污染时，应降低结论强度并加入新鲜评测。", { prerequisites: ["pretraining.data.filtering-dedup"] }),
          n("pretraining.data.mixture", "Mixture Weighting 与 Curriculum", "决定各数据域在训练 token 中的采样比例和顺序。", "数据域规模不同，直接按原始比例可能淹没高价值小域。", "权重控制期望梯度贡献；curriculum 还改变训练阶段的分布。", "动态配比的效果依赖模型阶段，不能只看静态数据量。", { difficulty: "进阶", prerequisites: ["pretraining.data.sources"] }),
        ],
      },
      {
        id: "pretraining.training",
        title: "训练与数值稳定",
        description: "把 batch、sequence、accumulation、精度和优化器放进同一训练循环。",
        nodes: [
          n("pretraining.training.batch-accumulation", "Batch、Sequence 与 Gradient Accumulation", "区分 micro-batch、global batch 和 token batch。", "单卡显存限制了单步可容纳样本，但优化需要足够稳定的全局梯度。", "累积多个 micro-batch 的梯度后再更新，等价性取决于 loss 缩放与状态层。", "Gradient accumulation 不减少参数、梯度和优化器常驻内存。", { prerequisites: ["math.optimization.gradient-sgd"] }),
          n("pretraining.training.precision", "FP16、BF16 与 Mixed Precision", "在吞吐、动态范围和数值误差之间取舍。", "大模型训练的矩阵计算和状态存储极其昂贵。", "BF16 保留 FP32 指数范围而减少尾数精度；混合精度让关键归约保留高精度。", "低精度节省不等于所有张量都以同一格式存储。", { prerequisites: ["math.optimization.adamw"] }),
          n("pretraining.training.memory", "训练显存核算", "参数之外还要计入梯度、优化器状态、激活和 buffer。", "7B BF16 权重约 14 GB，不代表 14 GB 就能训练。", "Adam 常为每个参数维护一阶/二阶矩；反向还要保存激活与梯度。", "精确峰值取决于实现、重计算、分片和临时内核。", { difficulty: "进阶", prerequisites: ["pretraining.training.batch-accumulation", "pretraining.training.precision"], codeChallengeId: "training-memory" }),
          n("pretraining.training.checkpointing", "Activation Checkpointing", "用重算换激活显存。", "深层长序列保存全部中间激活会占据大量显存。", "只保存检查点，反向时重跑局部前向恢复激活。", "它不分片模型状态，也会增加计算和 wall-clock time。", { prerequisites: ["pretraining.training.memory"] }),
        ],
      },
      {
        id: "pretraining.scaling",
        title: "Scaling Laws",
        description: "在固定 compute 下平衡参数 N、训练 token D 与数据质量。",
        nodes: [
          n("pretraining.scaling.empirical-law", "Empirical Scaling Law", "用经验幂律描述 loss 随 N、D、C 的趋势。", "预算规划需要估计继续扩模型或加数据的边际收益。", "在特定实验范围内，log-log 曲线常呈近似平滑趋势。", "指数和系数依赖模型、数据和训练设置，不是普适定理。", { difficulty: "进阶", prerequisites: ["math.probability.likelihood"], formula: String.raw`L(N,D)\approx L_\infty+AN^{-\alpha}+BD^{-\beta}`, symbols: [{ symbol: "N", meaning: "模型参数量" }, { symbol: "D", meaning: "训练 token 数" }, { symbol: "L∞,A,B,α,β", meaning: "由实验条件拟合的量" }] }),
          n("pretraining.scaling.compute-optimal", "Compute-Optimal Training", "固定 FLOPs 下协调模型容量与训练数据。", "过大的模型可能因 token 不足而欠训练，过小模型又无法有效利用大量数据。", "最优分配比较 N 和 D 的边际 loss 改善，而不是只最大化参数。", "Chinchilla-style 比例是特定研究结果，数据质量和部署目标会移动最优点。", { difficulty: "困难", prerequisites: ["pretraining.scaling.empirical-law"] }),
        ],
      },
    ],
  },
  {
    id: "post-training",
    legacyTopicId: "post-training",
    index: "06",
    title: "Post-Training",
    description: "从监督示范、偏好模型到在线策略优化，明确每个信号控制什么。",
    why: "预训练拟合文本分布，产品行为还需要指令、偏好、验证器和约束信号。",
    modules: [
      {
        id: "posttraining.sft-preference",
        title: "SFT 与偏好建模",
        description: "从 token 监督过渡到 chosen/rejected 的相对质量。",
        nodes: [
          n("posttraining.sft.masking", "SFT Assistant-Only Loss", "Prompt 参与 attention，但可不贡献 loss。", "模型需要读取条件，却不一定需要模仿用户文本。", "Loss mask 选择监督位置；删除 prompt 会改变回答 hidden state。", "不同 chat template 的边界 token 必须与 mask 对齐。", { prerequisites: ["decoder.objective.teacher-forcing"], formula: String.raw`\mathcal L_{\mathrm{SFT}}=-\sum_{t\in\mathcal A}\log\pi_\theta(y_t\mid x,y_{<t})`, symbols: [{ symbol: "A", meaning: "assistant 目标 token 位置集合" }, { symbol: "x", meaning: "系统和用户上下文" }], codeChallengeId: "assistant-loss-mask" }),
          n("posttraining.sft.data-quality", "Instruction Data 与遗忘", "分析示范覆盖、格式一致性、过拟合和 catastrophic forgetting。", "SFT 只能直接模仿训练分布中出现的行为。", "高质量少量示范可以改变输出协议，但窄分布更新可能损伤基座能力。", "“SFT 不能产生新能力”也过于绝对，组合与泛化仍可能出现。", { prerequisites: ["posttraining.sft.masking"] }),
          n("posttraining.preference.bradley-terry", "Pairwise Preference 与 Bradley-Terry", "用 reward 差定义 chosen 胜过 rejected 的概率。", "绝对打分尺度难统一，而成对比较更符合标注任务。", "Sigmoid 将两个标量 reward 的差映射到胜率。", "模型假设偏好由单一标量差解释，无法完整表达循环或多维偏好。", { prerequisites: ["math.probability.categorical"], formula: String.raw`P(y_w\succ y_l\mid x)=\sigma(r(x,y_w)-r(x,y_l))`, symbols: [{ symbol: "y_w,y_l", meaning: "chosen 与 rejected 回答" }, { symbol: "r", meaning: "奖励模型标量输出" }], codeChallengeId: "reward-ranking-loss" }),
          n("posttraining.preference.reward-model", "Reward Model 与 Reward Hacking", "训练标量排序器并识别分布外利用。", "策略优化需要可计算的质量信号。", "Pairwise log-sigmoid loss提高 chosen/rejected reward gap。", "绝对 reward 不可辨识；策略还可能找到评分器漏洞。", { prerequisites: ["posttraining.preference.bradley-terry"], codeChallengeId: "reward-ranking-loss" }),
        ],
      },
      {
        id: "posttraining.policy-gradient",
        title: "Policy Gradient 基础",
        description: "先理解 reward、return、value、Q 和 advantage，再进入 PPO/GRPO。",
        nodes: [
          n("posttraining.rl.policy-gradient", "Policy Gradient", "用采样回报加权 log-prob 梯度。", "离散生成无法对采样 token 本身直接反向传播。", "Score-function identity 把期望奖励梯度写成 reward×∇logπ。", "估计无偏不代表方差小，baseline 和 credit assignment 很关键。", { difficulty: "困难", prerequisites: ["math.probability.random-expectation", "math.optimization.gradient-sgd"], formula: String.raw`\nabla_\theta J=\mathbb E[\hat A_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)]`, symbols: [{ symbol: "sₜ,aₜ", meaning: "状态与动作/token" }, { symbol: "Âₜ", meaning: "优势估计" }], codeChallengeId: "policy-gradient-loss", estimatedMinutes: 45 }),
          n("posttraining.rl.value-advantage", "Return、Value、Q 与 Advantage", "分离结果好坏与相对当前状态基线。", "仅用 raw reward 会把题目难度差异混入策略梯度。", "A(s,a)=Q(s,a)-V(s) 衡量动作相对平均选择的增益。", "Value 是估计量，不是 reward；错误 critic 会引入偏差。", { prerequisites: ["posttraining.rl.policy-gradient"], formula: String.raw`A(s,a)=Q(s,a)-V(s)`, symbols: [{ symbol: "Q(s,a)", meaning: "状态动作对的期望回报" }, { symbol: "V(s)", meaning: "状态的平均期望回报" }], estimatedMinutes: 40 }),
        ],
      },
      {
        id: "posttraining.ppo",
        title: "PPO",
        description: "理解 importance ratio、裁剪四象限、GAE 与 reference KL。",
        nodes: [
          n("posttraining.ppo.ratio", "Importance Sampling 与 Probability Ratio", "从分布换测度推导 old-policy ratio，并解释为什么旧 rollout 只能有限复用。", "Rollout 来自 π_old，而更新目标属于 π_θ，需要理解 importance ratio 如何校正分布变化以及权重方差为何会恶化。", "r_t=π_θ/π_old 对旧策略样本重新加权；ratio 远离 1 时有效样本质量下降，也为 PPO clipping 的必要性埋下伏笔。", "Ratio 不是 reward；无偏 reweighting 不保证低方差，old policy 也不是长期 reference policy。", { difficulty: "困难", prerequisites: ["posttraining.rl.policy-gradient"], formula: String.raw`r_t(\theta)=\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\mathrm{old}}(a_t\mid s_t)}`, symbols: [{ symbol: "π_old", meaning: "生成本批 rollout 的策略快照" }, { symbol: "π_θ", meaning: "正在更新的策略" }], codeChallengeId: "ppo-ratio", estimatedMinutes: 30 }),
          n("posttraining.ppo.clipping", "PPO Clipped Objective", "按 advantage 符号分析 min 与 clip 的四种角落情况。", "重复使用 rollout 会让策略偏离行为分布并产生不可靠大更新。", "正优势只限制过度增大概率；负优势只限制过度减小概率，另一侧仍有优化信号。", "Clip 约束代理目标贡献，不是严格 KL 或参数距离上界。", { difficulty: "困难", prerequisites: ["posttraining.ppo.ratio", "posttraining.rl.value-advantage"], formula: String.raw`L^{\mathrm{clip}}=\mathbb E[\min(r_tA_t,\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)A_t)]`, symbols: [{ symbol: "rₜ", meaning: "importance ratio" }, { symbol: "Aₜ", meaning: "advantage" }, { symbol: "ε", meaning: "裁剪半径" }], codeChallengeId: "ppo-clipped-objective", estimatedMinutes: 50 }),
          n("posttraining.ppo.gae-kl", "GAE、Value Loss、Entropy 与 Reference KL", "组合方差控制、critic 学习、探索和长期语言锚点。", "单一 clipped policy loss 不能提供稳定 advantage 或限制长期漂移。", "GAE 对 TD residual 做加权和；reference KL 与 old-policy ratio承担不同控制角色。", "各项系数相互影响，不能把 reference model 当作 old policy。", { difficulty: "困难", prerequisites: ["posttraining.ppo.clipping"], formula: String.raw`\hat A_t^{\mathrm{GAE}}=\sum_{l\ge0}(\gamma\lambda)^l\delta_{t+l}`, symbols: [{ symbol: "δₜ", meaning: "一步 TD residual" }, { symbol: "γ", meaning: "回报折扣" }, { symbol: "λ", meaning: "偏差-方差权衡参数" }], codeChallengeId: "gae" }),
        ],
      },
      {
        id: "posttraining.dpo-grpo",
        title: "DPO 与 GRPO",
        description: "比较离线偏好分类与在线组相对策略优化。",
        nodes: [
          n("posttraining.dpo.derivation", "DPO 隐式奖励推导", "从 KL 正则化最优策略反解 reward 的 log-ratio 表达。", "希望省去显式 RM 和 PPO 在线环路，同时保留 reference 约束。", "最优策略正比于 π_ref·exp(r/β)，同 prompt 的归一化常数在偏好差中消失。", "推导来自理想化奖励目标；离线数据覆盖和 reference 选择仍决定效果。", { difficulty: "困难", prerequisites: ["math.optimization.lagrangian", "posttraining.preference.bradley-terry"], formula: String.raw`r(x,y)=\beta\log\frac{\pi^*(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}+\beta\log Z(x)`, symbols: [{ symbol: "π*", meaning: "KL 正则化目标的最优策略" }, { symbol: "π_ref", meaning: "冻结参考策略" }, { symbol: "β", meaning: "KL 正则强度" }], estimatedMinutes: 50 }),
          n("posttraining.dpo.objective", "DPO Loss 与 Beta", "比较 chosen/rejected 相对 reference 的 log-prob 改变量。", "只看当前策略 gap 无法区分参考模型原有偏好。", "DPO 增大 chosen 相对 reference 的优势，并减小 rejected 的相对优势。", "β 同时影响目标尺度和偏离控制，不能简单当作学习率。", { difficulty: "困难", prerequisites: ["posttraining.dpo.derivation"], formula: String.raw`\mathcal L_{\mathrm{DPO}}=-\log\sigma\{\beta[(\log\pi_\theta^w-\log\pi_{ref}^w)-(\log\pi_\theta^l-\log\pi_{ref}^l)]\}`, symbols: [{ symbol: "w,l", meaning: "chosen 与 rejected" }, { symbol: "πθ", meaning: "待训练策略" }], codeChallengeId: "dpo-loss" }),
          n("posttraining.grpo.group-advantage", "GRPO Group Advantage", "用同 prompt 多个 rollout 的 reward 均值/标准差构造相对优势。", "希望去掉独立 value model，同时保留可比较 baseline。", "同组候选提供局部难度基线；中心化决定方向，标准化控制尺度。", "全组 reward 相同则没有学习信号；小方差需要 epsilon。", { difficulty: "进阶", prerequisites: ["posttraining.rl.value-advantage"], formula: String.raw`\hat A_i=\frac{r_i-\bar r}{\sigma_r+\epsilon}`, symbols: [{ symbol: "rᵢ", meaning: "第 i 个 rollout 的 reward" }, { symbol: "r̄,σᵣ", meaning: "组均值与组标准差" }], codeChallengeId: "grpo-advantages", estimatedMinutes: 40 }),
          n("posttraining.grpo.objective", "GRPO Objective 与限制", "把 group advantage 放入 clipped policy objective 并加入 reference KL。", "在线多样探索仍需要限制单次更新和长期漂移。", "GRPO 去掉独立 critic，不等于没有 baseline 或没有 critic-like signal。", "多 rollout 增加采样成本，group size 和 reward 质量影响方差。", { difficulty: "困难", prerequisites: ["posttraining.grpo.group-advantage", "posttraining.ppo.clipping"], codeChallengeId: "grpo-clipped-loss" }),
          n("posttraining.other.online-offline", "Best-of-N、Rejection Sampling、RLAIF 与 Reward Shaping", "区分数据筛选、偏好生成、在线优化和奖励设计。", "不同资源条件需要不同的数据/控制闭环。", "Best-of-N 在采样时选优；rejection sampling 生成新 SFT 数据；RLAIF 改变反馈来源。", "这些方法不能互换，verifier/RM 偏差会被选择或训练放大。", { prerequisites: ["posttraining.preference.reward-model", "posttraining.dpo.objective"] }),
        ],
      },
    ],
  },
  {
    id: "reasoning",
    legacyTopicId: "reasoning",
    index: "07",
    title: "Reasoning Models",
    description: "区分行为轨迹、搜索、验证和训练信号，理解 test-time compute 的收益边界。",
    why: "训练结束后仍可通过多样采样、搜索和验证分配更多计算，但收益不是无条件的。",
    modules: [
      {
        id: "reasoning.inference",
        title: "Thinking 与 Test-Time Compute",
        description: "研究推理轨迹、候选搜索、验证和延迟成本。",
        nodes: [
          n("reasoning.behavior.thinking", "Thinking 与 Direct Answer", "同一参数模型可通过提示、预算或解码策略表现出不同推理行为。", "复杂任务可能需要更多中间计算而非立即输出。", "Thinking 是 inference behavior，不必意味着参数切换，也不保证内部轨迹公开。", "更长文本不等于更正确，且隐藏 reasoning 不应被臆测或伪造。", { prerequisites: ["decoder.architecture.full-path"] }),
          n("reasoning.inference.test-time-scaling", "Test-Time Scaling", "增加轨迹长度、候选数、搜索或验证预算。", "性能不只能通过增加训练参数或训练 FLOPs 改善。", "额外计算扩大探索或检查范围，可能提高找到正确解的概率。", "收益会饱和，弱 verifier 还可能稳定选择错误答案。", { prerequisites: ["reasoning.behavior.thinking"] }),
          n("reasoning.inference.self-consistency", "Self-Consistency 与 Majority Vote", "采样多条路径并聚合最终答案。", "单条高方差推理路径可能偶然走错。", "若正确答案在独立多样样本中更稳定，多数聚合可提高成功率。", "样本相关或系统性偏差时，增加 N 只会重复同类错误。", { prerequisites: ["reasoning.inference.test-time-scaling"], codeChallengeId: "majority-vote" }),
          n("reasoning.inference.best-of-n", "Best-of-N 与 Verifier", "生成 N 个候选后由评分器选优。", "正确候选存在不代表默认采样会输出它。", "最终质量同时取决于候选覆盖率和 verifier 排序准确率。", "N 增大提高成本；不可靠 verifier 会引入 winner's curse 或 reward hacking。", { prerequisites: ["reasoning.inference.test-time-scaling"] }),
        ],
      },
      {
        id: "reasoning.training",
        title: "Reasoning 训练信号",
        description: "连接 verifier、process/outcome reward、RLVR 与蒸馏。",
        nodes: [
          n("reasoning.training.process-outcome", "Process vs Outcome Supervision", "分别监督中间步骤或最终结果。", "只看终局难以定位哪一步导致失败。", "Process reward 提供更密集 credit；outcome reward 更容易自动验证。", "步骤标注昂贵且可能奖励表面形式；最终正确也可能伴随错误理由。", { prerequisites: ["posttraining.preference.reward-model"] }),
          n("reasoning.training.rlvr", "RL with Verifiable Rewards", "用单元测试、答案检查器或证明器提供可验证 reward。", "开放式人工偏好昂贵且噪声大，结构化任务可自动判定结果。", "数学、代码等任务能低成本产生 pass/fail 或 graded reward。", "Verifier 覆盖不全会诱发 reward hacking；稀疏 reward 又提高探索难度。", { prerequisites: ["posttraining.grpo.objective", "reasoning.training.process-outcome"] }),
          n("reasoning.training.distillation", "Reasoning Distillation", "用教师答案或可见 rationale 训练更小学生模型。", "强教师的搜索成本可能过高，不适合每次线上运行。", "蒸馏把教师分布或轨迹变成离线监督，让学生摊销部分搜索。", "教师错误、冗长或不可忠实解释的轨迹会被学生继承。", { prerequisites: ["reasoning.inference.best-of-n", "posttraining.sft.masking"] }),
        ],
      },
    ],
  },
  {
    id: "inference",
    legacyTopicId: "inference",
    index: "08",
    title: "LLM Inference",
    description: "沿生成、KV Cache、内存流量、调度和量化定位真实延迟与吞吐瓶颈。",
    why: "相同权重在不同缓存、内核和调度下可能呈现完全不同的服务性能。",
    modules: [
      {
        id: "inference.generation",
        title: "生成算法",
        description: "从 logits 到 greedy、temperature、top-k/top-p 和 beam search。",
        nodes: [
          n("inference.generation.temperature", "Greedy 与 Temperature", "用 T 控制 logits 差异进入 softmax 的尺度。", "不同任务需要确定性或多样性不同的输出。", "T<1 放大 logit gap，T→0 接近 argmax；T>1 压平分布。", "Temperature 不能修复错误事实，只改变采样分布。", { prerequisites: ["decoder.objective.logits-loss"], formula: String.raw`p_i(T)=\frac{\exp(z_i/T)}{\sum_j\exp(z_j/T)}`, symbols: [{ symbol: "zᵢ", meaning: "第 i 个 token logit" }, { symbol: "T", meaning: "正温度" }], codeChallengeId: "temperature-sampling" }),
          n("inference.generation.topk-topp", "Top-k 与 Top-p", "固定候选数与动态累计概率截断。", "全词表采样会给极低概率尾部留下错误机会。", "Top-k 固定保留 k 个；top-p 保留达到阈值的最小高概率集合。", "过强截断会损失必要的低频 token，且顺序必须在重归一化前明确。", { prerequisites: ["inference.generation.temperature"], codeChallengeId: "top-p-sampling" }),
          n("inference.generation.beam-stop", "Beam Search、Repetition 与 Stop Tokens", "区分序列概率搜索、开放式采样和生成终止。", "局部 greedy 不保证最高序列概率，开放式对话又不只追求似然。", "Beam 保留多个累计 log-prob 前缀；长度惩罚修正短序列偏好。", "Beam 对开放式对话常变得模式化，stop 规则错误会截断或泄漏模板。", { prerequisites: ["inference.generation.topk-topp"], codeChallengeId: "beam-search" }),
        ],
      },
      {
        id: "inference.kv-cache",
        title: "KV Cache 与长上下文",
        description: "区分避免重复计算、缓存线性增长和 decode 带宽。",
        nodes: [
          n("inference.cache.prefill-decode", "Prefill 与 Decode", "区分整段 prompt 并行处理和逐 token 增量生成。", "两个阶段的矩阵形状、并行度和瓶颈不同。", "Prefill 有较大的 T×T attention 与 GEMM；decode 每步 query 长度为 1，但反复读取历史 KV。", "不能用单一 FLOPs 指标概括端到端延迟。", { prerequisites: ["decoder.architecture.full-path"] }),
          n("inference.cache.kv", "KV Cache 为什么缓存 K/V", "复用历史 token 的 key/value，当前 query 每步重新产生。", "不缓存会在每个 decode step 重算全部历史层激活的 K/V。", "历史 K/V 对后续 query 可复用，而 Q 只服务当前位置的读取。", "Cache 不让每步 attention 变 O(1)；仍需读取并匹配长度 T 的历史 KV。", { prerequisites: ["inference.cache.prefill-decode", "transformer.attention.qkv"], codeChallengeId: "kv-cache-gib", estimatedMinutes: 40 }),
          n("inference.cache.memory-bandwidth", "KV Shape、显存与 Decode Bandwidth", "从 L、B、T、n_kv、d_h 和精度计算缓存。", "长上下文和批量会线性放大常驻缓存及每步读取。", "理论字节数为两份 K/V 张量元素数乘每元素字节。", "公式不含 allocator 碎片、分页表、临时 buffer 和并行副本。", { difficulty: "进阶", prerequisites: ["inference.cache.kv", "transformer.multihead.gqa"], formula: String.raw`M_{KV}=2LBTn_{kv}d_hs`, symbols: [{ symbol: "L,B,T", meaning: "层数、批量、缓存长度" }, { symbol: "n_kv,d_h", meaning: "KV 头数和头维" }, { symbol: "s", meaning: "每元素字节数" }], codeChallengeId: "kv-cache-gib" }),
        ],
      },
      {
        id: "inference.systems",
        title: "Attention Kernel 与 Serving",
        description: "减少 HBM 流量、缓存碎片和批处理空洞。",
        nodes: [
          n("inference.kernel.flashattention", "FlashAttention", "通过 tiling 与 online softmax 计算精确 dense attention。", "朴素实现会把 T×T score/probability 矩阵反复写入 HBM。", "在 SRAM 小块中融合 QK、softmax 和 AV，减少物化与数据移动。", "它不把 dense attention 算术复杂度变成线性，也不等同 KV Cache。", { difficulty: "困难", prerequisites: ["transformer.attention.softmax-stability", "inference.cache.prefill-decode"] }),
          n("inference.serving.pagedattention", "PagedAttention", "用固定块管理非连续 KV cache。", "请求长度动态变化会造成预留浪费与外部碎片。", "逻辑 token 顺序通过 block table 映射到物理页，无需整段连续内存。", "分页解决内存管理，不消除 attention 读取历史 KV 的计算。", { prerequisites: ["inference.cache.memory-bandwidth"] }),
          n("inference.serving.continuous-batching", "Continuous Batching", "在 token step 边界动态加入/移除请求。", "静态 batch 会被最长请求拖住并产生空槽。", "调度器持续补充活跃序列，提高设备利用率和吞吐。", "吞吐提升可能增加排队延迟，需要明确服务级目标。", { prerequisites: ["inference.cache.prefill-decode", "inference.serving.pagedattention"] }),
          n("inference.serving.speculative", "Speculative Decoding", "draft 提案、target 并行验证并按接受规则保持目标分布。", "大模型 decode 的每步串行成本高，而小 draft 可快速提出多个 token。", "当 draft 与 target 接近时，一次 target 前向可接受多个 token。", "Draft 太弱导致低接受率，太大则自身成本吞掉收益。", { difficulty: "困难", prerequisites: ["inference.generation.temperature", "inference.cache.prefill-decode"], codeChallengeId: "speculative-accept" }),
        ],
      },
      {
        id: "inference.quantization",
        title: "Quantization",
        description: "理解低比特表示、校准、误差和 weight/activation 范围。",
        nodes: [
          n("inference.quantization.formats", "FP32 / FP16 / BF16 / INT8 / INT4", "区分浮点动态范围、尾数精度和整数缩放。", "权重和 KV 的字节数直接影响容量与带宽。", "整数通过 scale/zero-point 近似实数区间；低 bit 增大离散误差。", "标称 bit 数不等于端到端显存或速度按同比例变化。", { prerequisites: ["pretraining.training.precision"] }),
          n("inference.quantization.gptq-awq", "Weight-only、Calibration、GPTQ/AWQ 直觉", "用少量校准数据决定哪些量化误差最影响输出。", "所有权重元素的相同误差对激活结果影响并不相同。", "GPTQ-style 方法利用二阶近似补偿；AWQ-style 方法保护激活敏感权重。", "不同 kernel、group size 和硬件决定实际收益，不能只看模型文件大小。", { difficulty: "进阶", prerequisites: ["inference.quantization.formats"] }),
        ],
      },
    ],
  },
  {
    id: "moe",
    legacyTopicId: "moe",
    index: "09",
    title: "Mixture of Experts",
    description: "用稀疏条件计算扩展 FFN 容量，并追踪路由、容量和通信代价。",
    why: "MoE 可以让总参数大幅增长，而每个 token 只激活少数专家。",
    modules: [
      {
        id: "moe.routing",
        title: "稀疏路由与系统代价",
        description: "从 router logits 到 Top-k、负载均衡、capacity 和 expert parallel。",
        nodes: [
          n("moe.routing.why-ffn", "为什么 Experts 替换 FFN", "对 position-wise FFN 做 token 级条件路由。", "FFN 占大量参数且每个 token 独立计算，天然适合稀疏选择。", "保留 attention 的跨 token 通信，只把逐 token 非线性变换专家化。", "通信和负载不均会让低 FLOPs 模型仍有高延迟。", { prerequisites: ["transformer.ffn.standard"] }),
          n("moe.routing.topk", "Router Softmax 与 Top-k", "为每个 token 选择少数专家并加权输出。", "全部专家都计算会失去稀疏收益。", "Router 产生 E 个 logits，softmax 后保留最高 k 个门值。", "Top-k 离散选择会带来训练稳定与负载问题。", { prerequisites: ["moe.routing.why-ffn"], formula: String.raw`p(e\mid x)=\operatorname{softmax}(W_rx)_e`, symbols: [{ symbol: "E", meaning: "专家总数" }, { symbol: "W_r", meaning: "router 权重" }, { symbol: "p(e|x)", meaning: "token x 路由到专家 e 的门值" }], codeChallengeId: "topk-router" }),
          n("moe.routing.balance", "Load Balancing 与 Expert Collapse", "让 token 流量和门概率不过度集中。", "少数专家过载会丢 token 或形成通信热点，其余专家得不到训练。", "辅助损失通常同时关注分配频率和平均门概率。", "过强均衡会牺牲任务自然产生的非均匀专业化。", { difficulty: "进阶", prerequisites: ["moe.routing.topk"] }),
          n("moe.routing.capacity", "Capacity Factor 与 Dropped Tokens", "为每个专家分配有限 token buffer。", "分布式 All-to-All 需要可规划的张量容量。", "Capacity factor 在平均 token/专家基础上留出冗余。", "容量过低会 drop/overflow，过高则浪费内存与通信。", { prerequisites: ["moe.routing.balance"] }),
          n("moe.system.expert-parallel", "Expert Parallel 与 All-to-All", "按专家切分参数，并把 token 发送到专家所在设备。", "单卡无法保存全部专家，且 token 路由跨设备。", "Dispatch 和 combine 两次数据重排通常需要 All-to-All。", "总参数、激活参数、通信量和延迟必须分别报告。", { difficulty: "困难", prerequisites: ["moe.routing.capacity"] }),
        ],
      },
    ],
  },
  {
    id: "peft",
    legacyTopicId: "peft",
    index: "10",
    title: "Parameter-Efficient Fine-Tuning",
    description: "用低秩更新、adapter 与量化底座降低任务适配的训练状态成本。",
    why: "为每个任务复制完整模型的梯度、优化器状态和权重版本代价过高。",
    modules: [
      {
        id: "peft.lora",
        title: "LoRA、QLoRA 与 Adapter",
        description: "从线性代数、参数量和部署合并理解 PEFT 真正节省什么。",
        nodes: [
          n("peft.baseline.full-vs-adapter", "Full Fine-Tuning 与 Adapter", "比较更新全部权重和插入小瓶颈模块。", "多任务场景需要保存许多模型版本。", "Adapter 冻结底座，通过新增小网络学习任务增量。", "参数少不代表激活和底座前向成本按比例减少。", { prerequisites: ["posttraining.sft.data-quality"] }),
          n("peft.lora.update", "LoRA Low-Rank Update", "把 ΔW 写成 B·A，并用 α/r 控制尺度。", "下游适配可能只需在较低维方向改变权重。", "训练瘦矩阵 A/B，前向把其乘积作为冻结 W 的增量。", "Rank 太小会欠拟合，太大逐渐失去参数效率。", { difficulty: "进阶", prerequisites: ["math.linear.rank-lowrank-svd"], formula: String.raw`W'=W+\frac{\alpha}{r}BA`, symbols: [{ symbol: "W", meaning: "冻结基础权重" }, { symbol: "A,B", meaning: "可训练低秩因子" }, { symbol: "r", meaning: "rank" }, { symbol: "α", meaning: "更新尺度" }], codeChallengeId: "lora-parameter-count" }),
          n("peft.lora.targets-merge", "Target Modules 与 Merge", "选择 Q/V/O/FFN 等插入位置，并理解部署合并。", "不同模块控制不同功能且参数预算不同。", "Merge 预先把 (α/r)BA 加入 W，消除推理旁路算子。", "合并通常恢复基础线性层速度，不会自动比基础模型更快。", { prerequisites: ["peft.lora.update"] }),
          n("peft.qlora.quantized-base", "QLoRA", "冻结量化底座，只训练高精度 LoRA adapter。", "全精度底座仍可能让微调显存不可承受。", "量化权重参与前向，梯度沿激活流向 A/B，而不更新离散底座。", "QLoRA 不是普通 INT4 部署，也不意味着激活和优化器都为 4 bit。", { difficulty: "进阶", prerequisites: ["peft.lora.update", "inference.quantization.formats"] }),
          n("peft.memory.accounting", "PEFT Memory Accounting", "分别核算底座、adapter、梯度、优化器和激活。", "仅报告 trainable parameter count 会夸大显存节省。", "LoRA 主要减少可训练状态；QLoRA 进一步压缩冻结底座存储。", "长序列激活仍可能成为峰值显存主项。", { prerequisites: ["peft.qlora.quantized-base", "pretraining.training.memory"] }),
        ],
      },
    ],
  },
  {
    id: "distributed",
    legacyTopicId: "distributed",
    index: "11",
    title: "Distributed Training",
    description: "对每种并行策略回答：切了什么、复制什么、通信在哪里、显存省在哪里。",
    why: "单卡既可能放不下模型状态，也可能无法在目标时间内完成计算。",
    modules: [
      {
        id: "distributed.parallelism",
        title: "并行维度与分片",
        description: "比较 DP/DDP、TP、PP、SP、EP、ZeRO 与 FSDP。",
        nodes: [
          n("distributed.data.ddp", "Data Parallel 与 DDP", "复制完整模型、切分数据并 AllReduce 梯度。", "需要用多卡提高吞吐，但单卡仍放得下模型。", "每卡计算不同样本梯度，AllReduce 得到求和/平均并让副本保持一致。", "DDP 不分片参数、梯度和优化器常驻状态。", { prerequisites: ["pretraining.training.batch-accumulation"] }),
          n("distributed.tensor.tp", "Tensor Parallel", "在层内切分大矩阵并在每层通信部分结果。", "单个线性层权重或计算无法由一张卡承担。", "Column/row parallel 让不同设备计算输出列或输入行，并用 AllGather/AllReduce 组合。", "TP 通信频繁，对互联带宽和拓扑敏感。", { difficulty: "进阶", prerequisites: ["math.linear.matmul-shapes"] }),
          n("distributed.pipeline.pp", "Pipeline Parallel", "按层切分模型并用 micro-batch 填充流水线。", "跨层放置能降低每卡参数，但会产生阶段等待。", "Micro-batch 让不同 pipeline stage 同时处理不同样本。", "Bubble、负载不均和激活传输会限制利用率。", { difficulty: "进阶", prerequisites: ["decoder.architecture.full-path"] }),
          n("distributed.sequence.sp", "Sequence Parallel", "沿 sequence 轴切分可分解的激活/算子。", "长序列激活可能成为显存瓶颈。", "对 Norm、dropout 等局部操作分片，并在需要跨 token 交互处通信。", "不同框架的 SP 定义和与 TP 的组合方式并不完全相同。", { difficulty: "困难", prerequisites: ["distributed.tensor.tp", "transformer.attention.tensor-path"] }),
          n("distributed.expert.ep", "Expert Parallel", "按专家切分 MoE 参数并路由 token。", "专家数和总参数可远超单卡容量。", "设备持有专家子集，token 通过 All-to-All dispatch/combine。", "EP 与 MoE 强绑定，通信不规则且受负载均衡影响。", { prerequisites: ["moe.system.expert-parallel"] }),
          n("distributed.zero.stages", "ZeRO-1 / 2 / 3", "依次分片 optimizer states、gradients、parameters。", "DDP 每卡复制完整模型状态，内存随 data-parallel world size 不下降。", "更高 stage 以更多通信和临时 gather 换更低常驻内存。", "ZeRO 不直接减少 activation memory。", { difficulty: "进阶", prerequisites: ["distributed.data.ddp", "pretraining.training.memory"], codeChallengeId: "zero-memory-estimate" }),
          n("distributed.fsdp.lifecycle", "FSDP AllGather / ReduceScatter 生命周期", "按层临时聚合参数并在反向后重新分片梯度。", "计算 kernel 需要当前层完整或适配的参数视图。", "Forward 前 AllGather 当前单元参数，backward 后 ReduceScatter 梯度。", "峰值受 prefetch、wrap 粒度和同时 materialize 的层数影响。", { difficulty: "困难", prerequisites: ["distributed.zero.stages"] }),
        ],
      },
    ],
  },
  {
    id: "evaluation",
    legacyTopicId: "evaluation",
    index: "12",
    title: "Evaluation & Reliability",
    description: "把拟合、任务正确率、偏好、校准和尾部失败放入同一评测框架。",
    why: "单一离线平均指标无法代表真实产品质量与高代价失败。",
    modules: [
      {
        id: "evaluation.metrics",
        title: "指标、偏差与可靠应用",
        description: "区分 loss、正确率、pass@k、judge 偏差、校准、分布偏移与尾部风险。",
        nodes: [
          n("evaluation.metrics.loss-perplexity", "Validation Loss 与 Perplexity", "衡量给定 token 分布上的平均 NLL。", "训练需要连续、低方差的拟合指标。", "Perplexity 是平均 token NLL 的指数。", "后训练后 perplexity 变差不一定代表指令遵循变差；不同 tokenizer 也难直接比较。", { prerequisites: ["decoder.objective.logits-loss"] }),
          n("evaluation.metrics.passk", "Exact Match、Accuracy 与 pass@k", "区分一次成功率和多候选至少一次成功概率。", "代码/数学任务常有确定性 checker，且允许多次采样。", "pass@k 估计 k 个候选中至少一个通过的概率。", "样本独立性、去重和测试覆盖会影响解释。", { prerequisites: ["reasoning.inference.best-of-n"], codeChallengeId: "pass-at-k" }),
          n("evaluation.judge.preference", "Pairwise Win Rate 与 LLM-as-a-Judge", "用成对比较评估难以自动打分的开放式回答。", "单一参考答案无法覆盖风格和帮助性。", "Judge 在固定 rubric 下比较两个输出，减少绝对分数漂移。", "位置、长度、自偏好和提示注入都会造成 judge bias。", { prerequisites: ["posttraining.preference.bradley-terry"] }),
          n("evaluation.reliability.calibration", "Calibration 与 Uncertainty", "比较预测置信度和真实正确频率。", "高概率错误比低置信错误更危险。", "良好校准意味着声称 80% 的事件约有 80% 成功。", "生成 token 概率不能直接当作整条答案正确概率。", { difficulty: "进阶", prerequisites: ["math.probability.categorical"], codeChallengeId: "expected-calibration-error" }),
          n("evaluation.reliability.shift", "Hallucination、Robustness 与 Distribution Shift", "测试事实依据、扰动敏感性和部署分布变化。", "平均 benchmark 分数无法覆盖未知输入和错误恢复。", "可靠性评测应改变措辞、来源、时间和工具状态，观察失败模式。", "Hallucination 没有单一完美自动指标，需要任务化定义。", { prerequisites: ["evaluation.metrics.loss-perplexity"] }),
          n("evaluation.reliability.tail-risk", "Expected Loss、VaR 与 CVaR", "从平均损失转向最坏尾部的频率与严重度。", "安全、金融或自动操作中，少量高代价错误可能主导风险。", "VaR 给出损失分位点；CVaR 关注超过该分位点后的平均损失。", "CVaR 依赖损失定义和尾部样本量，估计可能高方差。", { difficulty: "困难", prerequisites: ["math.probability.random-expectation"], formula: String.raw`\operatorname{CVaR}_\alpha(L)=\mathbb E[L\mid L\ge \operatorname{VaR}_\alpha(L)]`, symbols: [{ symbol: "L", meaning: "随机损失" }, { symbol: "α", meaning: "尾部分位水平" }] }),
          n("evaluation.applications.rag-agent", "RAG 与 Agent Reliability", "用检索、重排、工具 schema、状态和幂等性约束外部能力。", "参数知识不及时，工具动作又可能产生真实副作用。", "RAG 分离召回与重排；Agent 用显式 schema 和状态机执行可验证动作。", "更多上下文不总更好，破坏性操作必须授权、确认并支持安全重试。", { prerequisites: ["evaluation.reliability.shift", "inference.serving.continuous-batching"] }),
        ],
      },
    ],
  },
];

export const curriculumTracks: CurriculumTrack[] = trackSeeds.map((track) => ({
  id: track.id,
  legacyTopicId: track.legacyTopicId,
  index: track.index,
  title: track.title,
  description: track.description,
  why: track.why,
  moduleIds: track.modules.map((module) => module.id),
}));

export const curriculumModules: CurriculumModule[] = trackSeeds.flatMap((track) =>
  track.modules.map((module) => ({
    id: module.id,
    trackId: track.id,
    title: module.title,
    description: module.description,
    nodeIds: module.nodes.map((node) => node.id),
  })),
);

export const knowledgeNodes: KnowledgeNode[] = trackSeeds.flatMap((track) =>
  track.modules.flatMap((module) => module.nodes.map((node) => ({
    id: node.id,
    trackId: track.id,
    moduleId: module.id,
    title: node.title,
    summary: node.summary,
    why: node.why,
    intuition: node.intuition,
    caveat: node.caveat,
    difficulty: node.difficulty ?? "进阶",
    estimatedMinutes: node.estimatedMinutes ?? (node.difficulty === "困难" ? 24 : node.difficulty === "基础" ? 10 : 16),
    prerequisites: node.prerequisites ?? [],
    keywords: [...(node.keywords ?? []), node.title, module.title, track.title],
    formula: node.formula,
    symbols: node.symbols,
    tensorShapes: node.tensorShapes,
    codeChallengeId: node.codeChallengeId,
  }))),
);

export const trackById = Object.fromEntries(curriculumTracks.map((track) => [track.id, track]));
export const moduleById = Object.fromEntries(curriculumModules.map((module) => [module.id, module]));
export const knowledgeNodeById = Object.fromEntries(knowledgeNodes.map((node) => [node.id, node]));

export const trackAliases: Record<string, string> = {
  architecture: "transformer",
  "rag-agents": "evaluation",
};

export function resolveTrackId(id: string): string {
  if (trackById[id]) return id;
  return trackAliases[id] ?? "transformer";
}

export function nodesForTrack(trackId: string): KnowledgeNode[] {
  return knowledgeNodes.filter((node) => node.trackId === resolveTrackId(trackId));
}

export function progressForTrack(
  trackId: string,
  completedNodes: string[],
): { completed: number; total: number; percent: number } {
  const nodes = nodesForTrack(trackId);
  const completed = nodes.filter((node) => completedNodes.includes(node.id)).length;
  return {
    completed,
    total: nodes.length,
    percent: nodes.length ? Math.round((completed / nodes.length) * 100) : 0,
  };
}
