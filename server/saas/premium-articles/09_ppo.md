---
id: posttraining.ppo.clipping
title: PPO：从 Importance Ratio 到 Clipped Objective 的完整推导
level: gold
estimated_minutes: 55
code_challenge_id: ppo-clipped-objective
---

# PPO：从 Importance Ratio 到 Clipped Objective 的完整推导

## 1. PPO 真正要解决的是“旧数据上的过度更新”

Policy Gradient 告诉我们，理想更新方向可以写成

\[
\nabla_\theta J
=
\mathbb E_{(s_t,a_t)\sim\pi_\theta}
\left[
A_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)
\right].
\]

但真实训练不会每更新一次参数就重新生成整批昂贵 rollout。通常先用某个策略快照

\[
\pi_{\mathrm{old}}
\]

采集数据，然后在这批数据上做若干 minibatch 和 epoch。问题随之出现：第一次更新后，当前策略已经变成 \(\pi_\theta\)，而样本仍来自 \(\pi_{\mathrm{old}}\)。

因此 PPO 的起点不是 clipping，而是一个 distribution mismatch：**怎样在 old-policy data 上近似更新 current policy，同时不让 current policy 离这批数据的行为分布太远？**

## 2. Importance Ratio 为什么自然出现？

对同一个 state-action pair，定义

\[
\boxed{
r_t(\theta)
=
\frac{\pi_\theta(a_t\mid s_t)}
{\pi_{\mathrm{old}}(a_t\mid s_t)}.
}
\]

它不是 reward，而是概率变化倍率：

- \(r_t=1\)：这个 action 的概率与 rollout 时一样；
- \(r_t>1\)：当前策略更偏好它；
- \(r_t<1\)：当前策略降低了它的概率。

从 importance sampling 的角度，它是在把 old-policy samples 重新加权到 current policy。工程里不会直接计算两个可能极小的概率再相除，而是用

\[
\log r_t
=
\log\pi_\theta(a_t\mid s_t)
-
\log\pi_{\mathrm{old}}(a_t\mid s_t),
\]

所以

\[
r_t
=
\exp(\log\pi_\theta-\log\pi_{\mathrm{old}}).
\]

最直接的 surrogate objective 因此写成

\[
\boxed{
L^{\mathrm{PG}}(\theta)
=
\mathbb E[r_t(\theta)A_t].
}
\]

在 \(\theta=\theta_{\mathrm{old}}\) 附近有 \(r_t=1\)，这个 surrogate 的局部梯度与 policy-gradient 方向一致。

## 3. 为什么只优化 \(r_tA_t\) 会失控？

先看 \(A_t>0\)。这表示 rollout 中的 action 比 baseline 好。最大化

\[
r_tA_t
\]

会希望不断增大 \(r_t\)，也就是不断提高这个 action 的概率。

但 \(A_t\) 是根据 old rollout 和旧 critic 信息估计出来的。当 \(r_t\) 已经离 1 很远时，我们实际上在用一份越来越过时的数据继续推动策略。Importance weighting 理论上可以校正分布，但权重越极端，variance 和 effective sample quality 越糟。

所以 PPO 采用一个非常朴素的策略：当 surrogate 正在沿着“有利方向”改善得太多时，不再奖励额外改善。

定义裁剪后的 ratio

\[
\bar r_t
=
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon),
\]

最终使用

\[
\boxed{
L_t^{\mathrm{clip}}
=
\min\left(
r_tA_t,
\bar r_tA_t
\right).
}
\]

这里最容易误解的是 `min`。它不是“因为代码最终要最小化 loss，所以取最小值”。论文里的 \(L^{\mathrm{clip}}\) 本来是一个**要最大化的 surrogate objective**；`min` 的作用是取更保守、pessimistic 的那一项。

## 4. 为什么 Advantage 的正负会让 clipping 方向反过来？

### 当 \(A_t>0\)

正数乘法不改变大小关系：

\[
\min(rA,\bar rA)
=
A\min(r,\bar r).
\]

如果

\[
r>1+\epsilon,
\]

则

\[
\bar r=1+\epsilon<r,
\]

所以 objective 被截在

\[
(1+\epsilon)A.
\]

继续增加一个“好 action”的概率不再带来额外 surrogate gain。

但如果 \(A>0\) 且 \(r<1-\epsilon\)，说明本来是好 action，当前策略却把它概率降得太多。这是错误方向，PPO **不会**因为 ratio 出界就把梯度一刀切掉；它仍保留纠正信号。

### 当 \(A_t<0\)

负数乘法会反转大小关系：

\[
\min(rA,\bar rA)
=
A\max(r,\bar r).
\]

如果

\[
r<1-\epsilon,
\]

说明坏 action 的概率已经被压低很多。此时

\[
\bar r=1-\epsilon>r,
\]

但因为 \(A<0\)，

\[
(1-\epsilon)A<rA,
\]

`min` 会选择 clipped 项，从而不再奖励继续把这个 action 压得更低。

反过来，如果 \(A<0\) 但 \(r>1+\epsilon\)，说明坏 action 概率反而被提高，这是错误方向，PPO 仍保留强烈纠正梯度。

因此正确的四象限是：

