import test from "node:test";
import assert from "node:assert/strict";
import { executeChallenge } from "../server/executor.mjs";
import { serverChallenges } from "../server/challenges.mjs";

test("local judge exposes the complete 33-problem curriculum", () => {
  assert.equal(Object.keys(serverChallenges).length, 33);
  for (const [id, challenge] of Object.entries(serverChallenges)) {
    assert.ok(challenge.visibleTests.length >= 1, `${id} needs visible tests`);
    assert.ok(challenge.hiddenTests.length >= 1, `${id} needs hidden tests`);
  }
});

test("local judge accepts a stable softmax implementation", async () => {
  const result = await executeChallenge({
    challengeId: "stable-softmax",
    mode: "submit",
    code: `import math
def stable_softmax(logits, temperature=1.0):
    scaled = [value / temperature for value in logits]
    maximum = max(scaled)
    values = [math.exp(value - maximum) for value in scaled]
    return [value / sum(values) for value in values]
`,
  });
  assert.equal(result.ok, true);
  assert.equal(result.judge.passed, true);
  assert.equal(result.judge.totalCount, 5);
});

test("local judge reports failed edge cases without exposing hidden inputs", async () => {
  const result = await executeChallenge({
    challengeId: "kv-cache-gib",
    mode: "submit",
    code: `def kv_cache_gib(*args):
    return 0
`,
  });
  assert.equal(result.ok, true);
  assert.equal(result.judge.passed, false);
  const hidden = result.judge.tests.find((item) => item.hidden);
  assert.equal(hidden.input, null);
  assert.equal(hidden.expected, null);
});

test("local judge evaluates the stable DPO softplus form", async () => {
  const result = await executeChallenge({
    challengeId: "dpo-loss",
    mode: "submit",
    code: `import math
def dpo_loss(pc, pr, rc, rr, beta=0.1):
    value = -beta * ((pc - pr) - (rc - rr))
    return max(value, 0.0) + math.log1p(math.exp(-abs(value)))
`,
  });
  assert.equal(result.ok, true);
  assert.equal(result.judge.passed, true);
});

test("local judge covers all four PPO clipping directions", async () => {
  const result = await executeChallenge({
    challengeId: "ppo-clipped-objective",
    mode: "submit",
    code: `def ppo_clipped_objective(ratios, advantages, epsilon=0.2):
    values = []
    for ratio, advantage in zip(ratios, advantages):
        clipped = min(max(ratio, 1 - epsilon), 1 + epsilon)
        values.append(min(ratio * advantage, clipped * advantage))
    return sum(values) / len(values)
`,
  });
  assert.equal(result.ok, true);
  assert.equal(result.judge.passed, true);
});

test("local judge validates causal scaled dot-product attention", async () => {
  const result = await executeChallenge({
    challengeId: "scaled-dot-attention",
    mode: "submit",
    code: `import math
def scaled_dot_attention(q, k, v, causal=True):
    output = []
    for i, query in enumerate(q):
        scores = []
        for j, key in enumerate(k):
            scores.append(sum(a*b for a,b in zip(query,key)) / math.sqrt(len(query)) if (not causal or j <= i) else float("-inf"))
        maximum = max(scores)
        weights = [math.exp(score - maximum) for score in scores]
        total = sum(weights)
        output.append([sum(weights[j] * v[j][d] for j in range(len(v))) / total for d in range(len(v[0]))])
    return output
`,
  });
  assert.equal(result.ok, true);
  assert.equal(result.judge.passed, true);
});
