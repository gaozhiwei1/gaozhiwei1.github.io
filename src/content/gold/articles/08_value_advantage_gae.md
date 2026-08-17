---
id: posttraining.rl.value-advantage-gae
title: Return、V、Q、Advantage 与 GAE：把高方差回报变成可训练信号
level: gold
estimated_minutes: 45
code_challenge_id: gae
---

# Return、V、Q、Advantage 与 GAE：把高方差回报变成可训练信号

## 1. PPO 里的 \(\hat A_t\) 不是凭空来的

Policy Gradient 最终常写成

\[
\nabla_\theta J
=
\mathbb E[
\hat A_t
\nabla_\theta\log\pi_\theta(a_t\mid s_t)
].
\]

但真正难的部分恰恰藏在 \(\hat A_t\) 里：它既要告诉我们 action 是好还是坏，又不能因为 reward noise 太大而让梯度剧烈抖动。

从最直接的 return 开始。时刻 \(t\) 之后的 discounted return 是

\[
G_t
=
\sum_{l=0}^{T-t-1}
\gamma^l r_{t+l}.
\]

如果直接把 \(G_t\) 当作 action quality，虽然使用了真实未来 reward，但不同 state 的难度、随机性和长 horizon 噪声都会混在一起。

## 2. \(V\)、\(Q\) 和 Advantage 到底差在哪？

State value 定义为

\[
V^\pi(s)
=
\mathbb E_\pi[G_t\mid s_t=s],
\]

意思是：已经处在 state \(s\)，以后继续按 \(\pi\) 行动，平均还能拿到多少 return。

Action value 多指定当前 action：

\[
Q^\pi(s,a)
=
\mathbb E_\pi[G_t\mid s_t=s,a_t=a].
\]

二者满足

\[
V^\pi(s)
=
\mathbb E_{a\sim\pi(\cdot\mid s)}
[Q^\pi(s,a)].
\]

因此最自然的“相对 action quality”就是

\[
\boxed{
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s).
}
\]

它有一个很重要的中心化性质：

\[
\mathbb E_{a\sim\pi}[A^\pi(s,a)]
=
\mathbb E_a[Q^\pi(s,a)]-V^\pi(s)
=0.
\]

所以 advantage 衡量的是“比当前 policy 在这个 state 下的平均选择好多少”，而不是绝对 reward。

## 3. 最直接的 Advantage：Monte Carlo Return 减 Value

如果 trajectory 已经完整结束，可以用

\[
\hat A_t^{\mathrm{MC}}
=
G_t-V_\phi(s_t).
\]

这很直观：真实 return 减去 critic 对这个 state 的平均预测。

问题在于长 horizon 下 \(G_t\) 的 variance 很高。一个很早的 token 会受到后面大量随机事件共同影响，因此虽然信号真实，却可能太 noisy。

另一条路线是更多依赖 bootstrap，也就是借助下一状态 value 来构造短 horizon 估计。

## 4. TD Residual 为什么可以近似 Advantage？

Bellman 关系告诉我们

\[
Q^\pi(s_t,a_t)
=
\mathbb E[
r_t+\gamma V^\pi(s_{t+1})
\mid s_t,a_t
].
\]

因此定义一步 TD residual

\[
\boxed{
\delta_t
=
r_t
+
\gamma V_\phi(s_{t+1})
-
V_\phi(s_t).
}
\]

如果 critic 完全准确，即 \(V_\phi=V^\pi\)，那么

\[
\mathbb E[\delta_t\mid s_t,a_t]
=
Q^\pi(s_t,a_t)-V^\pi(s_t)
=
A^\pi(s_t,a_t).
\]

所以 \(\delta_t\) 可以理解为一个非常短 horizon 的 advantage estimator。

它的优点是 variance 较小；缺点是高度依赖 value estimate。如果 critic 有系统误差，bootstrap 会把误差带进来。

## 5. GAE 就是在“短 TD”和“长 Return”之间做连续插值

GAE 定义为未来 TD residual 的指数加权和：

\[
\boxed{
\hat A_t^{\mathrm{GAE}(\gamma,\lambda)}
=
\sum_{l=0}^{\infty}
(\gamma\lambda)^l
\delta_{t+l}.
}
\]

当 \(\lambda=0\) 时，

\[
\hat A_t=\delta_t,
\]

只看一步 TD，variance 低，但更依赖 critic。

