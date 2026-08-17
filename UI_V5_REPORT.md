# Math2LLM UI / Navigation / Figure Integration V5

This revision focuses on three issues reported from the V4 browser view.

## 1. Learning-page header readability

- Breadcrumb text increased from the old 10px-scale treatment to a readable 0.86rem desktop size.
- TRACK metadata increased and no longer exposes the raw internal node id in the primary header.
- Header metadata now reads `TRACK xx · Track title · Module title`.
- The back action is now `返回本模块` rather than a generic jump to the root map.

## 2. Parent-level navigation

Knowledge-map routes now support:

```text
#/map/<track-id>/<module-id>
```

When a learner opens a node from the map, the current map track/module is written into the current browser-history entry before navigating to the lesson. Therefore browser Back returns to the same module instead of reopening the generic curriculum root.

The in-page back button also directly returns to the current module.

## 3. Practice navigation stability

- Related practice questions now prioritize exact `nodeId` matches before broad keyword matches.
- Lesson/practice CTAs prefer a question that the current plan can access.
- The Next Question action clears the current result before navigation.
- This avoids jumping into an unrelated/protected empty client record when an accessible question exists.

## 4. PDF handbook figures integrated into lessons

All 15 TikZ diagrams from `LLM_Interview_Handbook/main.pdf` were rendered as responsive SVG assets and mapped to the closest learning node/section:

1. Transformer block overview -> `decoder.architecture.modern-block`
2. Self-Attention data flow -> `transformer.attention.why`
3. MHA/MQA/GQA -> `transformer.multihead.gqa`
4. KV Cache two-stage view -> `inference.cache.kv`
5. RoPE geometry -> `transformer.position.rope`
6. Pretraining pipeline -> `pretraining.data.sources`
7. RLHF stages -> `posttraining.sft.masking`
8. PPO vs GRPO -> `posttraining.ppo.clipping`
9. MoE routing -> `moe.routing.why-ffn`
10. FFN expansion -> `transformer.ffn.standard`
11. Reasoning modes -> `reasoning.behavior.thinking`
12. RLVR loop -> `reasoning.training.rlvr`
13. Reasoning distillation -> `reasoning.training.distillation`
14. LoRA branch -> `peft.lora.update`
15. Prefill/decode timeline -> `inference.cache.prefill-decode`

Gold articles place diagrams after the relevant mathematical section instead of dumping every diagram at the top. Other lessons place the diagram directly after the conceptual introduction.

SVGs live under:

```text
public/figures/handbook/
```

## Validation

- TypeScript: PASS
- ESLint: PASS
- Vitest: 21/21 PASS
- Server/SaaS/security tests: 22/22 PASS
- Local Runner tests: 13/13 PASS (run with `PYTHONPATH=local-runner/src` in the offline validation environment)
- Production Vite build: PASS
- 15 figure assets copied into production `dist/figures/handbook`

Automated browser screenshot QA could not run in this environment because Chromium blocks localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`; final visual inspection should be done in the user's local browser.
