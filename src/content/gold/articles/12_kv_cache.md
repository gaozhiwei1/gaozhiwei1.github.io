---
id: inference.cache.kv
title: KV Cache：为什么 Autoregressive Decode 缓存 K/V，而不是 Q？
level: gold
estimated_minutes: 40
code_challenge_id: kv-cache-gib
---

# KV Cache：为什么 Autoregressive Decode 缓存 K/V，而不是 Q？

## 1. 从 Autoregressive Generation 开始

\[
p(x_{1:T})
=
\prod_{t=1}^{T}
p(x_t|x_{<t}).
\]

生成过程：

1. 用当前 prefix 预测下一个 token
2. 把 token 加回 prefix
3. 再继续预测

所以 decode 天生 sequential。

真正的系统问题：

> 第 \(t+1\) 步，前 \(t\) 个 token 已经计算过的中间量哪些可以复用？

## 2. 没有 Cache 会怎样？

长度为 \(t\) 的 prefix 每一步重新送入 Transformer：

\[
x_{1:t}.
\]

每一层都重新计算历史 token 的：

\[
Q_{1:t},K_{1:t},V_{1:t}.
\]

下一步变成：

\[
x_{1:t+1},
\]

又重复计算前 \(t\) 个 token。

### 3. 为什么历史表示可以复用？

Causal mask 保证位置 \(j\) 的表示只依赖：

\[
x_{\le j}.
\]

未来新增 token \(x_{t+1}\) 不能影响早先位置 \(j\le t\) 的 hidden state。

因此历史位置在每层已经算出的 K/V 仍然有效。

## 4. 为什么缓存 K/V？

新 token 在某层产生：

\[
q_{t+1},k_{t+1},v_{t+1}.
\]

新 query 需要和全部历史 key 匹配：

\[
q_{t+1}K_{1:t+1}^\top.
\]

然后读取：

\[
V_{1:t+1}.
\]

所以历史：

\[
K_{1:t},V_{1:t}
\]

以后每一步仍会被使用，值得缓存。

### 5. 为什么通常不缓存历史 Q？

Query 的作用是：

> 当前这个位置想从上下文读取什么？

历史位置 \(j\) 的 \(q_j\) 主要用于计算位置 \(j\) 自己的输出。未来位置需要新的 query \(q_t\)，不会再次需要过去的 \(q_j\) 来完成当前读取。

因此 autoregressive self-attention 的核心 cache 是 K/V。

## 6. 单层 Shape

设：

- batch：\(B\)
- KV heads：\(H_{kv}\)
- cache length：\(T\)
- head dim：\(D_h\)

则：

\[
K:[B,H_{kv},T,D_h],
\]

\[
V:[B,H_{kv},T,D_h].
\]

新 token 追加：

\[
[B,H_{kv},1,D_h].
\]

## 7. 总 Cache 内存公式

单层 K/V 元素数：

\[
2BTH_{kv}D_h.
\]

\(L\) 层：

\[
N_{\rm elem}
=
2LBTH_{kv}D_h.
\]

每元素 \(s\) bytes：

\[
\boxed{
M_{\rm KV}
=
2LBTH_{kv}D_hs
}
\]

换成 GiB：

\[
\boxed{
M_{\rm GiB}
=
\frac{
2LBTH_{kv}D_hs
}{
1024^3
}
}
\]

### 8. 一个非常适合面试的数值例子

设：

\[
L=32,\quad
B=1,\quad
T=8192,
\]

\[
H_{kv}=8,\quad
D_h=128,
\]

BF16：

\[
s=2\text{ bytes}.
\]

代入：

\[
2
\times32
\times1
\times8192
\times8
\times128
\times2
=
1,073,741,824
\]

bytes。

因此：

\[
\boxed{
M_{\rm KV}=1\text{ GiB}
}
\]

这只是理论 K/V tensor，不含 allocator、paging metadata、temporary buffer。

### 9. GQA 为什么直接影响 Cache？

MHA：

\[
H_{kv}=H_q.
\]

GQA：

\[
H_{kv}<H_q.
\]

因此：

