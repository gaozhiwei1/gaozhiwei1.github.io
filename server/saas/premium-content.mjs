export const premiumTopicContent = {
  "posttraining.dpo.derivation": {
    title: "DPO：从 KL 正则化到可训练目标",
    summary:
      "完整拆解最优策略、隐式奖励差与 Bradley-Terry 偏好概率之间的代换关系。",
    steps: [
      {
        title: "KL 正则化策略目标",
        formula: "max_pi E[r(x,y)] - beta KL(pi || pi_ref)",
        detail:
          "reference policy 规定偏离基准行为的代价，beta 控制这个代价相对奖励的权重。",
      },
      {
        title: "最优策略反解",
        formula:
          "r(x,y) = beta(log pi*(y|x) - log pi_ref(y|x)) + beta log Z(x)",
        detail:
          "对同一个 prompt 比较 chosen/rejected 时，归一化项 log Z(x) 相消。",
      },
      {
        title: "代入偏好模型",
        formula:
          "P(y_w > y_l|x) = sigma(beta[(log pi_w-log pi_ref,w)-(log pi_l-log pi_ref,l)])",
        detail:
          "这一步把不可见的标量 reward 转换为策略与 reference 的 log-ratio 差。",
      },
      {
        title: "负对数似然",
        formula: "L_DPO = -log sigma(beta Delta)",
        detail:
          "优化目标提高 chosen 相对 rejected 的隐式优势，同时保留 reference policy 作为尺度锚点。",
      },
    ],
  },
  "posttraining.ppo.clipping": {
    title: "PPO：Clipping 的四个符号角落",
    summary:
      "从 advantage 符号解释 min 操作为何分别限制过度增大与过度减小概率。",
    steps: [
      {
        title: "重要性采样比",
        formula: "r_t(theta)=pi_theta(a_t|s_t)/pi_old(a_t|s_t)",
        detail:
          "ratio 衡量当前策略相对采样策略对同一动作的概率变化，它不是 reward。",
      },
      {
        title: "正 Advantage",
        formula: "A_t>0",
        detail: "动作优于基线，希望提高概率；超过 1+epsilon 后收益被截平。",
      },
      {
        title: "负 Advantage",
        formula: "A_t<0",
        detail:
          "动作劣于基线，希望降低概率；低于 1-epsilon 后继续降低不再改善 surrogate。",
      },
      {
        title: "Reference policy",
        formula: "beta KL(pi_theta || pi_ref)",
        detail:
          "reference model 控制与初始行为的长期偏离，和产生 rollout 的 old policy 不是一个概念。",
      },
    ],
  },
  "posttraining.grpo.group-advantage": {
    title: "GRPO：组内相对优势与退化情形",
    summary:
      "解释多个 response 如何构造无需独立 value network 的 prompt-conditional baseline。",
    steps: [
      {
        title: "同 prompt 多采样",
        formula: "y_1,...,y_G ~ pi(.|x)",
        detail:
          "组内回答共享 prompt，奖励差更接近回答质量差，而不是题目难度差。",
      },
      {
        title: "标准化优势",
        formula: "A_i=(r_i-mean(r))/(std(r)+epsilon)",
        detail:
          "均值提供 baseline，标准差控制尺度；epsilon 只解决除零，不创造学习信号。",
      },
      {
        title: "零方差组",
        formula: "r_1=...=r_G => A_i=0",
        detail:
          "所有奖励相同则该组不能提供相对排序信号，增加 group size 也不保证解决 verifier 失真。",
      },
    ],
  },
};
