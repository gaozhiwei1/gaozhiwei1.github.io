import crossEntropy from "./articles/01_cross_entropy_kl.md?raw";
import logDerivative from "./articles/02_log_derivative_trick.md?raw";
import importanceSampling from "./articles/03_importance_sampling.md?raw";
import attention from "./articles/04_attention.md?raw";
import rope from "./articles/05_rope.md?raw";
import gqa from "./articles/06_gqa.md?raw";
import policyGradient from "./articles/07_policy_gradient.md?raw";
import valueAdvantageGae from "./articles/08_value_advantage_gae.md?raw";
import kvCache from "./articles/12_kv_cache.md?raw";
import { compactGoldToc, parseGoldArticle, type GoldTocItem } from "./goldMarkdown";

export const publicGoldArticles: Record<string, string> = {
  "math.probability.entropy-crossentropy-kl": crossEntropy,
  "math.probability.random-expectation": logDerivative,
  "posttraining.ppo.ratio": importanceSampling,
  "transformer.attention.why": attention,
  "transformer.position.rope": rope,
  "transformer.multihead.gqa": gqa,
  "posttraining.rl.policy-gradient": policyGradient,
  "posttraining.rl.value-advantage": valueAdvantageGae,
  "inference.cache.kv": kvCache,
};

export const premiumGoldNodeIds = new Set([
  "posttraining.ppo.clipping",
  "posttraining.dpo.derivation",
  "posttraining.grpo.group-advantage",
]);

const premiumGoldHeadings: Record<string, string[]> = {
  "posttraining.ppo.clipping": [
    "PPO 真正要解决的是旧数据上的过度更新",
    "Importance Ratio 为什么自然出现？",
    "为什么只优化 r_t A_t 会失控？",
    "为什么 Advantage 的正负会让 clipping 方向反过来？",
    "三个手算例子把 min 一次搞懂",
    "PPO clipping 不是严格的 Trust Region",
    "PPO 训练通常还有 Critic、GAE 和 Reference KL",
    "面试时应该能回答的完整因果链",
  ],
  "posttraining.dpo.derivation": [
    "DPO 的最终 Loss 为什么会长成 log-prob difference？",
    "先求这个 KL 正则化问题的最优策略",
    "反解 Reward：DPO 最关键的一步",
    "为什么 Preference Pair 会让未知的 Z(x) 自动消失？",
    "把 π* 换成正在训练的 πθ",
    "β 和 Gradient 怎么理解？",
    "一个数值例子：看的是相对 reference 的偏好变化",
    "代码、PPO 对比与常见误区",
  ],
  "posttraining.grpo.group-advantage": [
    "GRPO 不是 PPO 随便删掉 Critic",
    "同一个 Prompt 为什么要采一组 Response？",
    "为什么还要除以组内标准差？",
    "一个三样本例子",
    "Reward 的平移和正比例缩放为什么几乎不改变标准化 Advantage？",
    "为什么 GRPO 仍然需要 Old Policy Ratio 和 Clipping？",
    "为什么 Reference Policy 仍然可能需要？",
    "Group Size 不是越大越好",
    "面试时最应该区分 PPO、GRPO 和 DPO",
  ],
};

export function publicGoldArticleFor(nodeId: string): string | undefined {
  return publicGoldArticles[nodeId];
}

export function hasGoldArticle(nodeId: string): boolean {
  return Boolean(publicGoldArticles[nodeId]) || premiumGoldNodeIds.has(nodeId);
}

export function goldTocFor(nodeId: string): GoldTocItem[] {
  const article = publicGoldArticles[nodeId];
  if (article) return compactGoldToc(parseGoldArticle(article).toc);
  const headings = premiumGoldHeadings[nodeId] ?? [];
  return compactGoldToc(
    headings.map((label, index) => ({ id: `gold-section-${index + 1}`, label })),
  );
}
