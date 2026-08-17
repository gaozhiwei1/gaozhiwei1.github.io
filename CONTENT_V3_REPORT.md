# Math2LLM Content V3 Integration Report

## 目标

这一版不再把所有知识页机械套进同一套卡片模板，而是把“连续技术文章”作为默认阅读体验：数学推导更紧凑、公式之间增加解释和承接；只有实验、代码、真正重要的 warning 才保留特殊组件。

## 主要改动

### 1. Gold Article 阅读节奏

- 重写 Gold renderer 的标题层级，减少大号章节标题的频率。
- 数学公式不再拥有夸张的上下留白；连续公式会进一步收紧。
- 正文行高保持舒适，但段落间距改为技术博客/数学讲义密度。
- 删除重复的 “Gold Standard / Math Insight / Why it matters” 装饰模板。
- 普通知识节点也改为自适应 prose layout：有公式才出现数学区、有 coding challenge 才出现实现区、有 Tensor Shape 才出现 shape 区。

### 2. 数学主线重写

重点重新编辑了：

- Log-Derivative Trick
- Policy Gradient
- Return / V / Q / Advantage / GAE
- PPO
- DPO
- GRPO

它们现在按“问题 → 公式来源 → 每一步为何成立 → 数学结论 → 数值例子 → 代码 → 面试追问”的因果链组织，而不是公式提纲。

Cross-Entropy/KL、Importance Sampling、Attention、RoPE、GQA、KV Cache 也统一使用更低密度的标题层级和 V3 数学排版。

### 3. 面试题库整合

- 原有题库：150 题
- 新增之前整理的 LLM 面经题：76 题
- 当前总计：**226 题**

题型分布：

- 基础理解：77
- 数学推导：68
- 工程理解：40
- Debugging：19
- System Design：22

新增题里还加入了面试频率标签：极高频 / 高频 / 中高频，并可在 Practice 页面筛选。

为避免商业版答案泄露，新增 76 题的完整答案、关键公式、易错点与追问保存在服务端，客户端只携带题面。

### 4. Coding Bank

原有 30 题基础上补入此前面经 Coding Bank 中没有覆盖的 3 个高价值题：

- KV Cache Update
- LoRA Linear
- Batch InfoNCE Loss

当前总计：**33 道 Coding Challenge**。Local Runner manifest、服务端隐藏测试与 protected solutions 已同步。

### 5. 安全与可维护性

- 免费题仍保持前 50 题，新增面经不会改变已有免费题索引。
- Premium Interview Answers：176 份，服务端保护。
- Premium Code Solutions：33 份，服务端保护。
- PPO / DPO / GRPO Gold 全文继续保持 server-side entitlement 校验。
- 修复 question-answer migration，使未来重新生成题库时不会用客户端空壳覆盖已有 premium 答案。
- 将 interview bank 原始 JSON 放进 `LLM_Interview_Handbook/`，生成脚本不再依赖 `/mnt/data` 临时路径。

## 验证结果

- TypeScript：PASS
- ESLint：PASS
- Vitest：21 / 21 PASS
- Node SaaS / Judge / Security：22 / 22 PASS
- Local Runner unittest：13 / 13 PASS
- Production Vite build：PASS
- Protected interview answers validation：176 PASS
- Protected coding solutions validation：33 PASS

浏览器视觉截图在当前执行环境中被本地 URL 管理策略拦截，因此没有虚构浏览器 QA 结果；建议本地启动后重点检查 Log-Derivative、Policy Gradient、PPO 三页的实际视觉密度。
