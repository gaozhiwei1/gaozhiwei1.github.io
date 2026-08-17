---
id: math.probability.entropy-crossentropy-kl
title: Cross-Entropy 与 KL：为什么语言模型训练最后变成负对数概率？
level: gold
estimated_minutes: 25
code_challenge_id: cross-entropy
---

# Cross-Entropy 与 KL：为什么语言模型训练最后变成负对数概率？

## 1. 为什么先学这个？

语言模型输出的是词表上的离散分布

\[
q_\theta(y\mid x),
\]

其中 \(x\) 是上下文，\(y\) 是下一个 token，\(\theta\) 是模型参数。训练的核心问题是：模型分布 \(q_\theta\) 与目标分布 \(p\) 相差多少？

Cross-Entropy、Negative Log-Likelihood 与 KL divergence 是同一条数学链上的三个视角。

### 2. 数学前置与符号

设词表大小为 \(V\)：

\[
p=(p_1,\ldots,p_V),\qquad q=(q_1,\ldots,q_V),
\]

满足

\[
p_i\ge0,\quad q_i>0,\quad \sum_i p_i=\sum_iq_i=1.
\]

- \(p\)：目标/数据分布
- \(q\)：模型分布

## 3. Entropy：分布自身有多不确定？

\[
H(p)=-\sum_{i=1}^V p_i\log p_i.
\]

Entropy 只依赖 \(p\)，它不是模型误差。分布越均匀，不确定性通常越高；越集中，熵越低。

### 4. Cross-Entropy：用模型分布解释真实数据的代价

\[
H(p,q)=-\sum_i p_i\log q_i.
\]

如果真实分布经常出现的位置被模型赋予很小的 \(q_i\)，那么 \(-\log q_i\) 很大，因此损失增加。

## 5. KL 从哪里来？

定义

\[
D_{\mathrm{KL}}(p\Vert q)
=
\sum_i p_i\log\frac{p_i}{q_i}.
\]

展开：

\[
D_{\mathrm{KL}}(p\Vert q)
=
\sum_i p_i\log p_i-\sum_i p_i\log q_i.
\]

利用

\[
\sum_i p_i\log p_i=-H(p),
\]

以及

\[
-\sum_i p_i\log q_i=H(p,q),
\]

得到

\[
\boxed{
H(p,q)=H(p)+D_{\mathrm{KL}}(p\Vert q)
}
\]

当训练数据固定时，\(H(p)\) 对 \(\theta\) 是常数，因此

\[
\arg\min_\theta H(p,q_\theta)
=
\arg\min_\theta D_{\mathrm{KL}}(p\Vert q_\theta).
\]

## 6. 为什么 one-hot target 让 CE 变成 \(-\log q_y\)？

单个监督样本的目标分布：

\[
p_i=
\begin{cases}
1,&i=y,\\
0,&i\ne y.
\end{cases}
\]

所以

\[
H(p,q)
=
-\sum_i p_i\log q_i
=
-\log q_y.
\]

因此单 token cross-entropy 就是正确 token 的 Negative Log-Likelihood：

\[
\boxed{\mathcal L=-\log q_y}
\]

## 7. 从 logits 推到 stable cross-entropy

模型输出 logits \(z\)：

\[
q_i=\frac{e^{z_i}}{\sum_j e^{z_j}}.
\]

于是

\[
\mathcal L
=
-\log q_y
=
-z_y+\log\sum_j e^{z_j}.
\]

定义

\[
m=\max_j z_j,
\]

则

\[
\log\sum_j e^{z_j}
=
m+\log\sum_j e^{z_j-m}.
\]

因此

\[
\boxed{
\mathcal L
=
m+\log\sum_j e^{z_j-m}-z_y
}
\]

由于 \(z_j-m\le0\)，指数计算更稳定。

## 8. 为什么 gradient 恰好是“预测概率 - one-hot”？

从

\[
\mathcal L=-z_y+\log\sum_j e^{z_j}
\]

对任意 \(z_k\) 求导：

\[
\frac{\partial(-z_y)}{\partial z_k}
=
-\mathbf 1[k=y],
\]

而

\[
\frac{\partial}{\partial z_k}\log\sum_j e^{z_j}
=
\frac{e^{z_k}}{\sum_j e^{z_j}}
=
q_k.
\]

所以

\[
\boxed{
\frac{\partial\mathcal L}{\partial z_k}
=
q_k-\mathbf1[k=y]
}
\]

向量形式：

\[
\boxed{\nabla_z\mathcal L=q-p}
\]

这直接解释了训练方向：

- 正确类：\(q_y-1<0\)，梯度下降会提高 \(z_y\)
- 错误类：\(q_k>0\)，梯度下降会降低 \(z_k\)

### 9. 数值例子

真实类别为第 1 类，预测：

\[
q=(0.7,0.2,0.1).
\]

loss：

\[
-\log0.7\approx0.357.
\]

gradient：

\[
q-p=(-0.3,0.2,0.1).
\]

若正确类概率只有 \(0.1\)：

\[
-\log0.1\approx2.303.
\]

所以 \(-\log\) 会强烈惩罚“对真实 token 极不自信”的预测。

## 10. 语言模型 sequence loss

自回归分解：

\[
p_\theta(x_{1:T})
=
\prod_{t=1}^{T}p_\theta(x_t\mid x_{<t}).
\]

取 log：

\[
\log p_\theta(x_{1:T})
=
\sum_t\log p_\theta(x_t\mid x_{<t}).
\]

因此 NLL：

\[
-\log p_\theta(x_{1:T})
=
-\sum_t\log p_\theta(x_t\mid x_{<t}).
\]

语言模型训练就是对有效目标 token 的 NLL 求和/平均。

## 11. PyTorch 对应

```python
import torch

def cross_entropy_from_logits(logits, target):
    # logits: [B, V], target: [B]
    m = logits.max(dim=-1, keepdim=True).values
    logsumexp = (
        m.squeeze(-1)
        + torch.log(torch.exp(logits - m).sum(dim=-1))
    )
    target_logit = logits.gather(
        1, target[:, None]
    ).squeeze(1)
    return (logsumexp - target_logit).mean()
```

真实工程优先使用：

```python
torch.nn.functional.cross_entropy(logits, target)
```

## 12. 常见误区

**Cross-Entropy 就是 KL？**  
不完全。\(H(p,q)=H(p)+D_{\mathrm{KL}}(p\Vert q)\)。目标分布固定时，两者对模型优化只差常数。

**KL 是距离？**  
不是。一般不对称，也不满足三角不等式。

**先 softmax 再 log 更直观，所以工程上也应该这么写？**  
不建议。fused `cross_entropy` / `log_softmax` 更稳定。

**Perplexity 可以跨 tokenizer 直接比较？**  
通常不能，不同 tokenizer 改变了“每个 token”的单位。

### 13. 面试追问

1. 为什么 one-hot cross-entropy 变成 \(-\log p_y\)？
2. 推导 softmax-cross-entropy gradient。
3. 为什么减最大 logit 不改变 softmax？
4. Forward KL 与 reverse KL 的直觉有什么不同？
5. Label smoothing 会怎样改变 \(p\) 与 gradient？
6. 为什么 LM sequence NLL 可以拆成 token NLL？

<!-- INTERACTIVE:
三个 logits slider，实时显示 softmax、CE 和 q-p gradient。
-->
