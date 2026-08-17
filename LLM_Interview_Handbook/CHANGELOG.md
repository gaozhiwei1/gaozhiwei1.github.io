# Changelog

## 2026 Edition v2.1

### Final Polish

- Clarified that attention's distinctive role is cross-token communication while Q/K/V/O projections also transform feature channels; FFN remains position-wise nonlinear feature transformation.
- Added a focused Scaling Laws and compute-optimal training section with empirical-law caveats, two interview drill-downs, a numerical planning exercise, and ten page-linked review questions.
- Added verified primary references for scaling laws, test-time compute, verifiers, process supervision, reasoning self-training, reasoning distillation, and publicly disclosed reasoning-oriented post-training.
- Split the formula cheat sheet into separate Architecture/Inference and Training/Post-Training pages at a readable body font size.
- Reset running-header marks for the reference section and updated publication metadata to v2.1.
- Audited all 15 TikZ figures and re-spaced the crowded pipelines so arrow shafts, arrowheads, node bodies, and labels remain visually distinct; this includes the pretraining, inference, reasoning, RLVR, distillation, RLHF, PPO/GRPO, and RoPE figures.

### Technical Audit

- Rechecked FFN and SwiGLU dimensions and parameter arithmetic, RMSNorm and RoPE formulas, KV-cache byte accounting, MHA/GQA cache ratios, FlashAttention exactness, LoRA parameter counts, PPO old/reference policy roles, DPO $\beta$, GRPO group advantages, and pass@$k$ notation.
- Corrected the overly strict “attention = token mixing, FFN = channel mixing” decomposition wherever it appeared; no additional formula correction was required in the audited topics.

## 2026 Edition v2.0

### Productization

- Reworked the cover as `LLM INTERVIEW HANDBOOK 2026` and removed the generated-date wording.
- Added a version, audience, and personal-use copyright page.
- Added role-specific preparation routes, a last-day checklist, a formula cheat sheet, and a page-linked question index.
- Replaced the nearly blank ending with references and practical review material.

### Interview Depth

- Expanded the rapid-review bank from 103 to 200 non-trivial questions with one-line answers and detailed-page references.
- Added 46 deep-dive interview boxes using the recurring structure: 20-second answer, technical explanation, and likely follow-ups.
- Added 8 numerical exercises and 9 `容易答错` boxes.
- Shifted emphasis from definitions to design motivation, alternatives, tensor shapes, derivations, memory, bandwidth, failure modes, and system tradeoffs.

### New Major Content

- Added Reasoning Models, Thinking vs Non-Thinking, test-time scaling, self-consistency, Best-of-N, verifier failure modes, RLVR, and reasoning distillation.
- Added deep FFN/SwiGLU coverage, residual stream, embedding/LM head, weight tying, and Q/K/V projection analysis.
- Added MLA, QLoRA, knowledge distillation, training-memory accounting, and LLM evaluation.
- Expanded SFT, reward modeling, PPO, DPO, GRPO, MoE, distributed training, RAG, and Agent interview chains.
- Added five focused diagrams for FFN expansion, reasoning modes, RLVR, reasoning distillation, and LoRA.
- Added three executable-style code examples for Best-of-N selection, a LoRA linear layer, and pass@k estimation.

### Technical Corrections and Clarifications

- Clarified that KV Cache removes repeated historical K/V projection but does not make attention `O(1)` in context length.
- Clarified that FlashAttention preserves exact dense-attention results and primarily reduces HBM traffic and intermediate materialization, not asymptotic arithmetic complexity.
- Corrected asymmetric quantization notation to include the zero point in quantization and dequantization.
- Distinguished GQA's projection, cache-capacity, and decode-bandwidth effects across prefill and decode.
- Distinguished PPO's old policy from its reference policy and clarified that clipping is not a strict global KL constraint.
- Clarified that GRPO omits an independently trained value model but still uses a group-relative baseline.
- Standardized LoRA matrix shapes and parameter-count conventions.
- Added explicit assumptions and peak-memory caveats to ZeRO/FSDP and mixed-precision Adam estimates.
- Audited causal-mask direction, attention scaling, tensor shapes, KV-cache formulas, RoPE dimensions, DPO/GRPO notation, and formula typography.

### Build and QA

- Compiled the complete XeLaTeX document repeatedly until cross-references and page counts stabilized.
- Removed all overfull/underfull box, undefined-reference, and bookmark-level warnings.
- Rendered and visually inspected representative pages for the cover, Transformer, attention, FFN, RoPE, MHA/MQA/GQA, KV Cache, FlashAttention, Reasoning/RLVR, LoRA, PPO/DPO/GRPO, MoE, distributed training, the question bank, and the formula sheet.
- Remaining build output is limited to three TeX Live Fandol `fontspec` Script metadata warnings; glyph rendering is unaffected.
