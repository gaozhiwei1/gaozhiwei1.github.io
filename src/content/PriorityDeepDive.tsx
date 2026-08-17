import { CircleAlert, Code2 } from "lucide-react";
import { DerivationBlock } from "../components/DerivationBlock";
import { Formula } from "../components/Formula";
import { MathInsight } from "../components/MathInsight";
import { TensorShape } from "../components/TensorShape";
import { AttentionLab } from "../components/labs/AttentionLab";
import { KvCacheLab } from "../components/labs/KvCacheLab";
import { TokenizerLab } from "../components/labs/TokenizerLab";

const attentionCode = `def scaled_dot_product_attention(q, k, v, mask=None):
    # q/k/v: [B, H, T, Dh]
    scores = q @ k.transpose(-2, -1)
    scores = scores / math.sqrt(q.size(-1))

    if mask is not None:
        scores = scores.masked_fill(mask, float("-inf"))

    # 在 FP32 中执行 softmax 可降低半精度归约误差
    weights = torch.softmax(scores.float(), dim=-1).to(q.dtype)
    return weights @ v`;

const rmsNormCode = `class RMSNorm(nn.Module):
    def __init__(self, hidden_size, eps=1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(hidden_size))
        self.eps = eps

    def forward(self, x):
        # 统计量只沿最后的 hidden dimension 计算
        rms_inv = torch.rsqrt(x.float().pow(2).mean(-1, keepdim=True) + self.eps)
        normalized = x * rms_inv.to(x.dtype)
        return normalized * self.weight`;

const ropeCode = `def rotate_half(x):
    # x: [..., Dh]，Dh 必须为偶数
    x_even = x[..., 0::2]
    x_odd = x[..., 1::2]
    return torch.stack((-x_odd, x_even), dim=-1).flatten(-2)

def apply_rope(x, cos, sin):
    # cos/sin 只随 position 与通道对变化，可在 B/H 轴广播
    return x * cos + rotate_half(x) * sin`;

// This shared registry also drives the learning-page table of contents.
// eslint-disable-next-line react-refresh/only-export-components
export const priorityNodeIds = new Set([
  "tokenization.granularity",
  "transformer.attention.qkv",
  "transformer.attention.scaling",
  "transformer.position.rope",
  "transformer.norm.layer-rms",
  "transformer.multihead.gqa",
  "inference.cache.kv",
  "inference.cache.memory-bandwidth",
  "inference.kernel.flashattention",
  "peft.lora.update",
]);

function CodeExample({ children }: { children: string }) {
  return <pre className="code-block"><code>{children}</code></pre>;
}

function AttentionScaling() {
  return (
    <>
      <MathInsight title="缩放项来自方差，而不是经验凑数" formula={String.raw`\operatorname{Var}(q^\top k)\approx d_k\quad\Longrightarrow\quad\operatorname{Var}\!\left(\frac{q^\top k}{\sqrt{d_k}}\right)\approx1`}>
        <p>假设每个 <Formula>{String.raw`q_i,k_i`}</Formula> 近似独立、均值为 0、方差为 1，则每个乘积的方差约为 1。点积累加 <Formula>{String.raw`d_k`}</Formula> 项，所以标准差约为 <Formula>{String.raw`\sqrt{d_k}`}</Formula>。</p>
      </MathInsight>
      <DerivationBlock
        title="从点积分量推到稳定 Softmax 尺度"
        summary="关键不是让分数变小，而是让分数分布不随 head dimension 无界变宽。"
        defaultExpanded
        steps={[
          { title: "展开单头点积", formula: String.raw`s=q^\top k=\sum_{i=1}^{d_k}q_ik_i`, explanation: <p>每个 attention score 是两个 <Formula>{String.raw`d_k`}</Formula> 维向量的内积。</p>, important: true },
          { title: "写出均值", formula: String.raw`\mathbb E[s]=\sum_i\mathbb E[q_ik_i]\approx0`, explanation: <p>零均值与近似独立使乘积期望接近 0。</p> },
          { title: "累加方差", formula: String.raw`\operatorname{Var}(s)=\sum_i\operatorname{Var}(q_ik_i)+2\sum_{i<j}\operatorname{Cov}(q_ik_i,q_jk_j)\approx d_k`, explanation: <p>近似独立时协方差项接近 0，每个乘积项方差约为 1。</p>, important: true },
          { title: "除以标准差尺度", formula: String.raw`\tilde s=s/\sqrt{d_k}`, explanation: <p>这让 <Formula>{String.raw`\operatorname{Var}(\tilde s)`}</Formula> 维持常数量级，避免仅因维度增加使 softmax 过早接近 one-hot。</p> },
          { title: "区分两种稳定性", explanation: <p><Formula>{String.raw`1/\sqrt{d_k}`}</Formula> 控制统计尺度；softmax 前减最大值控制指数溢出。两者解决不同问题。</p> },
        ]}
      />
      <TensorShape title="Scaled Dot-Product Attention" items={[
        { label: "Q / K", shape: "[B,H,T,Dh]" },
        { label: "QKᵀ", shape: "[B,H,T,T]", note: "沿 Dh 求和" },
        { label: "Softmax weights", shape: "[B,H,T,T]" },
        { label: "Weights @ V", shape: "[B,H,T,Dh]" },
      ]} />
      <div className="implementation-block"><h3><Code2 />最小 PyTorch 实现</h3><CodeExample>{attentionCode}</CodeExample></div>
      <AttentionLab />
    </>
  );
}

