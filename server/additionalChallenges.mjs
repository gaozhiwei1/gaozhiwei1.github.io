export const additionalServerChallenges = {
  "cross-entropy": {
    functionName: "cross_entropy",
    visibleTests: [
      { args: [[1, 2, 3], 2], expected: 0.4076059644 },
      { args: [[1000, 1000], 0], expected: 0.6931471806 },
    ],
    hiddenTests: [
      { args: [[0], 0], expected: 0 },
      { args: [[-1000, 0], 0], expected: 1000 },
      { args: [[2, 0, -2], 1], expected: 2.1429316285 },
    ],
  },
  "top-k": {
    functionName: "top_k_indices",
    visibleTests: [
      { args: [[0.2, 0.9, 0.9, 0.1], 2], expected: [1, 2] },
      { args: [[-2, -1, -3], 1], expected: [1] },
    ],
    hiddenTests: [
      { args: [[5], 1], expected: [0] },
      { args: [[3, 1, 2], 3], expected: [0, 2, 1] },
      { args: [[1, 1, 1, 1], 3], expected: [0, 1, 2] },
    ],
  },
  "top-p-sampling": {
    functionName: "top_p_indices",
    visibleTests: [
      { args: [[0.5, 0.3, 0.15, 0.05], 0.8], expected: [0, 1] },
      { args: [[0.4, 0.3, 0.2, 0.1], 0.65], expected: [0, 1] },
    ],
    hiddenTests: [
      { args: [[0.7, 0.2, 0.1], 0.01], expected: [0] },
      { args: [[0.7, 0.2, 0.1], 1], expected: [0, 1, 2] },
      { args: [[0.25, 0.25, 0.25, 0.25], 0.5], expected: [0, 1] },
    ],
  },
  "gradient-clipping": {
    functionName: "clip_grad_norm",
    visibleTests: [
      { args: [[3, 4], 2], expected: [1.2, 1.6] },
      { args: [[0.1, 0.2], 1], expected: [0.1, 0.2] },
    ],
    hiddenTests: [
      { args: [[0, 0], 1], expected: [0, 0] },
      { args: [[-6, 8], 5], expected: [-3, 4] },
      { args: [[1], 0.25], expected: [0.25] },
    ],
  },
  "adamw-step": {
    functionName: "adamw_step",
    visibleTests: [
      { args: [[1], [0.1], [0], [0], 1, 0.01, 0.9, 0.999, 1e-8, 0.1], expected: [[0.989000001], [0.01], [0.00001]], tolerance: 1e-7 },
      { args: [[1, -1], [0, 0], [0, 0], [0, 0], 1, 0.1, 0.9, 0.999, 1e-8, 0.1], expected: [[0.99, -0.99], [0, 0], [0, 0]] },
    ],
    hiddenTests: [
      { args: [[2], [-0.5], [0], [0], 1, 0.001, 0.9, 0.999, 1e-8, 0], expected: [[2.001], [-0.05], [0.00025]], tolerance: 1e-7 },
      { args: [[0], [1], [0], [0], 1, 0.01, 0, 0, 1e-8, 0], expected: [[-0.0099999999], [1], [1]], tolerance: 1e-7 },
    ],
  },
  "linear-warmup": {
    functionName: "warmup_lr",
    visibleTests: [
      { args: [500, 1000, 0.001], expected: 0.0005 },
      { args: [1000, 1000, 0.001], expected: 0.001 },
    ],
    hiddenTests: [
      { args: [0, 1000, 0.001], expected: 0 },
      { args: [2000, 1000, 0.001], expected: 0.001 },
      { args: [10, 0, 0.01], expected: 0.01 },
    ],
  },
  "lora-parameter-count": {
    functionName: "lora_parameter_counts",
    visibleTests: [
      { args: [4096, 4096, 16], expected: [16777216, 131072] },
      { args: [768, 3072, 8], expected: [2359296, 30720] },
    ],
    hiddenTests: [
      { args: [1, 1, 1], expected: [1, 2] },
      { args: [1024, 4096, 32], expected: [4194304, 163840] },
      { args: [128, 64, 4], expected: [8192, 768] },
    ],
  },
  "pass-at-k": {
    functionName: "pass_at_k",
    visibleTests: [
      { args: [10, 2, 1], expected: 0.2 },
      { args: [10, 2, 10], expected: 1 },
    ],
    hiddenTests: [
      { args: [100, 0, 10], expected: 0 },
      { args: [5, 5, 1], expected: 1 },
      { args: [10, 1, 2], expected: 0.2 },
    ],
  },
  "rmsnorm": {
    functionName: "rmsnorm",
    visibleTests: [
      { args: [[3, 4], [1, 1], 0], expected: [0.8485281374, 1.1313708499] },
      { args: [[1, -1], [2, 0.5], 0], expected: [2, -0.5] },
    ],
    hiddenTests: [
      { args: [[0, 0], [1, 1], 1e-6], expected: [0, 0] },
      { args: [[2], [3], 0], expected: [3] },
      { args: [[1, 2, 2], [1, 1, 1], 0], expected: [0.5773502692, 1.1547005384, 1.1547005384] },
    ],
  },
  "rotary-embedding": {
    functionName: "apply_rope",
    visibleTests: [
      { args: [[1, 0, 0, 1], [0, 1], [1, 0]], expected: [0, 1, 0, 1] },
      { args: [[1, 2], [1], [0]], expected: [1, 2] },
    ],
    hiddenTests: [
      { args: [[1, 2], [0], [-1]], expected: [2, -1] },
      { args: [[3, 4, 5, 12], [0.6, 0.8], [0.8, 0.6]], expected: [-1.4, 4.8, -3.2, 12.6] },
      { args: [[0, 0], [0.5], [0.8660254038]], expected: [0, 0] },
    ],
  },
  "scaled-dot-attention": {
    functionName: "scaled_dot_attention",
    visibleTests: [
      { args: [[[1, 0], [0, 1]], [[1, 0], [0, 1]], [[2], [4]], true], expected: [[2], [3.3395230987]], tolerance: 1e-5 },
      { args: [[[1]], [[1]], [[5]], true], expected: [[5]] },
    ],
    hiddenTests: [
      { args: [[[0], [0]], [[1], [2]], [[3], [7]], true], expected: [[3], [5]] },
      { args: [[[0]], [[1], [2]], [[3], [7]], false], expected: [[5]] },
      { args: [[[1, 1]], [[1, 1], [-1, -1]], [[10, 0], [0, 10]], false], expected: [[9.4419278028, 0.5580721972]], tolerance: 1e-5 },
    ],
  },
  "causal-mask": {
    functionName: "causal_mask",
    visibleTests: [
      { args: [3], expected: [[0, 1, 1], [0, 0, 1], [0, 0, 0]] },
      { args: [1], expected: [[0]] },
    ],
    hiddenTests: [
      { args: [2], expected: [[0, 1], [0, 0]] },
      { args: [4], expected: [[0, 1, 1, 1], [0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]] },
    ],
  },
  "multi-head-shapes": {
    functionName: "multi_head_shape",
    visibleTests: [
      { args: [2, 128, 4096, 32], expected: [2, 32, 128, 128] },
      { args: [1, 8, 768, 12], expected: [1, 12, 8, 64] },
    ],
    hiddenTests: [
      { args: [4, 1, 64, 1], expected: [4, 1, 1, 64] },
      { args: [16, 2048, 8192, 64], expected: [16, 64, 2048, 128] },
    ],
  },
  "gqa-group-map": {
    functionName: "gqa_mapping",
    visibleTests: [
      { args: [8, 2], expected: [0, 0, 0, 0, 1, 1, 1, 1] },
      { args: [4, 4], expected: [0, 1, 2, 3] },
    ],
    hiddenTests: [
      { args: [32, 8], expected: [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7] },
      { args: [6, 1], expected: [0, 0, 0, 0, 0, 0] },
    ],
  },
  "swiglu": {
    functionName: "swiglu",
    visibleTests: [
      { args: [[0, 1], [2, 3]], expected: [0, 2.1931757359] },
      { args: [[-1], [2]], expected: [-0.5378828427] },
    ],
    hiddenTests: [
      { args: [[], []], expected: [] },
      { args: [[10, -10], [1, 1]], expected: [9.9995460213, -0.0004539787] },
      { args: [[0, 0, 0], [1, 2, 3]], expected: [0, 0, 0] },
    ],
  },
  "transformer-block": {
    functionName: "residual_block",
    visibleTests: [
      { args: [[1, 2], [0.5, -1], [2, 3]], expected: [3.5, 4] },
      { args: [[0], [1], [-1]], expected: [0] },
    ],
    hiddenTests: [
      { args: [[1, 1, 1], [1, 2, 3], [3, 2, 1]], expected: [5, 5, 5] },
      { args: [[], [], []], expected: [] },
    ],
  },
  "temperature-sampling": {
    functionName: "temperature_probs",
    visibleTests: [
      { args: [[0, 1], 0.5], expected: [0.119202922, 0.880797078] },
      { args: [[1000, 1001], 1], expected: [0.2689414214, 0.7310585786] },
    ],
    hiddenTests: [
      { args: [[1, 1, 1], 2], expected: [0.3333333333, 0.3333333333, 0.3333333333] },
      { args: [[0, 2], 2], expected: [0.2689414214, 0.7310585786] },
      { args: [[5], 0.1], expected: [1] },
    ],
  },
  "beam-search": {
    functionName: "beam_select",
    visibleTests: [
      { args: [[[[1], -1], [[1, 2], -1.2]], 1, 1], expected: [[1, 2]] },
      { args: [[[[1], -0.2], [[2], -0.1], [[3], -0.3]], 2, 0], expected: [[2], [1]] },
    ],
    hiddenTests: [
      { args: [[[[1,2], -2], [[3,4,5,6], -3]], 1, 1], expected: [[3,4,5,6]] },
      { args: [[[[2], -1], [[1], -1]], 2, 1], expected: [[2], [1]] },
      { args: [[[[1], -1]], 1, 0.5], expected: [[1]] },
    ],
  },
  "speculative-accept": {
    functionName: "speculative_accept",
    visibleTests: [
      { args: [[0.4, 0.1], [0.2, 0.5], [0.9, 0.3]], expected: [1, 0] },
      { args: [[0.2], [0.2], [1]], expected: [1] },
    ],
    hiddenTests: [
      { args: [[0.1, 0.9], [0.5, 0.5], [0.1, 0.99]], expected: [1, 1] },
      { args: [[0.1], [0.5], [0.21]], expected: [0] },
      { args: [[], [], []], expected: [] },
    ],
  },
  "reward-ranking-loss": {
    functionName: "reward_ranking_loss",
    visibleTests: [
      { args: [2, 1], expected: 0.3132616875 },
      { args: [0, 0], expected: 0.6931471806 },
    ],
    hiddenTests: [
      { args: [-10, 10], expected: 20.0000000021 },
      { args: [10, -10], expected: 0.0000000021 },
      { args: [-1, -2], expected: 0.3132616875 },
    ],
  },
  "policy-gradient-loss": {
    functionName: "policy_gradient_loss",
    visibleTests: [
      { args: [[-0.2, -1], [1, -1]], expected: -0.4 },
      { args: [[-1, -2], [0, 0]], expected: 0 },
    ],
    hiddenTests: [
      { args: [[-1], [2]], expected: 2 },
      { args: [[-0.5, -0.5], [1, 1]], expected: 0.5 },
      { args: [[-0.2, -0.7], [-1, 2]], expected: 0.6 },
    ],
  },
  "ppo-ratio": {
    functionName: "ppo_ratios",
    visibleTests: [
      { args: [[-0.5, -1], [-1, -1]], expected: [1.6487212707, 1] },
      { args: [[-2], [-1]], expected: [0.3678794412] },
    ],
    hiddenTests: [
      { args: [[], []], expected: [] },
      { args: [[0, 0], [0, -0.6931471806]], expected: [1, 2] },
      { args: [[-10], [-10]], expected: [1] },
    ],
  },
  "ppo-clipped-objective": {
    functionName: "ppo_clipped_objective",
    visibleTests: [
      { args: [[1.5, 0.5], [1, -1], 0.2], expected: 0.2 },
      { args: [[1, 1], [1, -1], 0.2], expected: 0 },
    ],
    hiddenTests: [
      { args: [[2], [1], 0.2], expected: 1.2 },
      { args: [[0.5], [-1], 0.2], expected: -0.8 },
      { args: [[2], [-1], 0.2], expected: -2 },
    ],
  },
  "gae": {
    functionName: "gae",
    visibleTests: [
      { args: [[1, 1], [0.5, 0.4, 0], 1, 1], expected: [1.5, 0.6] },
      { args: [[1], [0, 0], 0.99, 0.95], expected: [1] },
    ],
    hiddenTests: [
      { args: [[0, 0], [1, 1, 1], 1, 0], expected: [0, 0] },
      { args: [[1, 2, 3], [0, 0, 0, 0], 1, 1], expected: [6, 5, 3] },
      { args: [[], [0], 0.99, 0.95], expected: [] },
    ],
  },
  "grpo-clipped-loss": {
    functionName: "grpo_surrogate",
    visibleTests: [
      { args: [[1, 1, 1], [1, 2, 3]], expected: 0, tolerance: 1e-5 },
      { args: [[1, 1], [0.5, 0.5]], expected: 0 },
    ],
    hiddenTests: [
      { args: [[1.5, 0.5], [2, 0], 0.2], expected: 0.1999998, tolerance: 1e-5 },
      { args: [[1, 1, 1, 1], [-1, 0, 1, 2]], expected: 0, tolerance: 1e-5 },
      { args: [[2], [7]], expected: 0 },
    ],
  },
  "topk-router": {
    functionName: "topk_router",
    visibleTests: [
      { args: [[0, 1, 2], 2], expected: [[2, 1], [0.7310585786, 0.2689414214]] },
      { args: [[0, 0], 1], expected: [[0], [1]] },
    ],
    hiddenTests: [
      { args: [[3, 2, 1, 0], 2], expected: [[0, 1], [0.7310585786, 0.2689414214]] },
      { args: [[1, 1, 1], 3], expected: [[0, 1, 2], [0.3333333333, 0.3333333333, 0.3333333333]] },
      { args: [[-1000, 0], 1], expected: [[1], [1]] },
    ],
  },

  "kv-cache-update": {
    functionName: "append_kv_cache",
    visibleTests: [
      { args: [[[1,0]], [[2,0]], [0,1], [0,2]], expected: [[[1,0],[0,1]], [[2,0],[0,2]]] },
      { args: [[], [], [1,2], [3,4]], expected: [[[1,2]], [[3,4]]] },
    ],
    hiddenTests: [
      { args: [[[1],[2]], [[3],[4]], [5], [6]], expected: [[[1],[2],[5]], [[3],[4],[6]]] },
    ],
  },
  "lora-linear": {
    functionName: "lora_linear",
    visibleTests: [
      { args: [[1,2], [[1,0],[0,1]], [[1,0]], [[1],[2]], 1], expected: [2,4] },
      { args: [[2], [[3]], [[1]], [[4]], 2], expected: [22] },
    ],
    hiddenTests: [
      { args: [[1,1], [[0,0]], [[1,1],[1,-1]], [[1,2]], 2], expected: [2] },
    ],
  },
  "infonce-loss": {
    functionName: "infonce_loss",
    visibleTests: [
      { args: [[[2,0],[0,2]], 1], expected: 0.1269280110, tolerance: 1e-6 },
      { args: [[[0]], 1], expected: 0 },
    ],
    hiddenTests: [
      { args: [[[0,0],[0,0]], 1], expected: 0.6931471806, tolerance: 1e-6 },
      { args: [[[1000,999],[999,1000]], 0.5], expected: 0.1269280110, tolerance: 1e-6 },
    ],
  },
};
