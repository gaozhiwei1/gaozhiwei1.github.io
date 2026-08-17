# Math2LLM Phase 2 Content Audit

## 1. Existing application modules

The current React/Vite application has five primary routes:

| Route | Component | Current behavior |
| --- | --- | --- |
| `#/map` | `KnowledgeMap` | Displays all 12 top-level topics in four lanes at once. |
| `#/learn/:id` | `LearnPage` | Fully authored pages exist for Tokenization, Transformer, Inference, and Post-training; the other topics use a generic overview. |
| `#/practice/:id` | `PracticePage` | 32 questions in one filterable flat list with answer reveal, bookmark, and mastery actions. |
| `#/code/:id` | `CodeLabPage` | Four local Python challenges with visible/hidden tests. |
| `#/review` | `ReviewPage` | Completion statistics, a static last-day checklist, bookmarks, and role routes. |

Shared product infrastructure already exists and should be preserved:

- Hash routing and route-level lazy loading in `App.tsx`.
- A five-item desktop/mobile navigation shell.
- `Cmd/Ctrl + K` command palette.
- KaTeX formulas.
- Four interactive labs: tokenizer, attention, KV cache, and GRPO.
- Local Python judge with timeout, output cap, hidden tests, and temporary directories.
- Browser-local progress storage.
- A restrained blue/green/amber/coral/violet visual language.

## 2. Existing knowledge points

The web curriculum currently contains 12 coarse `Topic` objects:

1. Tokenization: BPE/Unigram, Chinese segmentation, vocabulary/sequence trade-off.
2. Transformer: Q/K/V, scaled attention, residual stream, SwiGLU.
3. Pretraining: next-token prediction, teacher forcing, scaling laws.
4. Modern architecture: RMSNorm, RoPE, GQA/MLA.
5. Inference: KV Cache, FlashAttention, quantization, speculative decoding.
6. Reasoning: test-time scaling, self-consistency, RLVR.
7. Post-training: SFT, reward model, PPO, DPO, GRPO.
8. PEFT: LoRA, QLoRA, reasoning distillation.
9. MoE: sparse routing, load balance, expert parallelism.
10. Distributed training: data/tensor parallelism, ZeRO/FSDP.
11. Evaluation: perplexity, pass@k, LLM-as-a-judge.
12. RAG/Agents: retrieval, reranking, tool schema, idempotency.

The LaTeX handbook is much richer than the website. It already includes detailed material on attention shapes, embeddings/LM head, RMSNorm, RoPE, GQA/MLA, pretraining data and optimization, training memory, FlashAttention, sampling, PPO/DPO/GRPO, LoRA/QLoRA, MoE, distributed training, reasoning, evaluation, RAG, and agents. Phase 2 should migrate and restructure this material instead of replacing it.

## 3. Existing interview questions

There are 32 structured web questions:

| Topic | Count | Strong current coverage |
| --- | ---: | --- |
| Tokenization | 2 | vocabulary trade-off, throughput |
| Transformer | 6 | Q/K/V, scaling, FFN, residual stream |
| Pretraining | 3 | shifted targets, teacher forcing, compute-optimal training |
| Architecture | 2 | RoPE, GQA ratio |
| Inference | 5 | KV memory, cache semantics, FlashAttention, temperature, bandwidth |
| Reasoning | 3 | thinking mode, Best-of-N, RLVR |
| Post-training | 5 | SFT mask, reward ranking, PPO, DPO, GRPO |
| PEFT | 1 | LoRA parameter count |
| MoE | 1 | why experts replace FFN |
| Distributed | 1 | ZeRO stages |
| Evaluation | 1 | validation loss limitations |
| RAG/Agents | 2 | reranking, tool contracts |

Only a small subset has a complete derivation array. Questions are not yet organized as prerequisite-aware interview trees, and most topics lack mathematical, debugging, and system-design variants.

## 4. Existing coding problems

There are four good, non-duplicate Python problems:

1. Stable Softmax.
2. KV Cache theoretical memory.
3. GRPO group-relative advantages.
4. DPO single-pair loss.

Each has a signature, motivation, examples, constraints, starter code, reference solution, visible tests, and hidden tests. The judge architecture can support a larger bank, but the current tab strip does not scale beyond a handful of problems.

## 5. Major missing LLM topics

### Mathematical foundations

- Matrix multiplication and tensor-shape reasoning.
- Norms, cosine similarity, rank, low-rank approximation, and SVD intuition.
- Expectation, variance, covariance, categorical likelihood, entropy, cross entropy, and KL divergence.
- SGD, momentum, Adam/AdamW, weight decay, clipping, constraints, and Lagrangian intuition.

### Representation and Transformer

- WordPiece, special tokens, fertility, embedding lookup, tied embeddings, and vocabulary logits.
- Attention dropout, padding masks, numerical stability, complete multi-head reshape/concat path, and parameter counting.
- Absolute/sinusoidal positions, long-context extrapolation, LayerNorm, Pre-/Post-Norm, GELU/GLU, and a complete decoder block.

### Decoder-only architecture and pretraining

- Encoder/decoder distinctions, autoregressive factorization, final norm and LM head.
- Data filtering, deduplication, contamination, mixture weighting, sequence packing, warmup/cosine schedules, BF16/FP16, and gradient accumulation.

