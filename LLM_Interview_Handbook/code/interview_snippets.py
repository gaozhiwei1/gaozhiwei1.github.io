"""Runnable PyTorch examples used throughout the handbook."""

import math

import torch
import torch.nn as nn
import torch.nn.functional as F


def causal_mask(seq_len, device):
    """Return [1, 1, T, T]; True entries represent future positions."""
    mask = torch.ones(
        seq_len, seq_len, dtype=torch.bool, device=device
    ).triu(diagonal=1)
    return mask[None, None, :, :]


def scaled_dot_product_attention(q, k, v, mask=None):
    """Apply scaled attention to tensors shaped [B, H, T, D]."""
    scale = 1.0 / math.sqrt(q.size(-1))
    scores = torch.matmul(q, k.transpose(-2, -1)) * scale
    if mask is not None:
        scores = scores.masked_fill(mask, float("-inf"))

    # 半精度下用 FP32 计算 softmax，再还原输入 dtype。
    weights = torch.softmax(scores.float(), dim=-1).to(q.dtype)
    output = torch.matmul(weights, v)
    return output, weights


class RMSNorm(nn.Module):
    """RMSNorm with FP32 statistics for mixed-precision stability."""

    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.eps = eps

    def forward(self, x):
        input_dtype = x.dtype
        x_float = x.float()
        mean_square = x_float.pow(2).mean(dim=-1, keepdim=True)
        normalized = x_float * torch.rsqrt(mean_square + self.eps)
        return normalized.to(input_dtype) * self.weight


def apply_rope(x, cos, sin):
    """Rotate adjacent feature pairs in x shaped [B, H, T, D]."""
    if x.size(-1) % 2 != 0:
        raise ValueError("RoPE requires an even head dimension")

    x_even = x[..., 0::2]
    x_odd = x[..., 1::2]
    rotated_even = x_even * cos - x_odd * sin
    rotated_odd = x_even * sin + x_odd * cos
    return torch.stack((rotated_even, rotated_odd), dim=-1).flatten(-2)


class SwiGLU(nn.Module):
    """Gated FFN used by many decoder-only language models."""

    def __init__(self, dim, hidden_dim):
        super().__init__()
        self.gate_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.up_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.down_proj = nn.Linear(hidden_dim, dim, bias=False)

    def forward(self, x):
        # 两条上投影分别产生门控分支和内容分支。
        gate = F.silu(self.gate_proj(x))
        value = self.up_proj(x)
        return self.down_proj(gate * value)


class TransformerBlock(nn.Module):
    """Minimal causal, Pre-Norm Transformer block."""

    def __init__(self, dim, num_heads, hidden_dim):
        super().__init__()
        if dim % num_heads != 0:
            raise ValueError("dim must be divisible by num_heads")

        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        self.attn_norm = RMSNorm(dim)
        self.ffn_norm = RMSNorm(dim)
        self.qkv_proj = nn.Linear(dim, 3 * dim, bias=False)
        self.out_proj = nn.Linear(dim, dim, bias=False)
        self.ffn = SwiGLU(dim, hidden_dim)

    def forward(self, x):
        batch, seq_len, dim = x.shape
        q, k, v = self.qkv_proj(self.attn_norm(x)).chunk(3, dim=-1)

        def split_heads(tensor):
            tensor = tensor.view(
                batch, seq_len, self.num_heads, self.head_dim
            )
            return tensor.transpose(1, 2)

        q, k, v = map(split_heads, (q, k, v))
        mask = causal_mask(seq_len, x.device)
        attn_out, _ = scaled_dot_product_attention(q, k, v, mask)

        # transpose 会改变 stride，view 前先恢复连续布局。
        attn_out = attn_out.transpose(1, 2).contiguous()
        attn_out = attn_out.view(batch, seq_len, dim)
        x = x + self.out_proj(attn_out)
        return x + self.ffn(self.ffn_norm(x))


