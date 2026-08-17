---
id: math.probability.importance-sampling
title: Importance Sampling：为什么旧策略的数据还能更新新策略？
level: gold
estimated_minutes: 30
---

# Importance Sampling：为什么旧策略的数据还能更新新策略？

## 1. 核心问题

我们真正想计算：

\[
E_{x\sim p}[f(x)],
\]

但手里只有

\[
x\sim q
\]

的样本。能否用 \(q\) 的样本估计 \(p\) 下的期望？

可以，但需要支持集覆盖：

\[
p(x)>0\Rightarrow q(x)>0.
\]

## 2. 从定义推导

\[
E_p[f(X)]
=
\sum_xp(x)f(x).
\]

乘除 \(q(x)\)：

\[
=
\sum_x
q(x)
\frac{p(x)}{q(x)}
f(x).
\]

因此：

\[
\boxed{
E_p[f]
=
E_q[
w(X)f(X)
]
}
\]

其中

\[
\boxed{
w(x)=\frac{p(x)}{q(x)}
}
\]

是 importance weight。

### 3. 直觉

若

\[
p(x)>q(x),
\]

说明目标分布更重视这个区域，但它在 proposal \(q\) 的样本中出现得不足，需要放大：

\[
w(x)>1.
\]

反之：

\[
w(x)<1.
\]

所以 importance sampling 本质是**分布频率校正**。

### 4. Monte Carlo estimator

若

\[
x_1,\ldots,x_N\sim q,
\]

则

\[
\hat\mu
=
\frac1N
\sum_i
w(x_i)f(x_i).
\]

标准条件下：

\[
E_q[\hat\mu]=E_p[f].
\]

无偏不代表低方差。

## 5. 数值例子

目标：

\[
p=(0.8,0.2),
\]

proposal：

\[
q=(0.5,0.5),
\]

函数：

\[
f(1)=10,\quad f(2)=0.
\]

真实目标：

\[
E_p[f]=8.
\]

权重：

\[
w(1)=1.6,\qquad w(2)=0.4.
\]

于是

\[
E_q[wf]
=
0.5(1.6)(10)+0.5(0.4)(0)=8.
\]

## 6. 为什么方差可能爆炸？

如果某处：

\[
p(x)\gg q(x),
\]

则

\[
w(x)\gg1.
\]

少量样本就可能支配估计。

方差：

\[
\operatorname{Var}_q[w(X)f(X)].
\]

这和 rare-event simulation 的核心问题完全一致：proposal 如果没有覆盖重要区域，权重就会极端。

### 7. Self-Normalized IS

定义未归一化权重 \(\tilde w_i\)，再：

\[
\bar w_i
=
\frac{\tilde w_i}
{\sum_j\tilde w_j}.
\]

估计：

\[
\hat\mu_{\rm SN}
=
\sum_i\bar w_if(x_i).
\]

它一般有有限样本 bias，但数值上常更稳。

### 8. Effective Sample Size

常见诊断：

\[
\operatorname{ESS}
\approx
\frac{(\sum_iw_i)^2}
{\sum_iw_i^2}.
\]

若权重全相等：

\[
ESS=N.
\]

若一个样本支配：

\[
ESS\approx1.
\]

所以“有 1000 个样本”并不意味着真的有 1000 个有效样本。

## 9. PPO Ratio 就是 Importance Ratio

Rollout 来自：

\[
\pi_{\rm old}.
\]

更新策略是：

\[
\pi_\theta.
\]

对同一 state-action：

\[
\boxed{
r_t(\theta)
=
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\rm old}(a_t|s_t)}
}
\]

工程里：

\[
r_t
=
\exp(
\log\pi_\theta
-
\log\pi_{\rm old}
).
\]

## 10. 为什么这不意味着旧数据可以无限复用？

完整 trajectory ratio 会是：

\[
\frac{p_\theta(\tau)}
{p_{\rm old}(\tau)}
=
\prod_t
\frac{\pi_\theta(a_t|s_t)}
{\pi_{\rm old}(a_t|s_t)}.
\]

长序列乘积极易极端，方差巨大。

PPO 使用局部 ratio + near-policy surrogate + clipping/KL 控制，正是因为旧 rollout 在策略漂移后会越来越不可靠。

所以：

> importance sampling 不是“无限离线复用数据”的许可证。

## 11. Python

```python
import numpy as np

def importance_sampling(values, log_p, log_q):
    log_w = log_p - log_q
    w = np.exp(log_w)
    return np.mean(w * values)

def self_normalized_is(values, log_p, log_q):
    log_w = log_p - log_q
    log_w -= np.max(log_w)
    w = np.exp(log_w)
    w /= w.sum()
    return np.sum(w * values)
```

## 12. 常见误区

- Ratio > 1 不代表 reward 高，只代表新策略更偏好该 action。
- IS 无偏不意味着有限样本表现好。
- \(q(x)=0,p(x)>0\) 时无法靠 reweighting 恢复。
- PPO 的 old policy 与长期 reference policy 不是一个概念。

### 13. 面试追问

1. 从定义推导 importance sampling。
2. 为什么必须满足 support condition？
3. 为什么权重会导致高方差？
4. Ordinary IS 与 self-normalized IS 区别？
5. PPO ratio 为什么用 log-prob difference 算？
6. 为什么 PPO 不能无限复用一批 rollout？

<!-- INTERACTIVE:
拖动 p/q，实时显示 weights、variance proxy、ESS。
-->
