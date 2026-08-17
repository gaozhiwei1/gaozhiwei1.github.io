---
id: math.probability.log-derivative-trick
title: Log-Derivative Trick：为什么离散采样也能做梯度优化？
level: gold
estimated_minutes: 30
---

# Log-Derivative Trick：为什么离散采样也能做梯度优化？

## 1. 真正困难的地方不是“求导”，而是采样来自参数化分布

考虑目标

\[
J(\theta)=\mathbb E_{x\sim p_\theta}[f(x)].
\]

这里需要特别区分两个对象：\(f(x)\) 给一个已经采到的样本打分，而 \(p_\theta(x)\) 决定这个样本被采到的概率。我们希望改变 \(\theta\)，让高分样本以后更容易出现。

如果 \(x\) 是连续且可以写成可微的重参数化形式，有时能沿着采样路径直接反传；但语言模型的 token 是 categorical sample，token id 本身并不是 \(\theta\) 的可微函数。因此，不能简单写成“对采样结果求导”。

我们真正要计算的是：**分布改变时，期望如何改变。**

## 2. 一条看起来普通、但会改变整个问题形式的恒等式

只要 \(p_\theta(x)>0\)，根据对数求导法则，

\[
\nabla_\theta\log p_\theta(x)
=
\frac{\nabla_\theta p_\theta(x)}{p_\theta(x)}.
\]

两边乘以 \(p_\theta(x)\)，得到

\[
\nabla_\theta p_\theta(x)
=
p_\theta(x)\nabla_\theta\log p_\theta(x).
\]

这一步没有做任何近似。它真正重要的地方在于右边重新出现了概率权重 \(p_\theta(x)\)。只要后面的求和或积分能写成

\[
\sum_x p_\theta(x)(\cdots),
\]

它就重新变成了关于 \(p_\theta\) 的 expectation，也就可以通过从 \(p_\theta\) 采样做 Monte Carlo 估计。

这个量

\[
s_\theta(x)=\nabla_\theta\log p_\theta(x)
\]

通常叫做 score function。

## 3. 从期望一步一步变成可采样梯度

先看离散随机变量。把期望写开：

\[
J(\theta)=\sum_x p_\theta(x)f(x).
\]

假设给定 \(x\) 后，\(f(x)\) 本身不显式依赖 \(\theta\)。对 \(\theta\) 求导：

\[
\nabla_\theta J(\theta)
=
\sum_x \nabla_\theta p_\theta(x)f(x).
\]

此时表达式还不是一个容易采样的 expectation，因为前面是 \(\nabla_\theta p_\theta(x)\)，而不是 \(p_\theta(x)\)。现在代入上一节的恒等式：

\[
\nabla_\theta J(\theta)
=
\sum_x
p_\theta(x)
\nabla_\theta\log p_\theta(x)
f(x).
\]

重新排列：

\[
\nabla_\theta J(\theta)
=
\sum_x
p_\theta(x)
\left[
f(x)\nabla_\theta\log p_\theta(x)
\right].
\]

现在它已经是标准的期望形式，因此

\[
\boxed{
\nabla_\theta J(\theta)
=
\mathbb E_{x\sim p_\theta}
\left[
f(x)\nabla_\theta\log p_\theta(x)
\right]
}
\]

有了这一步，就不需要枚举所有可能的 \(x\)。如果采到

\[
x^{(1)},\ldots,x^{(N)}\sim p_\theta,
\]

可以用

\[
\widehat{\nabla_\theta J}
=
\frac1N\sum_{n=1}^N
f(x^{(n)})
\nabla_\theta\log p_\theta(x^{(n)})
\]

估计真实梯度。

连续情形完全类似。在允许交换求导与积分的正则条件下，

\[
J(\theta)=\int p_\theta(x)f(x)\,dx
\]

同样会得到上面的 score-function estimator。

### 如果 \(f\) 本身也依赖参数呢？

这时不能漏掉 product rule。若

\[
J(\theta)=\mathbb E_{p_\theta(x)}[f_\theta(x)],
\]

则

\[
\boxed{
\nabla_\theta J
=
\mathbb E
\left[
f_\theta(x)\nabla_\theta\log p_\theta(x)
+
\nabla_\theta f_\theta(x)
\right].
}
\]

经典 policy-gradient 推导常把给定 trajectory 的环境 return 当成不直接依赖 policy 参数的数值，因此主要保留第一项。