def decode_attention(
    x_t,
    k_cache,
    v_cache,
    q_proj,
    k_proj,
    v_proj,
    num_query_heads,
    num_kv_heads,
):
    """Run one decode step and append its K/V tensors to the cache."""
    batch = x_t.size(0)
    if num_query_heads % num_kv_heads != 0:
        raise ValueError("query heads must divide into KV groups")

    head_dim = q_proj.out_features // num_query_heads

    def project_one_token(layer, tensor, num_heads):
        projected = layer(tensor)
        return projected.view(
            batch, 1, num_heads, head_dim
        ).transpose(1, 2)

    q = project_one_token(q_proj, x_t, num_query_heads)
    k_new = project_one_token(k_proj, x_t, num_kv_heads)
    v_new = project_one_token(v_proj, x_t, num_kv_heads)

    if k_cache is None:
        k_cache, v_cache = k_new, v_new
    else:
        # dim=2 是序列维，只追加当前 token 的 K/V。
        k_cache = torch.cat((k_cache, k_new), dim=2)
        v_cache = torch.cat((v_cache, v_new), dim=2)

    repeats = num_query_heads // num_kv_heads
    k_for_attn = k_cache.repeat_interleave(repeats, dim=1)
    v_for_attn = v_cache.repeat_interleave(repeats, dim=1)

    scores = torch.matmul(q, k_for_attn.transpose(-2, -1))
    scores = scores / math.sqrt(head_dim)
    probs = torch.softmax(scores.float(), dim=-1).to(q.dtype)
    output = torch.matmul(probs, v_for_attn)

    output = output.transpose(1, 2).contiguous()
    output = output.view(batch, 1, num_query_heads * head_dim)
    return output, k_cache, v_cache


def temperature_sample(logits, temperature=1.0):
    """Sample one token from each [B, V] row after temperature scaling."""
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    probs = torch.softmax(logits / temperature, dim=-1)
    return torch.multinomial(probs, num_samples=1)


def top_k_top_p_filter(logits, top_k=None, top_p=None):
    """Mask logits outside the Top-k and/or nucleus candidate set."""
    filtered = logits.clone()

    if top_k is not None:
        if top_k <= 0:
            raise ValueError("top_k must be positive")
        top_k = min(top_k, filtered.size(-1))
        threshold = filtered.topk(top_k, dim=-1).values[..., -1, None]
        filtered.masked_fill_(filtered < threshold, float("-inf"))

    if top_p is not None:
        if not 0.0 < top_p <= 1.0:
            raise ValueError("top_p must be in (0, 1]")

        sorted_logits, sorted_idx = filtered.sort(descending=True, dim=-1)
        sorted_probs = torch.softmax(sorted_logits, dim=-1)
        cumulative = sorted_probs.cumsum(dim=-1)

        remove = cumulative > top_p
        # 右移后会保留首次越过阈值的 token，确保概率质量足够。
        remove[..., 1:] = remove[..., :-1].clone()
        remove[..., 0] = False
        sorted_logits.masked_fill_(remove, float("-inf"))

        filtered = torch.full_like(filtered, float("-inf"))
        filtered.scatter_(-1, sorted_idx, sorted_logits)

    return filtered


def simple_beam_step(log_probs, beam_scores, beam_size):
    """Select the best joint (parent beam, next token) candidates."""
    batch, old_beam, vocab_size = log_probs.shape
    scores = log_probs + beam_scores[..., None]
    flat_scores = scores.view(batch, old_beam * vocab_size)
    new_scores, flat_idx = flat_scores.topk(beam_size, dim=-1)
    parent_beam = flat_idx // vocab_size
    next_token = flat_idx % vocab_size
    return parent_beam, next_token, new_scores


def pairwise_reward_loss(chosen_reward, rejected_reward):
    """Bradley-Terry loss for preferred and rejected scalar rewards."""
    reward_margin = chosen_reward - rejected_reward
    return -F.logsigmoid(reward_margin).mean()


def ppo_policy_loss(
    new_logp, old_logp, advantages, valid_mask, clip_eps=0.2
):
    """PPO clipped policy loss over valid response-token positions."""
    ratio = torch.exp(new_logp - old_logp)
    unclipped = ratio * advantages
    clipped_ratio = ratio.clamp(1.0 - clip_eps, 1.0 + clip_eps)
    clipped = clipped_ratio * advantages
    token_loss = -torch.minimum(unclipped, clipped) * valid_mask
    return token_loss.sum() / valid_mask.sum().clamp_min(1)


