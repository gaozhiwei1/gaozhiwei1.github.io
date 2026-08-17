---
id: posttraining.dpo.derivation
title: DPO：从 KL 正则化 RLHF 推到 Pairwise Logistic Loss
level: gold
estimated_minutes: 55
code_challenge_id: dpo-loss
---

# DPO：从 KL 正则化 RLHF 推到 Pairwise Logistic Loss

## 1. DPO 的最终 Loss 为什么会长成 log-prob difference？

DPO 最终常写成

\[
-\log\sigma(\text{policy log-ratio}-\text{reference log-ratio}).
\]

如果只背这一行，很难解释 reference model、\(\beta\) 和 preference pair 为什么会以这种方式组合。DPO 的推导实际上从一个非常标准的 KL-regularized RLHF 目标开始。

对固定 prompt \(x\)，考虑策略 \(\pi(y\mid x)\) 的目标

\[
\max_\pi
\left\{
\mathbb E_{y\sim\pi(\cdot\mid x)}[r(x,y)]
-
\beta
D_{\mathrm{KL}}
(\pi(\cdot\mid x)\Vert\pi_{\mathrm{ref}}(\cdot\mid x))
\right\}.
\]

这里第一项希望高 reward response 获得更多概率；第二项要求策略不要为了 reward 无限制偏离 reference model。

## 2. 先求这个 KL 正则化问题的最优策略

固定 \(x\) 后省略条件符号，目标可以写成

\[
J(\pi)
=
\sum_y\pi(y)r(y)
-
\beta
\sum_y\pi(y)
\log\frac{\pi(y)}{\pi_{\mathrm{ref}}(y)},
\]

同时满足概率归一化约束

\[
\sum_y\pi(y)=1.
\]

引入 Lagrange multiplier \(\lambda\)：

\[
\mathcal L
=
\sum_y\pi(y)r(y)
-
\beta\sum_y\pi(y)
\log\frac{\pi(y)}{\pi_{\mathrm{ref}}(y)}
+
\lambda\left(1-\sum_y\pi(y)\right).
\]

对某个 \(\pi(y)\) 求偏导。利用

\[
\frac{d}{du}[u\log u]=\log u+1,
\]

得到

\[
\frac{\partial\mathcal L}{\partial\pi(y)}
=
r(y)
-
\beta\left[
\log\frac{\pi(y)}{\pi_{\mathrm{ref}}(y)}+1
\right]
-
\lambda.
\]

令其为 0：

\[
r(y)
-
\beta\log\frac{\pi(y)}{\pi_{\mathrm{ref}}(y)}
-
\beta-
\lambda=0.
\]

整理：

\[
\log\frac{\pi(y)}{\pi_{\mathrm{ref}}(y)}
=
\frac{r(y)}{\beta}
-
\frac{\beta+\lambda}{\beta}.
\]

后一项对同一个 prompt 的所有 response 都相同，因此可以吸收到归一化常数 \(Z(x)\) 中。于是最优策略满足

\[
\boxed{
\pi^*(y\mid x)
=
\frac{1}{Z(x)}
\pi_{\mathrm{ref}}(y\mid x)
\exp\left(\frac{r(x,y)}{\beta}\right).
}
\]

这条式子非常有直觉：最优策略是在 reference distribution 上，按 exponentiated reward 重新加权。

## 3. 反解 Reward：DPO 最关键的一步

从上式出发：

\[
\frac{\pi^*(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}
=
\frac1{Z(x)}
\exp\left(\frac{r(x,y)}{\beta}\right).
\]

取 log：

\[
\log\frac{\pi^*(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}
=
\frac{r(x,y)}{\beta}
-
\log Z(x).
\]

所以 reward 可以写成

\[
\boxed{
r(x,y)
=
\beta
\log\frac{\pi^*(y\mid x)}{\pi_{\mathrm{ref}}(y\mid x)}
+
\beta\log Z(x).
}
\]

这就是常说的 implicit reward。注意它并不是说“policy 本身就是一个显式 reward model”；而是说在这个理想化 KL-regularized optimum 下，reward 与 optimal-policy/reference-policy 的 log ratio 存在这种等价参数化。

## 4. 为什么 Preference Pair 会让未知的 \(Z(x)\) 自动消失？

Preference 数据给出同一个 prompt 下

\[
y_w\succ y_l,
\]

其中 \(y_w\) 是 chosen，\(y_l\) 是 rejected。

Bradley-Terry 模型把 reward difference 映射为偏好概率：

\[
P(y_w\succ y_l\mid x)
=
\frac{e^{r_w}}{e^{r_w}+e^{r_l}}
=
\sigma(r_w-r_l).
\]

把 implicit reward 代入：

\[
r_w
=
\beta\log\frac{\pi^*_w}{\pi_{\mathrm{ref},w}}
+
\beta\log Z(x),
\]

\[
r_l
=
\beta\log\frac{\pi^*_l}{\pi_{\mathrm{ref},l}}
+
\beta\log Z(x).
\]

因为 chosen 和 rejected 属于同一个 prompt，\(\log Z(x)\) 完全相同，所以相减时消失：

\[
r_w-r_l
=
\beta
\left[
\log\frac{\pi^*_w}{\pi_{\mathrm{ref},w}}
-
\log\frac{\pi^*_l}{\pi_{\mathrm{ref},l}}
\right].
\]

这一步是 DPO 非常漂亮的地方：我们不需要显式求出 partition function \(Z(x)\)。

## 5. 把 \(\pi^*\) 换成正在训练的 \(\pi_\theta\)

定义 chosen 相对 reference 的变化

\[
\Delta_w
=
\log\pi_\theta(y_w\mid x)
-
\log\pi_{\mathrm{ref}}(y_w\mid x),
\]

以及 rejected 的相对变化

\[
\Delta_l
=
\log\pi_\theta(y_l\mid x)
-
\log\pi_{\mathrm{ref}}(y_l\mid x).
\]

DPO 真正关心的是 margin

\[
m_\theta=\Delta_w-\Delta_l.
\]

于是模型预测 chosen 胜出的概率为

\[
P_\theta(y_w\succ y_l\mid x)
=
\sigma(\beta m_\theta).
\]

对偏好标签做最大似然，就得到

\[
\boxed{
\mathcal L_{\mathrm{DPO}}
=
-\log\sigma\left(
\beta
\left[
\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\mathrm{ref}}(y_w\mid x)}
-
\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\mathrm{ref}}(y_l\mid x)}
\right]
\right).
}
\]