function QkvDeepDive() {
  return (
    <>
      <MathInsight title="匹配空间与内容空间必须解耦">
        <p>分数 <Formula>{String.raw`(x_iW_Q)(x_jW_K)^\top`}</Formula> 决定位置 <Formula>{String.raw`i`}</Formula> 从 <Formula>{String.raw`j`}</Formula> 读取多少；<Formula>{String.raw`x_jW_V`}</Formula> 决定真正传回什么。若强制 Q=K=V=X，这两种职责共享同一表示约束。</p>
      </MathInsight>
      <TensorShape title="Q/K/V 投影与分头" items={[
        { label: "Residual stream X", shape: "[B,T,D]" },
        { label: "Linear projection", shape: "[B,T,H×Dh]" },
        { label: "Split heads", shape: "[B,T,H,Dh]" },
        { label: "Transpose", shape: "[B,H,T,Dh]" },
      ]} />
      <div className="precision-note"><CircleAlert /><p><b>准确表述：</b>Attention 的独特能力是跨 token 通信，但 Q/K/V/O 投影本身也混合特征通道。FFN 不跨 token，而是在每个位置内执行更强的非线性特征变换。</p></div>
    </>
  );
}

function RmsNormDeepDive() {
  return (
    <>
      <MathInsight title="RMSNorm 控制能量，不强制零中心" formula={String.raw`\frac1d\sum_i\left(\frac{x_i}{\operatorname{RMS}(x)}\right)^2\approx1`}>
        <p>除以均方根后，未乘可学习尺度 <Formula>{String.raw`g`}</Formula> 的向量具有近似单位均方，但其均值可以非零。</p>
      </MathInsight>
      <DerivationBlock title="LayerNorm 与 RMSNorm 的统计量" summary="两者都通常沿每个 token 的 hidden dimension 计算，不跨 batch 或 sequence 混合样本。" steps={[
        { title: "LayerNorm 中心化", formula: String.raw`\mu=\frac1d\sum_i x_i,\quad \sigma^2=\frac1d\sum_i(x_i-\mu)^2`, explanation: <p>同时消除整体平移与缩放。</p>, important: true },
        { title: "RMSNorm 只缩放", formula: String.raw`r^2=\frac1d\sum_i x_i^2`, explanation: <p>保留均值和方向关系，只控制整体平方能量。</p>, important: true },
        { title: "可学习尺度", formula: String.raw`y_i=g_i\,x_i/\sqrt{r^2+\epsilon}`, explanation: <p>逐通道 <Formula>{String.raw`g_i`}</Formula> 恢复模型需要的相对幅度。</p> },
      ]} />
      <CodeExample>{rmsNormCode}</CodeExample>
    </>
  );
}

function RopeDeepDive() {
  return (
    <>
      <MathInsight title="相对位置来自旋转矩阵的乘法关系" formula={String.raw`R_m^\top R_n=R_{n-m}`}>
        <p>Q 和 K 分别按自身绝对位置旋转；二者做内积时，绝对角度组合成位置差。这是 RoPE 的几何核心。</p>
      </MathInsight>
      <DerivationBlock title="二维旋转如何进入 Attention score" summary="每两个 head channels 形成一个二维平面，不同通道对使用不同角频率。" defaultExpanded steps={[
        { title: "定义二维旋转", formula: String.raw`R_m=\begin{bmatrix}\cos(m\omega)&-\sin(m\omega)\\\sin(m\omega)&\cos(m\omega)\end{bmatrix}`, explanation: <p><Formula>{String.raw`m`}</Formula> 是位置，<Formula>{String.raw`\omega`}</Formula> 是当前通道对的角频率。</p>, important: true },
        { title: "旋转 Query 与 Key", formula: String.raw`q_m=R_mq,\quad k_n=R_nk`, explanation: <p>Value 不参与 QK 匹配，因此通常不需要同样旋转。</p> },
        { title: "展开点积", formula: String.raw`q_m^\top k_n=q^\top R_m^\top R_n k`, explanation: <p>旋转矩阵正交，所以转置等于逆旋转。</p> },
        { title: "得到相对位移", formula: String.raw`q_m^\top k_n=q^\top R_{n-m}k`, explanation: <p>分数依赖 <Formula>{String.raw`n-m`}</Formula>，而不是分别依赖两个绝对位置。</p>, important: true },
      ]} />
      <TensorShape title="RoPE 不改变 Shape" items={[
        { label: "Q / K", shape: "[B,H,T,Dh]" },
        { label: "Pair channels", shape: "[B,H,T,Dh/2,2]" },
        { label: "Rotate + flatten", shape: "[B,H,T,Dh]" },
      ]} />
      <CodeExample>{ropeCode}</CodeExample>
    </>
  );
}

