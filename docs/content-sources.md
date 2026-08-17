# Math2LLM Content Sources

This registry records the primary paper or authoritative source used for major technical claims. It is not a bibliography dump: each entry identifies the part of the curriculum it supports. Exact empirical ratios, architecture choices, and benchmark results are treated as source-specific rather than universal laws.

## Foundations, representation, and optimization

- Sennrich, Haddow, and Birch (2016), [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909): BPE-style subword motivation and open-vocabulary trade-offs.
- Kudo (2018), [Subword Regularization: Improving Neural Network Translation Models with Multiple Subword Candidates](https://arxiv.org/abs/1804.10959): Unigram language-model tokenization and subword sampling.
- Kingma and Ba (2015), [Adam: A Method for Stochastic Optimization](https://arxiv.org/abs/1412.6980): Adam moments and bias correction.
- Loshchilov and Hutter (2019), [Decoupled Weight Decay Regularization](https://arxiv.org/abs/1711.05101): AdamW and the distinction between weight decay and an L2 term inside adaptive-gradient updates.

## Transformer architecture

- Vaswani et al. (2017), [Attention Is All You Need](https://arxiv.org/abs/1706.03762): scaled dot-product attention, multi-head attention, sinusoidal positions, residuals, and the original Transformer block.
- Zhang and Sennrich (2019), [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467): RMSNorm definition and re-scaling invariance motivation.
- Su et al. (2021), [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864): rotary position encoding and relative-position behavior in Q/K inner products.
- Shazeer (2020), [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202): gated FFN variants including SwiGLU.
- Shazeer (2019), [Fast Transformer Decoding: One Write-Head is All You Need](https://arxiv.org/abs/1911.02150): Multi-Query Attention.
- Ainslie et al. (2023), [GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245): Grouped-Query Attention and the quality/speed trade-off between MHA and MQA.

## Pretraining and scaling

- Kaplan et al. (2020), [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361): empirical loss trends over model size, data, and compute.
- Hoffmann et al. (2022), [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556): compute-optimal allocation between model parameters and training tokens under the studied setup.

The fitted exponents and parameter/token ratios in these papers are empirical results under particular model families, data pipelines, and compute definitions. The curriculum must not present them as mathematical constants.

## Inference

- Dao et al. (2022), [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135): exact tiled attention and reduced HBM traffic/materialization.
- Kwon et al. (2023), [Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180): block-based KV-cache management and serving-time fragmentation.
- Leviathan, Kalman, and Matias (2023), [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192): draft/target proposal-verification and exact target-distribution sampling.
- Frantar et al. (2023), [GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://arxiv.org/abs/2210.17323): second-order weight-only post-training quantization.
- Lin et al. (2024), [AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration](https://arxiv.org/abs/2306.00978): activation-aware weight quantization and salient-weight protection.

## Post-training and reasoning

- Schulman et al. (2015), [High-Dimensional Continuous Control Using Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438): GAE and the bias/variance role of `gamma` and `lambda`.
- Schulman et al. (2017), [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347): probability ratio and clipped surrogate objective.
- Ouyang et al. (2022), [Training Language Models to Follow Instructions with Human Feedback](https://arxiv.org/abs/2203.02155): the public SFT/reward-model/PPO pipeline used as an RLHF case study.
- Rafailov et al. (2023), [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290): DPO derivation from a KL-regularized reward objective.
- Shao et al. (2024), [DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models](https://arxiv.org/abs/2402.03300): the published GRPO formulation and mathematical-reasoning training report.
- Wang et al. (2022), [Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171): multiple reasoning samples and answer aggregation.
- Cobbe et al. (2021), [Training Verifiers to Solve Math Word Problems](https://arxiv.org/abs/2110.14168): candidate generation and verifier ranking for mathematical problems.
- Lightman et al. (2023), [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050): process supervision versus outcome supervision in the reported setting.
- Snell et al. (2024), [Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters](https://arxiv.org/abs/2408.03314): adaptive test-time compute and verifier-guided search.
- DeepSeek-AI et al. (2025), [DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948): only the training stages, evaluations, and distillation information explicitly disclosed in the public report.

Public technical reports support only their disclosed training procedure. They do not justify claims about undisclosed internal data, reward construction, or proprietary training recipes.

## PEFT, MoE, and distributed training

- Hu et al. (2022), [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685): low-rank parameter updates and mergeable adapters.
- Dettmers et al. (2023), [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314): frozen quantized base weights with trainable LoRA adapters.
- Shazeer et al. (2017), [Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer](https://arxiv.org/abs/1701.06538): sparse routing, expert capacity, and load balancing.
- Rajbhandari et al. (2020), [ZeRO: Memory Optimizations Toward Training Trillion Parameter Models](https://arxiv.org/abs/1910.02054): sharding optimizer states, gradients, and parameters.
- Zhao et al. (2023), [PyTorch FSDP: Experiences on Scaling Fully Sharded Data Parallel](https://arxiv.org/abs/2304.11277): FSDP design and operational experience.

## Evaluation and reliability

- Chen et al. (2021), [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374): HumanEval and the pass@k estimator.
- Liu et al. (2023), [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172): position-dependent use of long contexts.
- Guo et al. (2017), [On Calibration of Modern Neural Networks](https://arxiv.org/abs/1706.04599): expected calibration error and temperature scaling.
- Rockafellar and Uryasev (2000), [Optimization of Conditional Value-at-Risk](https://doi.org/10.1023/A:1008962930634): CVaR as an expected tail-loss risk measure.

## Source-use rules

1. Paraphrase; do not copy paper prose.
2. Define every symbol used in a lesson equation.
3. Separate a mathematical identity from an empirical observation.
4. Mark implementation-specific choices as such.
5. Do not call a method exact, optimal, or the origin of a technique unless the cited source supports that wording.