所以 reference model 不是装饰。没有它，优化就退化成只扩大 current policy 的 raw chosen/rejected gap，而不再表达“相对原模型改变了多少”。

## 6. \(\beta\) 和 Gradient 怎么理解？

令

\[
z=\beta m_\theta,
\]

单样本 loss 是

\[
L=-\log\sigma(z).
\]

对 \(z\) 求导：

\[
\frac{dL}{dz}
=-\sigma(-z).
\]

因此

\[
\boxed{
\frac{dL}{dm_\theta}
=
-\beta\sigma(-\beta m_\theta).
}
\]

当 margin 很差、\(m_\theta\ll0\) 时，\(\sigma(-\beta m)\) 接近 1，更新较强；当 chosen 已经相对 rejected 占据很大优势时，gradient 会逐渐衰减。

\(\beta\) 来自原始 reward-vs-KL tradeoff 的推导，同时也缩放 logistic margin。它不是 optimizer learning rate。

## 7. 一个数值例子：看的是“相对 reference 的偏好变化”

假设当前策略

\[
\log\pi_\theta(y_w)=-2.0,
\qquad
\log\pi_\theta(y_l)=-3.0,
\]

reference 为

\[
\log\pi_{\mathrm{ref}}(y_w)=-2.4,
\qquad
\log\pi_{\mathrm{ref}}(y_l)=-2.8.
\]

则

\[
\Delta_w=-2.0-(-2.4)=0.4,
\]

\[
\Delta_l=-3.0-(-2.8)=-0.2,
\]

所以

\[
m=0.4-(-0.2)=0.6.
\]

若 \(\beta=0.1\)，

\[
z=0.06,
\qquad
\sigma(z)\approx0.515,
\]

因此

\[
L\approx-\log0.515\approx0.663.
\]

这里 raw chosen log-prob 本来就高于 rejected，但 DPO 仍然比较它们**相对于 reference 各自移动了多少**。

Response log-prob 本身通常是有效 assistant token 的和：

\[
\log\pi_\theta(y\mid x)
=
\sum_{t=1}^{T}
\log\pi_\theta(y_t\mid x,y_{<t}).
\]

因此 length handling 会影响数值尺度，工程实现必须明确 masking 与 reduction 方式。

## 8. 代码、PPO 对比与常见误区

最小实现：

```python
import torch.nn.functional as F

def dpo_loss(
    pi_chosen_logps,
    pi_rejected_logps,
    ref_chosen_logps,
    ref_rejected_logps,
    beta=0.1,
):
    pi_gap = pi_chosen_logps - pi_rejected_logps
    ref_gap = ref_chosen_logps - ref_rejected_logps
    logits = beta * (pi_gap - ref_gap)
    return -F.logsigmoid(logits).mean()
```

DPO 与 PPO-based RLHF 最关键的区别不在“公式谁更短”，而在数据闭环：DPO 使用离线 preference pairs，把理想化 KL-regularized RLHF 关系转成 supervised-style pairwise classification objective；PPO 则在线/近在线地产生 rollout、估计 advantage 并更新 policy。

容易答错的点包括：

- “DPO 完全没有 reward model 概念”过于粗糙，更准确是无需显式训练一个独立 RM 后再跑 PPO；
- \(\beta\) 不是 learning rate；
- DPO 主要约束 pairwise relative margin，不保证每个 chosen response 的绝对 log-prob 都单调上升；
- reference mismatch、preference noise 和 response length bias 都可能影响训练。

面试时应该能够从 KL-regularized objective 开始，至少推到 \(\pi^*\propto\pi_{\mathrm{ref}}e^{r/\beta}\)，再解释为什么 \(Z(x)\) 在同 prompt 的 preference difference 中消失。

<!-- INTERACTIVE:
四个 slider 分别控制 pi_w、pi_l、ref_w、ref_l 的 log-prob，再用 beta slider 实时显示 Delta_w、Delta_l、margin、sigmoid preference probability 与 DPO loss。
-->
