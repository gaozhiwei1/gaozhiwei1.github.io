---
id: transformer.multihead.gqa
title: MHA、MQA 与 GQA：从 Head 结构推到 KV Cache 与 Decode 带宽
level: gold
estimated_minutes: 30
code_challenge_id: gqa-group-map
---

# MHA、MQA 与 GQA：从 Head 结构推到 KV Cache 与 Decode 带宽

## 1. 为什么减少 KV Heads？

Decode 每生成一个 token，都要读取历史 K/V。上下文和 batch 增大后，KV Cache 容量与读取带宽会成为重要瓶颈。

GQA 的核心：

> 保留较多 Query heads，但让多个 Query heads 共享一套 K/V heads。

## 2. MHA

\[
H_q=H_{kv}=H.
\]

Shape：

\[
Q,K,V:[B,H,T,D_h].
\]

每个 Q head 有自己独立 K/V。

### 3. MQA

\[
H_q=H,\qquad H_{kv}=1.
\]

全部 Q heads 共享一组 K/V。

Cache 最小，但共享最强。

## 4. GQA

\[
1<H_{kv}<H_q.
\]

例如：

\[
H_q=32,\qquad H_{kv}=8.
\]

Group size：

\[
g=\frac{H_q}{H_{kv}}=4.
\]

每 4 个 Q heads 共享一套 KV head。

### 5. Head 映射

若 query head：

\[
h_q=0,\ldots,H_q-1,
\]

一个简单映射：

\[
h_{kv}
=
\left\lfloor
\frac{h_q}{g}
\right\rfloor.
\]

32/8 时：

- Q 0–3 → KV 0
- Q 4–7 → KV 1
- ...
- Q 28–31 → KV 7

## 6. Cache 为什么按 \(H_{kv}\) 缩小？

单层：

\[
K,V:[B,H_{kv},T,D_h].
\]

总 cache：

\[
N_{\rm KV}
=
2LBTH_{kv}D_h.
\]

MHA 使用 \(H_q\) 个 KV heads，因此：

\[
\boxed{
\frac{M_{\rm GQA}}
{M_{\rm MHA}}
=
\frac{H_{kv}}{H_q}
}
\]

32 Q / 8 KV：

\[
M_{\rm GQA}/M_{\rm MHA}=1/4.
\]

注意这是 K/V tensor 理论字节比例，不是整机显存下降 75%。

### 7. K/V Projection 参数也减少

若 hidden width：

\[
D=H_qD_h,
\]

MHA 的 K projection：

\[
W_K\in\mathbb R^{D\times D}.
\]

GQA：

\[
W_K
\in
\mathbb R^{D\times(H_{kv}D_h)}.
\]

V 同理。

Q projection 通常仍保留 \(H_q\)。

## 8. 为什么 Attention FLOPs 不简单降到 1/4？

虽然 K/V heads 少了，但仍然有 \(H_q\) 个 query heads。

逻辑 attention score 仍有：

\[
[B,H_q,T_q,T_k].
\]

因此 GQA 的明确收益主要来自：

- K/V projection
- KV Cache 容量
- Decode 历史 K/V 读取带宽

不能简单说“总 attention FLOPs 减到 \(H_{kv}/H_q\)”。

## 9. 为什么 Decode 特别受益？

Prefill 常是大矩阵计算，GPU compute utilization 较高。

Decode 每步通常只有一个新 query，但要反复读取越来越长的历史 K/V，更容易 memory-bandwidth-bound。

减少 KV heads 因此非常适合 serving。

## 10. 逻辑实现

```python
def repeat_kv(x, num_query_heads):
    # x: [B, Hkv, T, Dh]
    b, hkv, t, dh = x.shape
    assert num_query_heads % hkv == 0

    groups = num_query_heads // hkv

    x = x[:, :, None, :, :]
    x = x.expand(
        b, hkv, groups, t, dh
    )

    return x.reshape(
        b,
        num_query_heads,
        t,
        dh,
    )
```

高效 kernel 不一定真的 materialize repeat，可以直接共享索引。

### 11. MHA / GQA / MQA

| 结构 | Q heads | KV heads | KV Cache | 共享程度 |
|---|---:|---:|---:|---|
| MHA | \(H\) | \(H\) | 最大 | 最低 |
| GQA | \(H\) | 中间值 | 中等 | 组内 |
| MQA | \(H\) | 1 | 最小 | 最高 |

没有脱离训练方法、模型规模、质量要求和 serving 目标的“永远最优”。

## 12. 常见误区

- GQA 不是减少 Q heads。
- Cache 变成 1/4 不代表总显存变成 1/4。
- MQA cache 更小，不代表一定质量更好。
- GQA 主要是 inference/system tradeoff，不是“无损魔法”。

### 13. 面试追问

1. MHA/MQA/GQA shape 分别是什么？
2. 32 Q、8 KV 时每组多少 Q？
3. KV Cache 理论减少多少？
4. 为什么 Decode 比 Prefill 更受益？
5. 为什么 attention score FLOPs 不同比例下降？
6. GQA 和 RoPE 如何组合？
7. GQA 与 Tensor Parallel 有什么交互？

<!-- INTERACTIVE:
输入 Hq/Hkv/L/T/Dh/dtype，实时显示 Cache GiB。
-->

## References

- Ainslie et al., *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*.