\[
\boxed{
\frac{M_{\rm GQA}}
{M_{\rm MHA}}
=
\frac{H_{kv}}
{H_q}
}
\]

这也是 GQA serving 价值的重要来源。

## 10. Prefill 与 Decode

### Prefill

一次处理 prompt 中很多 token：

\[
T_{\rm prompt}.
\]

特点：

- 大矩阵
- 并行度高
- 生成初始 KV Cache

### Decode

每步通常只有一个新 query，却要读取越来越长的历史 K/V。

因此更容易受到：

- memory bandwidth
- cache capacity

限制。

## 11. Cache 如何改变 Attention-side 复杂度？

只讨论 sequential decode 中 self-attention 部分。

### 无 Cache

第 \(t\) 步重新计算长度 \(t\) 的完整 attention：

\[
O(t^2D).
\]

总和：

\[
\sum_{t=1}^{T}O(t^2D)
=
O(T^3D).
\]

### 有 Cache

第 \(t\) 步新 query 只与 \(t\) 个 cached keys 匹配：

\[
O(tD).
\]

总和：

\[
\sum_{t=1}^{T}O(tD)
=
O(T^2D).
\]

这是 attention-side 的简化渐近分析。

完整 Transformer 还包括 FFN、projection、LM head 等，不能不加限定地说“整个推理复杂度从三次变二次”。

### 12. 为什么有 Cache 仍然越来越慢？

因为第 \(t\) 步仍需要：

\[
q_tK_{1:t}^\top
\]

以及：

\[
\alpha_tV_{1:t}.
\]

历史越长：

- 读取 K/V 越多
- attention arithmetic 越多
- memory traffic 越大

所以 KV Cache 消除的是历史 K/V 的**重复计算**，不是让单步 decode 变 \(O(1)\)。

## 13. 为什么长上下文容易被 Cache 内存限制？

Cache 线性依赖：

\[
B,T,L,H_{kv},D_h,s.
\]

Serving 中 batch 与 context 同时增大时，常驻 KV 占用会很快增长。

于是才会出现：

- GQA/MQA
- KV quantization
- PagedAttention
- prefix caching
- offloading

## 14. PagedAttention 在解决什么？

如果每个 request 预留连续最大 KV buffer，会造成：

- 内存浪费
- fragmentation
- 动态长度难管理

PagedAttention 将 KV 分成 block/page，通过逻辑映射管理物理内存。

不要和 FlashAttention 混淆：

- FlashAttention：attention kernel / IO
- PagedAttention：serving KV memory management

## 15. 极简 Cache 结构

```python
class KVCache:
    def __init__(self):
        self.k = None
        self.v = None

    def append(self, k_new, v_new):
        # [B, Hkv, 1, Dh]
        if self.k is None:
            self.k = k_new
            self.v = v_new
        else:
            self.k = torch.cat(
                [self.k, k_new],
                dim=2,
            )
            self.v = torch.cat(
                [self.v, v_new],
                dim=2,
            )

        return self.k, self.v
```

真实 serving 不会每步简单 `torch.cat`，因为频繁 reallocation/copy 很低效；这里只用于理解。

## 16. 常见误区

- KV Cache 不把每步 attention 变成 \(O(1)\)。
- 历史 Q 通常不需要缓存。
- Cache 不只和 sequence length 有关。
- FlashAttention 不会替代 KV Cache。
- PagedAttention 与 FlashAttention 是不同层次问题。

### 17. 面试追问

1. 为什么缓存 K/V 不缓存 Q？
2. KV cache shape 怎么写？
3. 推导 cache GiB 公式。
4. MHA→GQA cache 减少多少？
5. 为什么 cache 后 decode 仍随 context 变慢？
6. Prefill 与 decode 的瓶颈区别？
7. PagedAttention 与 FlashAttention 区别？
8. 什么情况下 prefix cache 可以跨 request 共享？

<!-- INTERACTIVE:
L/B/T/Hkv/Dh/dtype Calculator + MHA/GQA/MQA 切换。
-->

## References

- Transformer causal self-attention architecture.
- GQA literature for reduced KV-head designs.
