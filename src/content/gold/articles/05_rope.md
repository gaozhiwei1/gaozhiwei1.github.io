---
id: transformer.position.rope
title: RoPE：从二维旋转到相对位置的完整推导
level: gold
estimated_minutes: 35
code_challenge_id: rotary-embedding
---

# RoPE：从二维旋转到相对位置的完整推导

## 1. 为什么 Attention 还需要位置？

没有位置机制时，self-attention 的核心匹配依赖 token 表示本身，但语言顺序至关重要。RoPE 的目标是：

> 让位置直接进入 Q/K 的匹配几何。

## 2. 二维旋转

\[
R(\phi)
=
\begin{bmatrix}
\cos\phi&-\sin\phi\\
\sin\phi&\cos\phi
\end{bmatrix}.
\]

对二维向量：

\[
x'=R(\phi)x.
\]

因为

\[
R(\phi)^\top R(\phi)=I,
\]

所以旋转保持 norm：

\[
\|R(\phi)x\|_2=\|x\|_2.
\]

### 3. 把位置变成角度

设位置为 \(m\)，频率为 \(\omega\)：

\[
R_m=R(m\omega).
\]

Query：

\[
q_m=R_mq.
\]

Key：

\[
k_n=R_nk.
\]

## 4. 最核心推导

\[
q_m^\top k_n
=
(R_mq)^\top(R_nk)
\]

\[
=
q^\top R_m^\top R_nk.
\]

由于：

\[
R(\alpha)^\top=R(-\alpha),
\]

且：

\[
R(\alpha)R(\beta)=R(\alpha+\beta),
\]

所以：

\[
R_m^\top R_n
=
R(-m\omega)R(n\omega)
=
R((n-m)\omega).
\]

最终：

\[
\boxed{
q_m^\top k_n
=
q^\top R((n-m)\omega)k
}
\]

这就是 RoPE 的数学核心：

> Q/K 按绝对位置旋转，但进入点积后，位置以相对差 \(n-m\) 的形式出现。

### 5. 最小几何例子

令：

\[
q=k=(1,0).
\]

位置 0 的 query：

\[
q_0=(1,0).
\]

位置 1 的 key：

\[
k_1=(\cos\omega,\sin\omega).
\]

点积：

\[
q_0^\top k_1=\cos\omega.
\]

相隔两个位置：

\[
q_0^\top k_2=\cos(2\omega).
\]

相对位移因此直接改变匹配。

## 6. 高维如何旋转？

Head dimension \(D_h\) 按两维一组：

\[
(x_0,x_1),
(x_2,x_3),
\ldots
\]

每个二维平面使用不同频率：

\[
\omega_i.
\]

整个旋转矩阵是 block diagonal：

\[
R_m
=
\operatorname{diag}
(
R(m\omega_0),
R(m\omega_1),
\ldots
).
\]

多频率让模型同时拥有快速和缓慢变化的相位。

### 7. 常见频率形式

经典形式之一：

\[
\theta_i
=
\mathrm{base}^{-2i/D_h}.
\]

位置 \(m\) 对应角：

\[
m\theta_i.
\]

具体实现会在 layout/base/index convention 上略有不同，但核心都是不同 channel pair 使用不同频率旋转。

### 8. 复数形式

把：

\[
(x_{2i},x_{2i+1})
\]

看成：

\[
z_i=x_{2i}+ix_{2i+1}.
\]

旋转：

\[
z_i'
=
z_ie^{im\theta_i}.
\]

相位关系：

\[
e^{-im\theta_i}e^{in\theta_i}
=
e^{i(n-m)\theta_i}.
\]

相对位置性质会非常直观。

## 9. 为什么通常只旋转 Q/K？

Attention weight 来自：

\[
QK^\top.
\]

位置机制最直接需要影响的是匹配分数。V 是被读取内容，因此标准 RoPE 主要作用在 Q/K。

这不是“数学禁止旋转 V”，而是标准结构的设计选择。

### 10. Tensor Shape

RoPE 前：

\[
Q,K:[B,H,T,D_h].
\]

按 pair：

\[
[B,H,T,D_h/2,2].
\]

旋转后仍是：

\[
[B,H,T,D_h].
\]

所以 RoPE 不改变：

- sequence length
- head dimension
- dense attention 的 \(T^2\) 复杂度

## 11. PyTorch 骨架

```python
def rotate_half(x):
    x1 = x[..., ::2]
    x2 = x[..., 1::2]
    return torch.stack(
        (-x2, x1),
        dim=-1,
    ).flatten(-2)

def apply_rope(x, cos, sin):
    return (
        x * cos
        + rotate_half(x) * sin
    )
```

这里就是二维旋转：

\[
(x_1,x_2)
\mapsto
(x_1\cos\phi-x_2\sin\phi,\;
x_1\sin\phi+x_2\cos\phi).
\]

## 12. 长上下文为什么仍困难？

当位置远超训练范围：

\[
m\theta_i
\]

进入训练分布外相位组合。

RoPE 数学上仍可计算，但模型未必学会在这些相位上保持原行为。

因此有 position interpolation、frequency scaling 等方案。它们通常是在：

- 长距离覆盖
- 局部位置分辨率
- 训练相位分布

之间做 tradeoff。

不能简单说“把 base 调大就无损延长 context”。

## 13. 常见误区

**“RoPE 就是 sinusoidal positional encoding”**  
都使用 sin/cos，但注入位置不同。RoPE 旋转 Q/K，让相对位移进入 inner product。

**“RoPE 直接存相对位置”**  
更准确：按绝对位置旋转，点积结构产生相对位置依赖。

**“RoPE 能降低 attention complexity”**  
错误。

### 14. 面试追问

1. 推导 \(R_m^\top R_n=R_{n-m}\)。
2. 为什么旋转保持 norm？
3. 为什么点积依赖相对位置？
4. 为什么 channel pair 要使用不同频率？
5. 为什么主要旋转 Q/K？
6. 长上下文 extrapolation 的根本问题是什么？
7. RoPE 是否改变 KV Cache shape？

<!-- INTERACTIVE:
二维 q/k 旋转动画；slider 控制 m,n,omega。
-->

## References

- Su et al., *RoFormer: Enhanced Transformer with Rotary Position Embedding*.
