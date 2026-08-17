---
id: posttraining.grpo.group-advantage
title: GRPO：从 Group-Relative Baseline 到 Clipped Policy Optimization
level: gold
estimated_minutes: 45
code_challenge_id: grpo-advantages
---

# GRPO：从 Group-Relative Baseline 到 Clipped Policy Optimization

## 1. GRPO 不是“PPO 随便删掉 Critic”

PPO 常通过 learned value model 估计

\[
V(s)
\]

再构造 advantage。对于长 reasoning LLM，这意味着额外的模型状态、训练显存、value fitting 和 credit-assignment 误差。

GRPO 的核心思路之一是：**同一个 prompt 一次采多个 response，让它们彼此形成局部 baseline。** 这样可以避免独立 learned critic，但仍然保留“相对好坏”这一 policy-gradient 所需要的信号。

## 2. 同一个 Prompt 为什么要采一组 Response？

给定 prompt \(x\)，从 rollout policy 采样

\[
y_1,\ldots,y_G
\sim
\pi_{\mathrm{old}}(\cdot\mid x),
\]

得到 reward

\[
r_1,\ldots,r_G.
\]

先计算组均值

\[
\bar r
=
\frac1G\sum_{i=1}^{G}r_i.
\]

中心化后的量

\[
r_i-\bar r
\]

回答的不是“这个 response 的绝对 reward 高不高”，而是“它相对同一道题这一组候选的平均水平好多少”。

这很重要，因为不同 prompt 的绝对难度可能差别很大。一个难题得 0.4 也许已经很优秀，一个简单题得 0.8 可能反而偏差。组内 baseline 在一定程度上把这种 prompt-level difficulty 抵消掉。

## 3. 为什么还要除以组内标准差？

定义 population-style 标准差

\[
\sigma_r
=
\sqrt{
\frac1G
\sum_i(r_i-\bar r)^2
}.
\]

典型 group-relative normalized advantage 为

\[
\boxed{
\hat A_i
=
\frac{r_i-\bar r}{\sigma_r+\epsilon}.
}
\]

中心化决定正负方向，标准化控制不同 prompt 的 reward scale。如果两道题 reward 差异范围分别是 \([0,1]\) 与 \([0,100]\)，不标准化时后者可能天然获得巨大 gradient weight。

同时

\[
\sum_i(r_i-\bar r)=0,
\]

所以忽略 \(\epsilon\) 时

\[
\sum_i\hat A_i\approx0.
\]

这正是“group mean 是 relative baseline”的数学体现。

## 4. 一个三样本例子

假设同一个 prompt 的 reward 是

\[
r=(1,2,3).
\]

均值为

\[
\bar r=2.
\]

方差

\[
\sigma_r^2
=
\frac{(1-2)^2+(2-2)^2+(3-2)^2}{3}
=
\frac23,
\]

所以

\[
\sigma_r\approx0.816.
\]

于是

\[
\hat A_1\approx-1.225,
\qquad
\hat A_2=0,
\qquad
\hat A_3\approx1.225.
\]

第三个 response 被强化，第一个被压低，中间 response 接近 group baseline。

如果所有 reward 都一样，

\[
r_1=\cdots=r_G=c,
\]

则

\[
r_i-\bar r=0,
\]

所有 advantage 都是 0。这意味着组内没有任何 preference information；即使采了很多 rollout，也没有策略学习方向。

## 5. Reward 的平移和正比例缩放为什么几乎不改变标准化 Advantage？

若 reward 变成

\[
r_i'=ar_i+b,
\qquad a>0,
\]

则

\[
\bar r'=a\bar r+b,
\]

因此

\[
r_i'-\bar r'
=
a(r_i-\bar r).
\]

标准差也变成

