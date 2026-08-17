---
id: transformer.attention.core
title: Attention：从 Q/K/V 到 Scaled Dot-Product Attention 的完整数学链路
level: gold
estimated_minutes: 40
code_challenge_id: scaled-dot-attention
---

# Attention：从 Q/K/V 到 Scaled Dot-Product Attention 的完整数学链路

## 1. Attention 到底解决什么？

给定 hidden states：

\[
X=[x_1,\ldots,x_T]^\top\in\mathbb R^{T\times D}.
\]

每个位置只有自己的向量，但语言需要跨 token 交换信息。Attention 的目标是：

> 对每个 query 位置 \(i\)，根据当前内容动态决定从每个位置 \(j\) 读取多少信息。

## 2. 为什么不是直接用 \(XX^\top\)？

若直接用

\[
x_i^\top x_j
\]

决定相似度，同时再把 \(x_j\) 当作返回内容，会把“用于匹配的特征”和“真正传输的内容”绑死。

Transformer 引入：

\[
Q=XW_Q,\qquad K=XW_K,\qquad V=XW_V.
\]

单位置：

\[
q_i=x_iW_Q,\qquad k_j=x_jW_K,\qquad v_j=x_jW_V.
\]

可以把它理解为：

- \(q_i\)：当前位置寻找什么
- \(k_j\)：位置 \(j\) 提供什么匹配特征
- \(v_j\)：位置 \(j\) 真正被读取的内容

这只是功能直觉，并不是说网络显式编码了人类语言中的“问题/键/值”。

### 3. Tensor Shape

多头实现中常见：

\[
X:[B,T,D],
\]

\[
Q,K,V:[B,H,T,D_h],
\]

其中

\[
D=H D_h.
\]

若使用 GQA，则 K/V 的 head 数可改为 \(H_{kv}\)。

## 4. 为什么匹配分数用点积？

单个 score：

\[
s_{ij}=q_i^\top k_j.
\]

矩阵形式：

\[
S=QK^\top.
\]

若单头：

\[
Q,K\in\mathbb R^{T\times d_k},
\]

则

\[
S\in\mathbb R^{T\times T}.
\]

第 \(i\) 行就是 query \(i\) 对所有 keys 的匹配分数。

## 5. 为什么除以 \(\sqrt{d_k}\)？

这里真正要控制的是 **dot-product score 的尺度**。为了看清这一点，先做一个常用的初始化近似：把各维 \(q_r,k_r\) 看成近似独立、零均值且单位方差。于是

\[
s=q^\top k=\sum_{r=1}^{d_k}q_rk_r.
\]

在这个近似下，\(E[s]\approx0\)，而各维贡献的方差会相加，因此

\[
\operatorname{Var}(s)
\approx
\sum_{r=1}^{d_k}\operatorname{Var}(q_rk_r)
\approx d_k,
\qquad
\operatorname{Std}(s)\approx\sqrt{d_k}.
\]

也就是说，head dimension 增大时，哪怕 \(q\) 和 \(k\) 的单维统计尺度没有变化，点积本身也会自然变大。于是将 score 归一化为

\[
\tilde s=\frac{s}{\sqrt{d_k}}
\]

后，在上述近似下就有 \(\operatorname{Var}(\tilde s)\approx1\)。矩阵形式因此写成

\[
\boxed{S=\frac{QK^\top}{\sqrt{d_k}}}.
\]

这里的核心不是“防止数值 overflow”，而是**避免 attention logits 仅仅因为 head dimension 变大就系统性变尖**。

### 6. 为什么 score 太大会影响 Softmax？

Softmax 对整体尺度很敏感：

\[
\alpha_{ij}=\frac{e^{s_{ij}}}{\sum_l e^{s_{il}}}.
\]

例如 \((1,2)\) 与 \((10,20)\) 的排序完全一样，但后一组经过 softmax 后会更接近 one-hot。其 Jacobian 为

\[
\frac{\partial\alpha_i}{\partial s_j}
=
\alpha_i(\delta_{ij}-\alpha_j),
\]

所以当概率已经极端接近 0 或 1 时，许多局部导数也会变小。这里要把两个常被混淆的问题分开：\(1/\sqrt{d_k}\) 控制 **统计尺度**；softmax 前减去最大 logit 则解决 **数值稳定性**。

## 7. Causal Mask

Decoder-only LM 不能看未来。

定义：