function GqaDeepDive() {
  return (
    <>
      <div className="architecture-compare" aria-label="MHA MQA GQA 对比">
        <article><span>MHA</span><strong>H 个 Q heads</strong><p>H 个 KV heads</p><small>完整每头 KV</small></article>
        <article><span>GQA</span><strong>H 个 Q heads</strong><p>n_kv 个 KV heads</p><small>每组共享 KV</small></article>
        <article><span>MQA</span><strong>H 个 Q heads</strong><p>1 个 KV head</p><small>压缩最强</small></article>
      </div>
      <MathInsight title="GQA 的主要收益出现在 Cache 与 Decode 读取">
        <p>当 <Formula>{String.raw`H=32,n_{kv}=8`}</Formula> 时，每个 KV head 服务 4 个 query heads，理论 KV cache 是 MHA 的 <Formula>{String.raw`8/32=1/4`}</Formula>。Decode 每步读取的历史 KV 字节也近似按同一比例下降。</p>
      </MathInsight>
      <div className="precision-note"><CircleAlert /><p>Prefill 中大矩阵计算仍可能占主导；GQA 不代表所有阶段的总 FLOPs 都减少 75%。共享过强还可能损失每个 query head 独立表达 K/V 的容量，因此不是所有模型都直接使用 MQA。</p></div>
    </>
  );
}

function KvCacheDeepDive() {
  return (
    <>
      <MathInsight title="缓存消除历史投影重算，不消除历史读取">
        <p>第 <Formula>{String.raw`t`}</Formula> 步只需为新 token 计算 Q/K/V，并把新 K/V 追加到缓存；当前 Q 仍要与长度为 <Formula>{String.raw`t`}</Formula> 的全部历史 K 匹配，再读取对应 V。</p>
      </MathInsight>
      <DerivationBlock title="从缓存 Shape 推到 GiB" summary="先数元素，再乘数据类型字节；K/V 两份和层数是最常漏掉的因子。" defaultExpanded steps={[
        { title: "单层单份缓存", formula: String.raw`B\times T\times n_{kv}\times d_h`, explanation: <p>每个请求、历史 token、KV head 都保存一个 <Formula>{String.raw`d_h`}</Formula> 维向量。</p>, important: true },
        { title: "乘层数与 K/V 两份", formula: String.raw`N_{elem}=2LBTn_{kv}d_h`, explanation: <p>每层都有独立 K/V projection，所以无法跨层共享。</p> },
        { title: "乘精度并换算", formula: String.raw`M_{GiB}=\frac{2LBTn_{kv}d_hs}{1024^3}`, explanation: <p><Formula>{String.raw`s`}</Formula> 是每元素字节数；GiB 使用 <Formula>{String.raw`1024^3`}</Formula>。</p>, important: true },
        { title: "区分理论与运行时", explanation: <p>Allocator、PagedAttention block table、内部碎片、临时 buffer 和 tensor-parallel 副本需要另外核算。</p> },
      ]} />
      <TensorShape title="单层 KV Cache" items={[
        { label: "New hidden", shape: "[B,1,D]" },
        { label: "New K / V", shape: "[B,nKV,1,Dh]" },
        { label: "Append history", shape: "[B,nKV,T,Dh]" },
      ]} />
      <KvCacheLab />
    </>
  );
}