### Post-training and reasoning

- Policy gradient, return/Q/value/advantage, GAE, entropy bonus, PPO clipping corner cases, rejection sampling, RLAIF, reward shaping, process/outcome reward, and online/offline optimization.
- Search, majority vote, verifier reliability, and reasoning length/cost trade-offs.

### Inference and systems

- Prefill/decode distinction, PagedAttention, continuous batching, beam search, calibration, GPTQ/AWQ intuition, and activation quantization.
- MoE router mathematics, capacity factor, dropped tokens, and All-to-All.
- Sequence/expert parallelism, pipeline bubbles, communication placement, and numerical memory exercises.

### Reliability

- Calibration, hallucination, robustness, distribution shift, expected loss, tail failure, VaR, and CVaR.

## 6. Duplicated or overlapping topics

- `Transformer` and `Modern Architecture` both own SwiGLU/GQA-adjacent material. They should become modules inside one dependency-aware Transformer track rather than independent coarse pages.
- `Pretraining` contains decoder-only objective material that belongs to a distinct decoder architecture module, while its optimization/scaling material belongs to pretraining.
- `Reasoning` and `Post-training` both discuss RLVR/process rewards. Reasoning should own inference behavior and search; Post-training should own the optimization signal and training loop, with explicit cross-links.
- `PEFT` currently includes reasoning distillation, which should be cross-linked to the Reasoning track rather than treated as a LoRA subtopic.
- `RAG + Agents` is too broad for one node; it should remain a compact product module but split retrieval and agent reliability internally.

## 7. Topics that are too broad

- Transformer fundamentals currently combines attention, residuals, normalization, and FFN.
- Pretraining combines the objective, data engineering, optimization, numerical formats, and scaling.
- Inference combines generation algorithms, cache management, attention kernels, batching, speculative decoding, and quantization.
- Post-training combines five algorithms and several different data/control regimes.
- Distributed training combines seven distinct partitioning strategies.
- Evaluation combines model fit, task correctness, preference evaluation, contamination, and reliability risk.

## 8. Topics that should become smaller stable nodes

The new curriculum should use stable IDs such as:

- `math.probability.kl-divergence`
- `tokenization.subword.bpe`
- `representation.embedding.weight-tying`
- `transformer.attention.qkv`
- `transformer.attention.scaling`
- `transformer.attention.causal-mask`
- `transformer.multihead.reshape`
- `transformer.position.rope`
- `transformer.norm.rmsnorm`
- `transformer.ffn.swiglu`
- `decoder.objective.autoregressive-factorization`
- `pretraining.optimization.adamw`
- `posttraining.ppo.clipping`
- `posttraining.dpo.objective`
- `posttraining.grpo.group-advantage`
- `reasoning.inference.self-consistency`
- `inference.cache.kv-memory`
- `inference.kernel.flash-attention`
- `peft.lora.low-rank-update`
- `moe.routing.top-k`
- `distributed.fsdp.parameter-sharding`
- `evaluation.reliability.cvar`

Each node needs explicit prerequisites and may link to a lesson, experiment, interview tree, and coding challenge.

## 9. Current UI information-density problems

### Knowledge map

- All 12 topic cards, four lane descriptions, arrows, English subtitles, icons, per-card progress, and a four-cell metric band are visible at once.
- Five accent colors encode topic identity rather than learning state, weakening the answer to “what should I do next?”.
- The map is visually a dashboard of cards, not a progressive dependency path.

### Learning page

- The right rail repeats chapter goals already present in the header/article.
- Strong content is hard-coded in one component while generic modules expose placeholders.
- Formula boxes, variable tables, callouts, cards, and bordered article shells create unnecessary nested borders.

### Practice page

- The question list is flat; 150+ questions would be unusable without module grouping and collapse state.
- Filters describe topic/difficulty but not the current learning path or interview tree.

### Coding page

- A four-column tab strip cannot scale to 30 problems.
- Runtime metadata occupies a prominent header block.
- Run/Submit controls scroll away on long problem/result pages.

### Review center

- Statistics appear before the actual review action.
- There is no due-review model or topic-level review recommendation.
- Opening a topic is currently counted as progress even though it should only mean Seen.

### Shell/search

- Sidebar width is already 248 px, but has no collapsed desktop state.
- Search width (up to 430 px) dominates the top bar and only searches coarse topics/questions, not nodes, equations, or coding tasks.

## Implementation architecture

1. Introduce centralized `tracks`, `modules`, and `knowledgeNodes` data with stable IDs and prerequisites.
2. Keep existing `Topic` IDs as route-compatible module aliases during migration.
3. Extend progress to Seen/Completed/Mastered knowledge nodes while preserving existing local data.
4. Redesign the map around 12 major tracks with one expanded learning path at a time.
5. Add reusable `MathInsight`, `DerivationBlock`, and `TensorShape` components.
6. Move high-priority node content out of `LearnPage.tsx` into centralized lesson data/components without discarding existing authored explanations.
7. Group question navigation by curriculum module and store collapse state locally.
8. Replace coding tabs with a module/problem navigator and retain the current editor/judge.
9. Make review recommendations actionable before secondary statistics.
10. Reduce borders through spacing and background hierarchy, then verify at 390, 768, and 1440+ widths.