## 4. 为什么可以减 Baseline 而不改变期望梯度？

先证明 score 的期望为 0：

\[
\mathbb E_{x\sim p_\theta}
[\nabla_\theta\log p_\theta(x)]
=
\sum_x p_\theta(x)\nabla_\theta\log p_\theta(x).
\]

利用 \(p\nabla\log p=\nabla p\)，

\[
=
\sum_x \nabla_\theta p_\theta(x)
=
\nabla_\theta\sum_xp_\theta(x)
=
\nabla_\theta 1
=0.
\]

因此，对任意不依赖当前采样结果的 baseline \(b\)，

\[
\mathbb E[(f(X)-b)\nabla\log p_\theta(X)]
\]

可以展开为

\[
\mathbb E[f(X)\nabla\log p_\theta(X)]
-
b\,\mathbb E[\nabla\log p_\theta(X)].
\]

第二项为 0，所以

\[
\boxed{
\mathbb E[(f-b)\nabla\log p]
=
\mathbb E[f\nabla\log p].
}
\]

这解释了一个非常关键的事实：**baseline 可以改变 estimator 的方差，却不会改变期望梯度。** 在 RL 中，\(b\) 常进一步变成只依赖 state 的 \(V(s)\)，于是 raw return 被替换成 advantage。

## 5. 一个 Bernoulli 例子：单次估计很噪，但平均是对的

令

\[
X\sim\operatorname{Bernoulli}(p),
\qquad
p=\sigma(\theta),
\]

并取

\[
f(X)=X.
\]

因为

\[
J(\theta)=\mathbb E[X]=p,
\]

真实梯度可以直接算出来：

\[
\frac{dJ}{d\theta}=p(1-p).
\]

另一方面，Bernoulli 的 log-prob 对 sigmoid logit \(\theta\) 的导数为

\[
\frac{\partial}{\partial\theta}
\log p_\theta(x)
=
x-p.
\]

所以单样本 score-function estimator 是

\[
g(X)=X(X-p).
\]

若 \(X=1\)，

\[
g=1-p;
\]

若 \(X=0\)，

\[
g=0.
\]

它看起来波动很大，但取期望：

\[
\mathbb E[g]
=p(1-p),
\]

恰好等于真实梯度。这正是 score-function 方法的典型特征：**可以无偏，但方差可能很大。**

## 6. 到 Policy Gradient 只差一次变量替换

在 RL 里，把随机变量 \(x\) 换成一整条 trajectory \(\tau\)：

\[
x\longrightarrow\tau,
\]

把打分函数换成 return：

\[
f(x)\longrightarrow R(\tau).
\]

立刻得到

\[
\nabla_\theta J
=
\mathbb E_{\tau\sim p_\theta}
\left[
R(\tau)\nabla_\theta\log p_\theta(\tau)
\right].
\]

接下来只需要把 trajectory probability 展开成每一步 policy probability，就会得到 Policy Gradient。也就是说，Policy Gradient 并不是凭空出现的一条 RL 公式，它本质上就是 log-derivative trick 在 trajectory distribution 上的应用。

对应的最小 PyTorch 形式非常短：

```python
loss = -(
    reward_or_advantage.detach()
    * log_prob
).mean()

loss.backward()
```

这里的负号只是因为优化器默认做 gradient descent，而理论目标写的是最大化 expected reward。

## 7. 最容易答错的地方

- “离散采样不可微，所以 RL 无法反向传播”是错的。我们不对 token id 求导，而对产生该 token 的 log-probability 求导。
- Log-derivative trick 本身不会降低方差；baseline、advantage、GAE 等才是在处理 estimator variance。
- Reward 不需要对 action 可微，经典 score-function estimator 仍然成立。
- Score-function 与 reparameterization 不是同一方法。后者要求能够把随机变量写成可微的 \(g_\theta(\epsilon)\)。

面试时最好能够从

\[
J(\theta)=\mathbb E_{p_\theta}[f(X)]
\]

不看答案地推到

\[
\nabla_\theta J
=
\mathbb E[f(X)\nabla_\theta\log p_\theta(X)],
\]

然后再证明 score expectation 为 0。只要这两步真正理解了，后面的 Policy Gradient、Advantage 和 PPO 会顺很多。

<!-- INTERACTIVE:
用 Bernoulli p=sigmoid(theta) 展示真实梯度 p(1-p)，并实时比较 N=1、10、100 次 Monte Carlo score-function estimator 的方差。
-->