\[
M_{ij}
=
\begin{cases}
0,&j\le i,\\
-\infty,&j>i.
\end{cases}
\]

于是：

\[
A
=
\operatorname{softmax}
\left(
\frac{QK^\top}{\sqrt{d_k}}+M
\right).
\]

因为

\[
e^{-\infty}=0,
\]

未来位置权重为 0。

实现中通常使用 dtype 可表示的极小数。

## 8. 为什么最后乘 \(V\)？

第 \(i\) 个 query 获得权重：

\[
\alpha_{i1},\ldots,\alpha_{iT},
\]

满足

\[
\alpha_{ij}\ge0,\qquad
\sum_j\alpha_{ij}=1.
\]

输出：

\[
o_i
=
\sum_j\alpha_{ij}v_j.
\]

矩阵形式：

\[
\boxed{
O=
\operatorname{softmax}
\left(
\frac{QK^\top}{\sqrt{d_k}}+M
\right)V
}
\]

这才是完整 Scaled Dot-Product Attention。

### 9. 两 token 手算

令：

\[
q=(1,0),
\]

\[
k_1=(1,0),\qquad k_2=(0,1).
\]

点积：

\[
q^\top k_1=1,\qquad q^\top k_2=0.
\]

若 \(d_k=2\)，scaled logits：

\[
(1/\sqrt2,0).
\]

Softmax 约：

\[
(0.67,0.33).
\]

若：

\[
v_1=(2,0),\qquad v_2=(0,3),
\]

则：

\[
o
\approx
0.67(2,0)+0.33(0,3)
=
(1.34,0.99).
\]

Attention 因此不是“挑一个 token”，而是 data-dependent weighted combination。

## 10. Multi-Head Attention

第 \(h\) 个 head：

\[
Q_h=XW_Q^{(h)},\quad
K_h=XW_K^{(h)},\quad
V_h=XW_V^{(h)}.
\]

\[
O_h=\operatorname{Attention}(Q_h,K_h,V_h).
\]

拼接：

\[
O_{\rm cat}
=
\operatorname{Concat}(O_1,\ldots,O_H),
\]

再：

\[
Y=O_{\rm cat}W_O.
\]

更准确的直觉是：

> 多头允许模型在不同可学习投影子空间中并行形成不同匹配与读取模式。

## 11. 复杂度

QK 与 AV 的主要算术量：

\[
O(BHT^2D_h)
=
O(BT^2D).
\]

显式 attention matrix 具有：

\[
O(BHT^2)
\]

memory 量级。

FlashAttention 优化 IO 与中间矩阵 materialization，不把 exact dense attention 的 \(T^2\) 算术阶变成线性。

## 12. PyTorch

```python
import math
import torch

def scaled_dot_product_attention(q, k, v, mask=None):
    # q/k/v: [B, H, T, Dh]
    scores = q @ k.transpose(-1, -2)
    scores = scores / math.sqrt(q.size(-1))

    if mask is not None:
        scores = scores.masked_fill(
            ~mask,
            float("-inf"),
        )

    weights = torch.softmax(
        scores,
        dim=-1,
    )

    return weights @ v
```

数学与代码一一对应：

\[
QK^\top
\leftrightarrow
\texttt{q @ k.transpose(-1,-2)}
\]

\[
1/\sqrt{d_k}
\leftrightarrow
\texttt{/ math.sqrt(q.size(-1))}
\]

## 13. 常见误区

**“Attention 只做 token mixing，FFN 只做 channel mixing”**  
作为粗直觉可以，但 Q/K/V/O projection 本身也在特征维做通道混合。Attention 独特之处是跨 token 的 data-dependent communication。

**“除 \(\sqrt{d_k}\) 是为了避免 overflow”**  
主要是统计尺度；overflow 主要靠 stable softmax。

**“Attention weight 就是因果解释”**  
不成立。内部权重不自动等于因果贡献。

### 14. 面试追问

1. 为什么 Q/K/V 使用不同 projection？
2. 为什么除 \(\sqrt{d_k}\) 而不是 \(d_k\)？
3. Mask 为什么必须在 softmax 前作用？
4. causal mask 为什么允许训练时并行计算所有位置？
5. Attention complexity 怎样推？
6. FlashAttention 是否改变数学 attention 结果？
7. Attention 与 FFN 的职责如何更精确地区分？

<!-- INTERACTIVE:
Attention heatmap；d_k scale 实验；causal mask toggle。
-->

## References

- Vaswani et al., *Attention Is All You Need*.
