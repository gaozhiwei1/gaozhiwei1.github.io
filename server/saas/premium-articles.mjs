import { readFile } from "node:fs/promises";

const articleUrls = {
  "posttraining.ppo.clipping": new URL(
    "./premium-articles/09_ppo.md",
    import.meta.url,
  ),
  "posttraining.dpo.derivation": new URL(
    "./premium-articles/10_dpo.md",
    import.meta.url,
  ),
  "posttraining.grpo.group-advantage": new URL(
    "./premium-articles/11_grpo.md",
    import.meta.url,
  ),
};

const cache = new Map();

export function hasPremiumArticle(topicId) {
  return Boolean(articleUrls[topicId]);
}

export async function loadPremiumArticle(topicId) {
  const url = articleUrls[topicId];
  if (!url) return null;
  if (!cache.has(topicId)) {
    cache.set(topicId, await readFile(url, "utf8"));
  }
  return cache.get(topicId);
}