\[
\sigma_{r'}=a\sigma_r.
\]

忽略稳定项 \(\epsilon\)，

\[
\hat A_i'
=
\frac{a(r_i-\bar r)}{a\sigma_r}
=
\hat A_i.
\]

所以 normalized group advantage 对正 affine reward scaling 近似不变。这也是不同 reward components 被组合时值得理解的尺度性质。

## 6. 为什么 GRPO 仍然需要 Old Policy Ratio 和 Clipping？

Group relative 方法只改变了 advantage 从哪里来，并没有解决 rollout distribution mismatch。

Response 由

\[
\pi_{\mathrm{old}}
\]

生成，而训练过程中 current policy 变成

\[
\pi_\theta.
\]

所以 token-level ratio 仍然是

\[
\boxed{
r_{i,t}(\theta)
=
\frac{
\pi_\theta(y_{i,t}\mid x,y_{i,<t})
}{
\pi_{\mathrm{old}}(y_{i,t}\mid x,y_{i,<t})
}.
}
\]

典型策略项继续使用 PPO-style clipping：

\[
\min\left(
r_{i,t}\hat A_i,
\operatorname{clip}(r_{i,t},1-\epsilon_c,1+\epsilon_c)\hat A_i
\right).
\]

所以 PPO 中对正/负 advantage 的四象限分析仍然适用。GRPO 的区别主要是 \(\hat A\) 不再依赖独立 learned critic，而来自同 prompt 的 group-relative reward。

## 7. 为什么 Reference Policy 仍然可能需要？

Group advantage 只能告诉我们“同一组谁更好”，并不能保证策略不会为了 verifier reward 走向非常奇怪的分布。

因此 LLM RL 中还常用冻结 reference model，通过 KL 类正则限制长期漂移。再次区分：

- \(\pi_{\mathrm{old}}\)：产生当前 rollout 的 behavior snapshot，用在 importance ratio；
- \(\pi_{\mathrm{ref}}\)：长期语言行为锚点，通常冻结。

“没有 critic”不等于“没有 old policy、没有 reference、没有 baseline”。

## 8. Group Size 不是越大越好

增大 \(G\) 通常能：

- 更容易采到 reward 有差异的候选；
- 让组均值和标准差估计更稳定；
- 增加探索多样性。

但 rollout cost 近似随 \(G\) 增长：

\[
\text{sampling cost}\propto G.
\]

Reasoning response 很长时，这个代价可能比省掉 critic 更昂贵。因此 GRPO 的系统 tradeoff 不能只看“少了一个 value model”。

最小 group-advantage 实现：

```python
import torch

def grpo_advantages(rewards, eps=1e-6):
    # rewards: [B, G], 每一行属于同一个 prompt
    mean = rewards.mean(dim=1, keepdim=True)
    std = rewards.std(dim=1, keepdim=True, unbiased=False)
    return (rewards - mean) / (std + eps)
```

对应 policy term：

```python
def grpo_policy_term(new_logp, old_logp, advantage, clip_eps=0.2):
    ratio = torch.exp(new_logp - old_logp)
    unclipped = ratio * advantage
    clipped = torch.clamp(
        ratio,
        1 - clip_eps,
        1 + clip_eps,
    ) * advantage
    return torch.minimum(unclipped, clipped)
```

真实实现还必须明确 token mask、sequence reduction、reward normalization、KL estimator 等细节。

## 9. 面试时最应该区分 PPO、GRPO 和 DPO

把 GRPO 简化成“PPO 去掉 critic”只能算第一层记忆。更完整的说法是：

> GRPO 用同一个 prompt 的多条 rollout 构造 group-relative advantage，从而避免独立 learned value model；但它仍然是在线/rollout-based 的策略优化，因此 old-policy ratio、clipping 与 reference regularization 等结构仍然重要。

而 DPO 使用离线 preference pair 的 pairwise objective，不依赖这种同 prompt online group rollout 结构。

高频追问包括：全组 reward 相同时为什么没有学习信号；group size 增大有什么成本；reward affine scaling 为什么近似不改变 normalized advantage；以及 GRPO 为什么没有 critic 仍然存在 baseline。

<!-- INTERACTIVE:
给同一个 prompt 显示 G 根可拖动 reward bar，实时计算 mean、std、advantage；提供“全部 reward 相同”和“整体 +10 / ×5”按钮，直观看到中心化、标准化与零信号现象。
-->