| Advantage | Ratio | 是否进入平台区 | 含义 |
|---|---:|---|---|
| \(A>0\) | \(r>1+\epsilon\) | 是 | 好 action 提升过度 |
| \(A>0\) | \(r<1-\epsilon\) | 否 | 好 action 被错误压低，需要纠正 |
| \(A<0\) | \(r<1-\epsilon\) | 是 | 坏 action 已经压得足够低 |
| \(A<0\) | \(r>1+\epsilon\) | 否 | 坏 action 被错误提高，需要纠正 |

所以“ratio 一出 \([1-\epsilon,1+\epsilon]\) 就没梯度”是错误说法。

## 5. 三个手算例子把 `min` 一次搞懂

取

\[
\epsilon=0.2.
\]

### 好 action，概率提高过头

\[
A=2,
\qquad
r=1.3.
\]

未裁剪：

\[
rA=1.3\times2=2.6.
\]

裁剪后：

\[
\bar rA=1.2\times2=2.4.
\]

所以

\[
\min(2.6,2.4)=2.4.
\]

### 坏 action，概率反而提高

\[
A=-2,
\qquad
r=1.3.
\]

则

\[
rA=-2.6,
\qquad
\bar rA=-2.4.
\]

所以

\[
\min(-2.6,-2.4)=-2.6.
\]

没有进入平台区，因为这是错误方向，仍需要纠正。

### 坏 action，概率已经压得过低

\[
A=-2,
\qquad
r=0.6.
\]

则

\[
rA=-1.2,
\qquad
\bar rA=0.8(-2)=-1.6.
\]

所以

\[
\min(-1.2,-1.6)=-1.6.
\]

这次被截住，因为继续降低坏 action 概率不再获得额外 surrogate improvement。

## 6. PPO clipping 不是严格的 Trust Region

PPO 的 clip 只改变样本级 surrogate contribution。它并没有直接施加

\[
D_{\mathrm{KL}}(\pi_{\mathrm{old}}\Vert\pi_\theta)
\le c
\]

这样的严格约束，也不约束参数欧氏距离。

所以真实训练仍常监控：

- approximate KL；
- clip fraction；
- entropy；
- ratio distribution。

如果 approximate KL 迅速变大，即使 clip objective 仍能算，也说明当前 epoch 可能已经离 rollout policy 太远。

这里还要区分两个经常被混在一起的模型：

\[
\pi_{\mathrm{old}}
\]

是生成当前 rollout 的策略快照，用在 ratio 分母；而

\[
\pi_{\mathrm{ref}}
\]

通常是长期冻结的 SFT/reference model，用来通过 KL 抑制语言行为无界漂移。两者可能某个时刻参数相同，但职责完全不同。

## 7. PPO 训练通常还有 Critic、GAE 和 Reference KL

完整 RLHF 训练并不是只优化一项 clipped policy objective。概念上常见组合包括

\[
L_{\mathrm{policy}},
\qquad
L_V,
\qquad
H(\pi),
\qquad
D_{\mathrm{KL}}(\pi_\theta\Vert\pi_{\mathrm{ref}}).
\]

它们分别处理不同问题：

- GAE / critic：怎样得到低方差的 \(\hat A_t\)；
- clipped objective：怎样有限复用 old rollout 而不过度更新；
- entropy：怎样控制策略分布的尖锐程度；
- reference KL：怎样防止长期为了 reward 远离原语言模型。

一个最小 PyTorch 实现是：

```python
import torch

def ppo_clipped_objective(
    new_logprob,
    old_logprob,
    advantage,
    epsilon=0.2,
):
    ratio = torch.exp(new_logprob - old_logprob)

    unclipped = ratio * advantage
    clipped = (
        torch.clamp(ratio, 1 - epsilon, 1 + epsilon)
        * advantage
    )

    return torch.minimum(unclipped, clipped).mean()

# 优化器执行 gradient descent，所以取负号
loss = -ppo_clipped_objective(
    new_logprob,
    old_logprob,
    advantage.detach(),
)
```

`advantage.detach()` 的意义是把 \(\hat A_t\) 当作 policy-gradient weighting signal，而不是让 policy loss 反向穿过 critic/advantage estimator 的计算图。

## 8. 面试时应该能回答的完整因果链

PPO 最重要的不是背

\[
\min(rA,\operatorname{clip}(r)A).
\]

而是能从下面这条链一路解释：

\[
\text{Policy Gradient}
\rightarrow
\text{old-policy rollout}
\rightarrow
\text{distribution mismatch}
\rightarrow
\text{importance ratio}
\rightarrow
\text{surrogate objective}
\rightarrow
\text{ratio 过度漂移}
\rightarrow
\text{pessimistic clipping}.
\]

高频追问通常是：为什么是 `min`；为什么 \(A<0\) 时方向反过来；clip 是否严格限制 KL；old policy 与 reference policy 的区别；以及为什么同一批 rollout 可以做几个 epoch、却不能无限复用。

<!-- INTERACTIVE:
画出 objective 对 ratio 的曲线。用 slider 控制 A、epsilon 和 r，并强制同时显示 A>0 与 A<0 两条曲线，让用户直观看到平台区只出现在“过度改善”的一侧。
-->
