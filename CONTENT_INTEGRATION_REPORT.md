# Math2LLM Content Deepening — Integration Report

## What changed

This pass focuses on the current product bottleneck: content depth.

### Gold Standard long-form lessons

Nine public long-form articles are now integrated directly into the learning experience:

- Cross-Entropy / KL
- Log-Derivative Trick
- Importance Sampling
- Attention
- RoPE
- GQA
- Policy Gradient
- Value / Q / Advantage / GAE
- KV Cache

Three PRO articles remain server-side so their full body is not shipped in the anonymous browser bundle:

- PPO
- DPO
- GRPO

The public curriculum still contains **118 knowledge nodes**. No index-based question IDs were shifted.

### Content presentation

Gold lessons now use a dedicated long-form renderer:

- problem setup before formulas
- explicit notation and mathematical prerequisites
- step-by-step derivations
- numerical examples
- Math ↔ code mapping
- common mistakes
- interview follow-ups
- interactive-lab ideas

The mathematical derivation style is intentionally restrained: whitespace, typography and equations rather than nested decorative cards.

### Curriculum changes

Existing nodes are reused as stable hosts instead of inserting new nodes that would shift existing generated IDs:

- `math.probability.random-expectation` now hosts Log-Derivative Trick depth
- `posttraining.ppo.ratio` now hosts Importance Sampling depth
- `transformer.attention.why` is the main Attention gold lesson

### PRO content security

PPO / DPO / GRPO full Markdown is stored in:

```text
server/saas/premium-articles/
```

PRO clients fetch it through:

```text
GET /api/premium/article/:topicId
```

The endpoint reuses the existing authenticated active-PRO authorization check.

### Login / payment readiness

The repository already contains the Supabase/Stripe architecture, but the uploaded project does **not** contain real credentials. A new diagnostic command makes this explicit:

```bash
npm run check:saas
```

At the time of this integration the following are unset:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
APP_BASE_URL
```

Follow:

```text
docs/saas-quickstart.md
```

Do not put real service-role or Stripe secret keys in source control.

## Verification completed

- Frontend Vitest: 21/21 passing
- Node/SaaS/security/payment tests: 22/22 passing
- Local Runner tests: 13/13 passing
- ESLint: passing
- TypeScript build: passing
- Vite production build: passing

The Local Runner test timeout used by the test harness was relaxed from 0.2s to 0.8s so subprocess-startup variance does not incorrectly mask the intended timeout/output-limit assertions. Production Runner limits were not loosened by this change.

## Recommended manual pages to inspect first

```text
#/learn/posttraining.rl.policy-gradient
#/learn/posttraining.rl.value-advantage
#/learn/posttraining.ppo.ratio
#/learn/transformer.attention.why
#/learn/transformer.position.rope
#/learn/transformer.multihead.gqa
#/learn/inference.cache.kv
```

After Supabase + Stripe TEST MODE are configured, also inspect:

```text
#/learn/posttraining.ppo.clipping
#/learn/posttraining.dpo.derivation
#/learn/posttraining.grpo.group-advantage
```

## Suggested next content batch

Do not expand all 118 nodes at once. A sensible next batch is:

1. FlashAttention
2. RMSNorm + Pre-Norm
3. SwiGLU / FFN
4. LoRA / QLoRA
5. Reward Model / Bradley-Terry
6. SFT objective and masking
7. PagedAttention / Continuous Batching
8. Speculative Decoding
9. MoE routing and load balancing
10. DDP / TP / PP / FSDP / ZeRO

These should reuse the same Gold Standard content rules.