function FlashAttentionDeepDive() {
  return (
    <>
      <MathInsight title="主要优化量是 HBM 数据移动" formula={String.raw`O=\operatorname{softmax}(QK^\top/\sqrt d)V`}>
        <p>数学目标仍是 dense exact attention。关键变化是把 Q/K/V 分块搬入片上 SRAM，并融合 score、online softmax 与 V 累加，避免完整 <Formula>{String.raw`T\times T`}</Formula> 矩阵落到 HBM。</p>
      </MathInsight>
      <div className="io-path" aria-label="朴素 Attention 与 FlashAttention 数据路径">
        <article><b>朴素实现</b><span>QKᵀ</span><i>→ HBM</i><span>Softmax</span><i>→ HBM</i><span>AV</span></article>
        <article className="is-efficient"><b>FlashAttention</b><span>加载 Tiles 到 SRAM</span><i>→</i><span>在线归一化与累加</span><i>→</i><span>写回 O</span></article>
      </div>
      <DerivationBlock title="Online Softmax 为什么能分块" summary="维护当前块之前的行最大值和归一化和；新块到来时按新最大值重标定旧累加量。" steps={[
        { title: "旧块统计量", formula: String.raw`m_{old}=\max z_{old},\quad \ell_{old}=\sum_j e^{z_j-m_{old}}`, explanation: <p>用最大值稳定地记录已处理 logits 的分母。</p>, important: true },
        { title: "合并新块最大值", formula: String.raw`m_{new}=\max(m_{old},\max z_{block})`, explanation: <p>全局行最大值可以增量更新。</p> },
        { title: "重标定分母", formula: String.raw`\ell_{new}=e^{m_{old}-m_{new}}\ell_{old}+\sum_{j\in block}e^{z_j-m_{new}}`, explanation: <p>同样的系数也可重标定旧的加权 V 累加量。</p>, important: true },
      ]} />
      <div className="precision-note"><CircleAlert /><p>FlashAttention 不改变 dense attention 的 O(T²) 算术阶，也不是近似 attention。不同 kernel 的浮点求和顺序可能造成正常的舍入级差异。</p></div>
    </>
  );
}

function LoraDeepDive() {
  return (
    <>
      <MathInsight title="参数节省来自低秩因子，而不是更小的基础矩阵" formula={String.raw`r(d_{in}+d_{out})\ll d_{in}d_{out}`}>
        <p>对 <Formula>{String.raw`W\in\mathbb R^{d_{out}\times d_{in}}`}</Formula>，令 <Formula>{String.raw`A\in\mathbb R^{r\times d_{in}}`}</Formula>、<Formula>{String.raw`B\in\mathbb R^{d_{out}\times r}`}</Formula>。当 <Formula>{String.raw`r`}</Formula> 很小时，可训练参数显著减少。</p>
      </MathInsight>
      <DerivationBlock title="LoRA 参数量与初始化" summary="基础 W 冻结，优化器只为 A/B 建立梯度和状态。" steps={[
        { title: "完整更新", formula: String.raw`N_{full}=d_{out}d_{in}`, explanation: <p>全量微调为 W 的每个元素保存梯度与优化器状态。</p>, important: true },
        { title: "低秩更新", formula: String.raw`\Delta W=(\alpha/r)BA`, explanation: <p>乘积 rank 不超过 <Formula>{String.raw`r`}</Formula>。</p> },
        { title: "可训练参数", formula: String.raw`N_{LoRA}=r(d_{in}+d_{out})`, explanation: <p>例如 4096×4096、r=16 时为 131,072，而完整矩阵为 16,777,216。</p>, important: true },
        { title: "零增量初始化", explanation: <p>常令其中一个因子初始化为零，使初始 <Formula>{String.raw`\Delta W=0`}</Formula>，模型从原基座函数开始训练。</p> },
      ]} />
      <div className="precision-note"><CircleAlert /><p>LoRA 主要节省可训练参数及其梯度/优化器状态。基础模型前向和激活仍需计算；合并 adapter 后通常只是消除额外分支，并不会自动比原模型推理更快。</p></div>
    </>
  );
}

export function PriorityDeepDive({ nodeId }: { nodeId: string }) {
  if (nodeId === "tokenization.granularity") return <><MathInsight title="粒度同时影响序列长度与词表规模"><p>同一段文本切得越细，通常越容易覆盖未知片段，但序列更长；切得越粗，序列可能更短，却需要更大词表并承受低频词稀疏问题。真实 tokenizer 还受训练语料和合并规则影响。</p></MathInsight><TokenizerLab /></>;
  if (nodeId === "transformer.attention.qkv") return <QkvDeepDive />;
  if (nodeId === "transformer.attention.scaling") return <AttentionScaling />;
  if (nodeId === "transformer.norm.layer-rms") return <RmsNormDeepDive />;
  if (nodeId === "transformer.position.rope") return <RopeDeepDive />;
  if (nodeId === "transformer.multihead.gqa") return <GqaDeepDive />;
  if (nodeId === "inference.cache.kv" || nodeId === "inference.cache.memory-bandwidth") return <KvCacheDeepDive />;
  if (nodeId === "inference.kernel.flashattention") return <FlashAttentionDeepDive />;
  if (nodeId === "peft.lora.update") return <LoraDeepDive />;
  return null;
}
