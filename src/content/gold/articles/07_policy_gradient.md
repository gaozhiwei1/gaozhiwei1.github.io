---
id: posttraining.rl.policy-gradient
title: Policy Gradient：从期望奖励一步一步推到 Advantage × ∇logπ
level: gold
estimated_minutes: 50
code_challenge_id: policy-gradient-loss
---

# Policy Gradient：从期望奖励一步一步推到 Advantage × ∇logπ

## 1. 从 SFT 无法直接解决的问题开始

在 SFT 中，训练数据直接告诉模型目标 token 是什么。对一个目标序列 \(y^\star\)，最基本的损失是

\[
\mathcal L_{\mathrm{SFT}}
=-\log\pi_\theta(y^\star\mid x).
\]

但 RL 场景往往只告诉模型“这个完整回答得了多少分”，例如 reward model、数学 verifier 或单元测试给出

\[
R(y).
\]

这里没有逐 token 的标准答案。我们真正想做的是：**改变模型分布，使高 reward 的序列更容易被采出来。** 因此目标自然写成

\[
\boxed{
J(\theta)
=
\mathbb E_{y\sim\pi_\theta(\cdot\mid x)}[R(y)].
}
\]

一般 RL 中，把完整生成过程写成 trajectory

\[
\tau=(s_0,a_0,s_1,a_1,\ldots,s_T),
\]

其中 LLM 可以对应为：\(s_t\) 是 prompt 加当前 prefix，\(a_t\) 是下一个 token。于是目标变成

\[
J(\theta)=\mathbb E_{\tau\sim p_\theta(\tau)}[R(\tau)].
\]

## 2. 为什么最终会出现 \(\nabla\log\pi\)？

先把期望写开：

\[
J(\theta)
=
\int p_\theta(\tau)R(\tau)\,d\tau.
\]

对参数求梯度：

\[
\nabla_\theta J
=
\int \nabla_\theta p_\theta(\tau)R(\tau)\,d\tau.
\]

此时不能直接用 rollout 估计，因为积分权重是 \(\nabla p_\theta\)，不是概率 \(p_\theta\)。使用 log-derivative identity

\[
\nabla_\theta p_\theta(\tau)
=
p_\theta(\tau)\nabla_\theta\log p_\theta(\tau),
\]

得到

\[
\nabla_\theta J
=
\int
p_\theta(\tau)
R(\tau)
\nabla_\theta\log p_\theta(\tau)
\,d\tau.
\]

现在重新变成了关于 trajectory distribution 的期望：

\[
\boxed{
\nabla_\theta J
=
\mathbb E_{\tau\sim p_\theta}
\left[
R(\tau)\nabla_\theta\log p_\theta(\tau)
\right].
}
\]

这一步解释了最核心的结构：reward 不需要可微；只要我们能计算采样 trajectory 在 policy 下的 log-probability，就能得到梯度信号。

## 3. 为什么环境 dynamics 最后会消失？

Trajectory probability 可以分解为

\[
p_\theta(\tau)
=
\rho(s_0)
\prod_{t=0}^{T-1}
\pi_\theta(a_t\mid s_t)
P(s_{t+1}\mid s_t,a_t).
\]

取对数：

\[
\log p_\theta(\tau)
=
\log\rho(s_0)
+
\sum_t\log\pi_\theta(a_t\mid s_t)
+
\sum_t\log P(s_{t+1}\mid s_t,a_t).
\]

如果环境初始分布 \(\rho\) 和 transition dynamics \(P\) 不由 policy 参数 \(\theta\) 控制，那么

\[
\nabla_\theta\log\rho(s_0)=0,
\qquad
\nabla_\theta\log P(s_{t+1}\mid s_t,a_t)=0.
\]

所以只剩

\[
\boxed{
\nabla_\theta\log p_\theta(\tau)
=
\sum_t
\nabla_\theta\log\pi_\theta(a_t\mid s_t).
}
\]

代回去：

\[
\nabla_\theta J
=
\mathbb E\left[
R(\tau)
\sum_t
\nabla_\theta\log\pi_\theta(a_t\mid s_t)
\right].
\]

注意，这并不是说“环境不重要”。环境决定了哪些 trajectory 会出现以及 reward 是什么；只是求 policy 参数梯度时，不需要对未知 dynamics 本身求导。

## 4. 为什么从整条 Return 走到 Reward-to-Go？

如果把整条 trajectory return 都乘给每个时间步，那么时刻 \(t\) 的 action 也会被发生在它之前的 reward 加权。但过去已经发生的 reward 不可能由当前 action 导致，因此这些项只增加噪声。

定义从 \(t\) 开始的 reward-to-go：

\[
G_t
=
\sum_{k=t}^{T-1}
\gamma^{k-t}r_k.
\]

于是可以写成经典 REINFORCE 形式

\[
\nabla_\theta J
=
\mathbb E\left[
\sum_t
G_t
\nabla_\theta\log\pi_\theta(a_t\mid s_t)
\right].
\]