随着 \(\lambda\) 增大，估计会吸收越来越长 horizon 的真实 reward 信息。直觉上，\(\lambda\) 是一个 bias-variance tradeoff knob，而不是“越接近 1 越好”。

### 为什么实现可以从后往前递推？

把级数前两项拆开：

\[
\hat A_t
=
\delta_t
+
\gamma\lambda\delta_{t+1}
+
(\gamma\lambda)^2\delta_{t+2}
+
\cdots
\]

而

\[
\hat A_{t+1}
=
\delta_{t+1}
+
\gamma\lambda\delta_{t+2}
+
\cdots
\]

所以

\[
\boxed{
\hat A_t
=
\delta_t
+
\gamma\lambda\hat A_{t+1}.
}
\]

这就是代码里 reverse loop 的数学来源。

## 6. 三步数值例子

设

\[
\gamma=0.9,
\qquad
\lambda=0.95,
\]

reward 为

\[
r_0=1,
\qquad
r_1=0,
\qquad
r_2=2,
\]

critic 预测

\[
V_0=0.5,
\quad
V_1=0.4,
\quad
V_2=0.2,
\quad
V_3=0.
\]

先算 TD residual：

\[
\delta_0
=1+0.9(0.4)-0.5
=0.86,
\]

\[
\delta_1
=0+0.9(0.2)-0.4
=-0.22,
\]

\[
\delta_2
=2-0.2
=1.8.
\]

由于

\[
\gamma\lambda=0.855,
\]

从后向前递推：

\[
\hat A_2=1.8,
\]

\[
\hat A_1
=-0.22+0.855(1.8)
=1.319,
\]

\[
\hat A_0
=0.86+0.855(1.319)
\approx1.988.
\]

这里很值得观察：\(\delta_1\) 本身是负的，但后续有很强的正 reward，所以最终 \(\hat A_1\) 仍然为正。GAE 不是简单看“当前一步奖励”，而是在可控 horizon 内向后传播未来信息。

## 7. Critic 学什么？Policy 又用什么？

拿到 advantage 后，常构造 value target

\[
\boxed{
\hat R_t
=
\hat A_t+V_\phi(s_t).
}
\]

critic 可以最小化

\[
L_V
=
\left(V_\phi(s_t)-\hat R_t\right)^2.
\]

而 policy gradient 使用的是 \(\hat A_t\)，不是直接拿这个 MSE 去更新 policy。两条学习路径解决的是不同问题：

- critic：学“这个 state 平均值是多少”；
- policy：学“当前 action 相对平均值好多少”。

LLM outcome-only reward 下，这个问题更加明显。若只有序列最后得到 reward，

\[
r_0=\cdots=r_{T-2}=0,
\qquad
r_{T-1}=R,
\]

critic 必须从很长的 prefix 预测最终成功概率，GAE 的质量也会受到 critic accuracy 影响。

对应实现：

```python
def compute_gae(rewards, values, dones, gamma=0.99, lam=0.95):
    T = len(rewards)
    advantages = [0.0] * T
    gae = 0.0

    for t in reversed(range(T)):
        nonterminal = 1.0 - dones[t]

        delta = (
            rewards[t]
            + gamma * values[t + 1] * nonterminal
            - values[t]
        )

        gae = (
            delta
            + gamma * lam * nonterminal * gae
        )
        advantages[t] = gae

    returns = [
        advantages[t] + values[t]
        for t in range(T)
    ]
    return advantages, returns
```

`nonterminal` 很重要：terminal 之后不能继续 bootstrap 下一个 episode 的 value。

## 8. 学完这章再看 PPO，会少背一半公式

PPO 中出现的 \(A_t\) 并不是一个神秘的“reward weight”。它来自

\[
G_t
\rightarrow
V,Q
\rightarrow
A
\rightarrow
\delta_t
\rightarrow
\mathrm{GAE}.
\]

面试时常见的错误包括：把 \(V(s)\) 说成即时 reward、把 \(Q\) 和 \(V\) 当成同一个量、认为 GAE 完全无偏，或者忘记 terminal mask。

真正应该能够解释的是：**我们为什么愿意引入一个可能有 approximation error 的 critic？因为它能显著降低 policy-gradient estimator 的 variance；GAE 再用 \(\lambda\) 控制对 critic bootstrap 和长 horizon return 的依赖程度。**

<!-- INTERACTIVE:
固定一条 reward/value trajectory，用 slider 调 gamma 与 lambda，实时显示 delta_t、GAE advantage 和 value target；同时展示 lambda=0 与接近 1 时的变化。
-->