def dpo_loss(
    policy_chosen_logp,
    policy_rejected_logp,
    ref_chosen_logp,
    ref_rejected_logp,
    beta=0.1,
):
    """DPO loss from response-level sequence log-probabilities."""
    policy_margin = policy_chosen_logp - policy_rejected_logp
    reference_margin = ref_chosen_logp - ref_rejected_logp
    preference_logit = beta * (policy_margin - reference_margin)
    return -F.logsigmoid(preference_logit).mean()


def group_relative_advantages(rewards, eps=1e-6):
    """Normalize rewards independently inside each [B, G] prompt group."""
    group_mean = rewards.mean(dim=1, keepdim=True)
    group_std = rewards.std(dim=1, keepdim=True, unbiased=False)
    return (rewards - group_mean) / (group_std + eps)


def best_of_n(prompt, model, verifier, n=8):
    """Generate N candidates and return the verifier's highest-scoring one."""
    if n <= 0:
        raise ValueError("n must be positive")

    candidates = [model.generate(prompt) for _ in range(n)]
    scores = [verifier(prompt, answer) for answer in candidates]
    best_index = max(range(n), key=lambda index: scores[index])
    return candidates[best_index], scores[best_index]


class LoRALinear(nn.Module):
    """Frozen Linear layer plus a trainable low-rank update branch."""

    def __init__(self, base, rank=16, alpha=32.0):
        super().__init__()
        if rank <= 0:
            raise ValueError("rank must be positive")

        self.base = base
        self.rank = rank
        self.scale = alpha / rank
        for parameter in self.base.parameters():
            parameter.requires_grad = False

        self.lora_a = nn.Parameter(
            torch.empty(rank, base.in_features)
        )
        self.lora_b = nn.Parameter(
            torch.zeros(base.out_features, rank)
        )
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))

    def forward(self, x):
        low_rank = (x @ self.lora_a.T) @ self.lora_b.T
        return self.base(x) + self.scale * low_rank

    @torch.no_grad()
    def merged_weight(self):
        """Return W + (alpha / rank) BA in PyTorch Linear layout."""
        delta = self.scale * (self.lora_b @ self.lora_a)
        return self.base.weight + delta


def pass_at_k(num_samples, num_correct, k):
    """Estimate the probability that at least one of k samples passes."""
    if not 0 <= num_correct <= num_samples:
        raise ValueError("num_correct must be in [0, num_samples]")
    if not 1 <= k <= num_samples:
        raise ValueError("k must be in [1, num_samples]")
    if num_samples - num_correct < k:
        return 1.0

    all_failed = math.comb(num_samples - num_correct, k)
    all_subsets = math.comb(num_samples, k)
    return 1.0 - all_failed / all_subsets


class NaiveTopKMoE(nn.Module):
    """Readable Top-k MoE reference; production systems batch by expert."""

    def __init__(self, dim, experts, top_k=2):
        super().__init__()
        if not 1 <= top_k <= len(experts):
            raise ValueError("top_k must be within expert count")
        self.experts = nn.ModuleList(experts)
        self.top_k = top_k
        self.router = nn.Linear(dim, len(experts), bias=False)

    def forward(self, x):
        batch, seq_len, dim = x.shape
        tokens = x.reshape(batch * seq_len, dim)
        router_probs = torch.softmax(self.router(tokens), dim=-1)
        top_prob, top_idx = router_probs.topk(self.top_k, dim=-1)
        top_prob = top_prob / top_prob.sum(dim=-1, keepdim=True)

        output = torch.zeros_like(tokens)
        for expert_id, expert in enumerate(self.experts):
            for slot in range(self.top_k):
                token_mask = top_idx[:, slot] == expert_id
                if not token_mask.any():
                    continue
                expert_out = expert(tokens[token_mask])
                weight = top_prob[token_mask, slot, None]
                output[token_mask] += weight * expert_out

        return output.view(batch, seq_len, dim), router_probs