这已经可以训练，但通常方差很大。原因是 \(G_t\) 同时混合了“当前 action 好不好”和“这个 state 本来就容易还是困难”。

## 5. Baseline 为什么能减方差，却不改变期望？

我们希望从 \(G_t\) 中减去一个只依赖 state 的 baseline \(b(s_t)\)。关键是证明

\[
\mathbb E_{a_t\sim\pi_\theta(\cdot\mid s_t)}
\left[
b(s_t)\nabla_\theta\log\pi_\theta(a_t\mid s_t)
\right]
=0.
\]

因为 \(b(s_t)\) 与当前 action 的求和无关，

\[
=
b(s_t)
\sum_a
\pi_\theta(a\mid s_t)
\nabla_\theta\log\pi_\theta(a\mid s_t).
\]

利用 \(\pi\nabla\log\pi=\nabla\pi\)：

\[
=
b(s_t)
\sum_a
\nabla_\theta\pi_\theta(a\mid s_t)
=
b(s_t)
\nabla_\theta
\sum_a\pi_\theta(a\mid s_t).
\]

而概率总和为 1，所以

\[
=
b(s_t)\nabla_\theta1=0.
\]

因此

\[
\mathbb E[(G_t-b(s_t))\nabla\log\pi]
=
\mathbb E[G_t\nabla\log\pi].
\]

这就是 baseline 不引入该项 bias 的根本原因。

## 6. 从 \(Q\)、\(V\) 到 Advantage

定义 action value

\[
Q^\pi(s,a)
=
\mathbb E[G_t\mid s_t=s,a_t=a],
\]

state value

\[
V^\pi(s)
=
\mathbb E_{a\sim\pi(\cdot\mid s)}[Q^\pi(s,a)],
\]

于是 advantage 定义为

\[
\boxed{
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s).
}
\]

它不是“这个 action 的 reward”，而是“这个 action 比当前 state 下 policy 的平均选择好多少”。

还能直接验证

\[
\mathbb E_{a\sim\pi(\cdot\mid s)}[A^\pi(s,a)]
=
\mathbb E_a[Q^\pi(s,a)]-V^\pi(s)
=0.
\]

因此最终常见的 policy-gradient 形式是

\[
\boxed{
\nabla_\theta J
=
\mathbb E
\left[
A_t
\nabla_\theta\log\pi_\theta(a_t\mid s_t)
\right].
}
\]

实际训练中使用的是估计量 \(\hat A_t\)。如果 \(\hat A_t>0\)，提高当前 action 的 log-prob 会增加目标；如果 \(\hat A_t<0\)，则应降低它。

### 一个两动作例子

假设

\[
\pi(a_1\mid s)=0.6,
\qquad
\pi(a_2\mid s)=0.4,
\]

并且

\[
Q(s,a_1)=3,
\qquad
Q(s,a_2)=1.
\]

则

\[
V(s)=0.6\times3+0.4\times1=2.2.
\]

所以

\[
A(s,a_1)=0.8,
\qquad
A(s,a_2)=-1.2.
\]

同时

\[
0.6(0.8)+0.4(-1.2)=0,
\]

正好体现 advantage 在当前 policy 下以 0 为中心。

## 7. LLM 中真正棘手的是 Credit Assignment

如果一个 reasoning response 只有最终结果 reward，可能出现

\[
r_0=r_1=\cdots=r_{T-2}=0,
\qquad
r_{T-1}=R.
\]

这时一整串 token 都共享一个很晚才出现的 outcome signal。模型知道“整条回答成功/失败”，但不知道具体哪一步推理真正贡献了结果。

这也是为什么后面会出现 value model、GAE、process reward、verifier 等工具：它们都在试图让 credit assignment 更可用，而不是改变 policy-gradient 的基本数学身份。

最基本的 PyTorch loss 可以写成：

```python
def policy_gradient_loss(log_probs, advantages, mask=None):
    per_token = -(advantages.detach() * log_probs)

    if mask is not None:
        per_token = per_token * mask
        return per_token.sum() / mask.sum().clamp_min(1)

    return per_token.mean()
```

为什么是负号？因为理论上最大化 \(J\)，而常见优化器执行 gradient descent。

## 8. 为什么有了 Policy Gradient 还需要 PPO？

到这里，理论上已经能更新策略，但工程上仍有三个问题：

- \(\hat A_t\) 的 variance 可能很大；
- rollout 来自某个旧 policy，而参数更新后分布已经改变；
- rollout 很昂贵，希望同一批数据能做多个 minibatch/epoch。

这三件事自然把我们带到下一条链：

\[
\text{Advantage/GAE}
\rightarrow
\text{Importance Ratio}
\rightarrow
\text{PPO Clipping}.
\]

面试时最重要的不是背最终公式，而是能解释这条因果链：**为什么从期望 reward 出发，会依次需要 score-function、baseline、advantage，再走到 old-policy correction。**

<!-- INTERACTIVE:
Two-action policy：拖动 pi(a1), Q1, Q2，实时显示 V、A1、A2，以及提高/降低每个 action log-prob 的方向。
-->
