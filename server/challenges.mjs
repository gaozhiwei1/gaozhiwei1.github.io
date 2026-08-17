import { additionalServerChallenges } from "./additionalChallenges.mjs";

export const serverChallenges = {
  "stable-softmax": {
    functionName: "stable_softmax",
    visibleTests: [
      { args: [[1, 2, 3], 1], expected: [0.0900305732, 0.2447284711, 0.6652409558] },
      { args: [[1000, 1001], 1], expected: [0.2689414214, 0.7310585786] },
    ],
    hiddenTests: [
      { args: [[0, 0, 0, 0], 1], expected: [0.25, 0.25, 0.25, 0.25] },
      { args: [[-1000, -1001, -1002], 0.5], expected: [0.8668133322, 0.1173104278, 0.0158762399] },
      { args: [[4.2], 2], expected: [1] },
    ],
  },
  "kv-cache-gib": {
    functionName: "kv_cache_gib",
    visibleTests: [
      { args: [32, 4, 8192, 8, 128, 2], expected: 4 },
      { args: [32, 4, 8192, 32, 128, 2], expected: 16 },
    ],
    hiddenTests: [
      { args: [1, 1, 1024, 1, 64, 2], expected: 0.000244140625 },
      { args: [80, 2, 32768, 8, 128, 1], expected: 10 },
      { args: [40, 8, 4096, 4, 128, 4], expected: 5 },
    ],
  },
  "grpo-advantages": {
    functionName: "group_advantages",
    visibleTests: [
      { args: [[1, 2, 3]], expected: [-1.2247433714, 0, 1.2247433714], tolerance: 1e-5 },
      { args: [[0.5, 0.5, 0.5]], expected: [0, 0, 0], tolerance: 1e-6 },
    ],
    hiddenTests: [
      { args: [[-2, 0, 2, 4]], expected: [-1.3416401865, -0.4472133955, 0.4472133955, 1.3416401865], tolerance: 1e-5 },
      { args: [[7]], expected: [0], tolerance: 1e-6 },
      { args: [[0.1, 0.9]], expected: [-0.9999975, 0.9999975], tolerance: 1e-5 },
    ],
  },
  "dpo-loss": {
    functionName: "dpo_loss",
    visibleTests: [
      { args: [-2, -3, -2.5, -2.5, 0.1], expected: 0.6443966601 },
      { args: [-4, -2, -2.5, -2.5, 0.1], expected: 0.7981388694 },
    ],
    hiddenTests: [
      { args: [-2, -2, -2, -2, 0.1], expected: 0.6931471806 },
      { args: [-1, -10, -3, -4, 0.5], expected: 0.0181499279 },
      { args: [-20, -1, -2, -3, 1], expected: 20.0000000021 },
    ],
  },
  ...additionalServerChallenges,
};
