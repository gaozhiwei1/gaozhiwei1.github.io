export const productConfig = {
  name: "Math2LLM",
  plans: {
    free: {
      id: "free",
      name: "FREE",
      tagline: "适合开始系统学习",
      features: [
        "知识地图与核心章节",
        "50 道精选面试题",
        "8 道代码实战",
        "基础复习中心",
        "Local Runner 本地执行",
      ],
    },
    pro: {
      id: "pro",
      name: "PRO",
      tagline: "完整 LLM 算法训练体系",
      features: [
        "完整课程与面试题库",
        "高级数学推导与 Math Insights",
        "全部代码挑战与参考解",
        "PPO / DPO / GRPO Labs",
        "高级复习系统",
        "未来个性化分析与模拟面试功能",
      ],
    },
  },
  freeQuestionLimit: 50,
  freeProblemIds: new Set([
    "stable-softmax",
    "cross-entropy",
    "top-k",
    "top-p-sampling",
    "rmsnorm",
    "causal-mask",
    "gradient-clipping",
    "linear-warmup",
  ]),
  premiumTopicIds: new Set([
    "posttraining.ppo.clipping",
    "posttraining.dpo.derivation",
    "posttraining.dpo.objective",
    "posttraining.grpo.group-advantage",
    "posttraining.grpo.objective",
    "reasoning.training.rlvr",
    "reasoning.training.process-outcome",
    "inference.serving.pagedattention",
    "distributed.zero.stages",
    "distributed.fsdp.lifecycle",
    "moe.system.expert-parallel",
  ]),
} as const;

export const protectedDeepDiveTopicIds = new Set([
  "posttraining.ppo.clipping",
  "posttraining.dpo.derivation",
  "posttraining.grpo.group-advantage",
]);
